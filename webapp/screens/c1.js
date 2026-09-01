/**
 * C1 컨셉 디자인 (무드 후보 → 택1 → 색 실현 → 대화로 다듬기, 2026-08-30 개편)
 *
 * P1 에서 레이아웃(구조)을 고른 뒤, 여기서 무드를 정하고 색을 입힌다.
 *
 *   1) 고르기(choosing): 무드 후보 3개를 "텍스트 + 팔레트" 로만 제시한다. 하나 고르면 실현.
 *   2) 실현(realized): 그 무드로 색·타이포·구조를 CSS 로 실현해 진짜 미리보기를 그린다.
 *      이후 입력창으로 의견을 주면 "현재 무드를 그 방향으로 다듬어" 다시 실현한다. 이때
 *      picker 로 되돌아가지 않는다(피드백). 새 시안은 이전 시안을 지우지 않고 캔버스 아래에
 *      쌓아 위와 비교하게 한다(P1 레이아웃 안이 쌓이는 것과 같은 방식, 피드백).
 *
 * 입력창 메시지가 무드 방향인지 정렬·폰트 같은 요소 세부인지는 낱말이 아니라 모델이 가른다
 * (intent). 세부면 무드를 안 바꾸고 안내만 하단 대화로 띄운다. 사용자·모델 발화는 하단 대화(msgs)에.
 *
 * 미리보기 예시 글은 용도에 맞게 나온다(sample). P2 와 같은 sample 을 여기서 미리 만들어 둔다.
 *
 * 화면 모듈 규약은 app/app.js 위쪽 주석에 있다.
 */

import { buildMoodsPrompt, buildMoodRefinePrompt, overallConceptToText } from '../harness/concept-prompt.js';
import { lintWireFeasibility } from '../harness/wire-feasibility.js';
import { buildDesignPrompt, sanitizeThemeCss } from '../harness/theme-prompt.js';
import { buildSampleContentPrompt } from '../harness/sample-prompt.js';
import { detailsToPreset } from '../harness/spec.js';
import { buildSkinHtml } from '../presets/base/skeleton.js';
import { renderPreview } from '../loop/render.js';
import { PREVIEW_EXTRA_CSS, mockFrom } from '../loop/mock-data.js';
import { createStructured, estimateCost, PROVIDERS } from '../providers.js';

const MAX_TRIES = 3; // 무드가 티스토리 미지원 기능을 전제하면 사유를 실어 다시 잡는다
const DETAIL_DEFAULT =
  '지금은 전체 무드·색만 정합니다. 정렬·폰트·간격 같은 세부는 무드를 확정한 뒤 다음 단계에서 바꿔 주세요.';

export function mount(root, ctx) {
  const { actions, toast, panes, shared, scrollChat } = ctx;
  const getState = actions.getState;

  let candBusy = false; // 무드 후보를 만드는 중
  let noteBusy = false; // 입력창 메시지를 해석/반영하는 중
  let designBusy = false; // 고른 무드로 색을 입히는 중
  let sampleBusy = false; // 용도에 맞는 예시 글을 만드는 중(미리보기 채움)
  let reqSeq = 0; // 후보/실현/메시지 요청 순번(느린 응답이 화면을 덮지 않게). sample 은 별개다
  let directions = []; // 고르기 단계에서 대화로 더한 무드 방향(누적). 후보 프롬프트 문맥
  let msgs = []; // 하단 대화 말풍선 [{role:'user'|'assistant', text}]
  let realizations = []; // 캔버스에 쌓이는 시안들 [{label, srcdoc}] - 위아래로 비교
  let lastCanvasSig = ''; // 캔버스를 매번 다시 그리면 iframe 이 리로드된다. 바뀔 때만 다시 그린다

  /* ----------------------------------------------------- 입력줄 (대화 흐름 안) */

  /*
   * 무드 의견 입력줄은 컨셉 상자 안에 둔다. E1(용도)·P1(레이아웃)처럼 흐름 전체가 왼쪽
   * 하얀 말풍선 안에서 이뤄지는데, 여기만 발판으로 빼면 결이 튄다(2026-08-30 피드백).
   * 상자가 다시 그려질 때마다 리스너를 새로 단다 - 값은 전송 때 비우고, 재생성을 기다리는
   * 동안엔 사용자가 타이핑 중이 아니라 포커스가 날아가도 문제 없다.
   */
  function noteRowHtml() {
    const busy = candBusy || designBusy || noteBusy;
    return (
      `<div class="row" style="gap:8px;margin-top:12px;flex-wrap:nowrap">` +
      `<input type="text" id="note-input" class="chip-input" style="flex:1 1 150px;min-width:0" ` +
      `placeholder="무드를 바꿔 말하거나 의견을 적어 주세요 (예: 좀 더 어둡게)"${busy ? ' disabled' : ''}>` +
      `<button id="note-send" style="align-self:stretch"${busy ? ' disabled' : ''}>${noteBusy ? '…' : '전송'}</button>` +
      `</div>`
    );
  }

  function wireNote() {
    const input = root.querySelector('#note-input');
    const send = root.querySelector('#note-send');
    if (!input || !send) return;
    const go = () => {
      if (candBusy || designBusy || noteBusy) return;
      const v = input.value.trim();
      if (!v) return;
      if (looksLikeKey(v)) {
        toast?.('API 키로 보이는 값이라 보내지 않았습니다. 키는 설정에서 바꿉니다.', 'bad');
        return;
      }
      input.value = '';
      applyNote(v);
    };
    send.addEventListener('click', go);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        go();
      }
    });
  }

  function call(prompt) {
    const st = getState();
    return createStructured(st.provider, st.apiKey, {
      model: st.model,
      system: prompt.system,
      messages: prompt.messages,
      schema: prompt.schema,
      effort: prompt.effort,
      temperature: prompt.temperature, // 탐색 호출만 프롬프트가 지정(자유도)
    });
  }

  /* ------------------------------------------------------------ 1) 무드 후보 3개 */

  async function generateMoods({ more = false } = {}) {
    candBusy = true;
    drawShow(getState());
    const my = ++reqSeq;
    const st = getState();
    const note = directions.join(' / ');
    const avoid = more ? (st.moodCandidates || []).map((m) => `${m.name} - ${m.summary}`) : [];

    let fix = [];
    let moods = null;
    let lastError = null;
    for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
      const res = await call(buildMoodsPrompt({ purpose: st.purpose, note, avoid, fix }));
      if (my !== reqSeq) return;
      if (!res.ok) {
        lastError = res.error;
        break;
      }
      actions.addUsage(res.usage, estimateCost(st.provider, st.model, res.usage));
      const list = (res.data.moods || []).map((m) => {
        const { violations } = lintWireFeasibility(overallConceptToText(m), { name: m.name });
        return { m, violations };
      });
      const allBad = list.length > 0 && list.every((x) => x.violations.length > 0);
      if (allBad && attempt < MAX_TRIES - 1) {
        fix = list.flatMap((x) => x.violations.map((v) => v.message));
        continue;
      }
      moods = list.map((x) => ({ ...x.m, warned: x.violations.length > 0 }));
      break;
    }

    if (my !== reqSeq) return;
    candBusy = false;
    if (!moods) {
      showError(lastError);
      drawShow(getState());
      return;
    }
    if (more) actions.addMoodCandidates(moods);
    else actions.setMoodCandidates(moods);
    drawShow(getState());
  }

  /**
   * 발판에 적은 메시지를 처리한다. 상태에 따라 갈린다.
   * - 고르기 중(무드 미선택): 방향으로 받아 후보 3개를 새로 뽑는다(picker 유지).
   * - 실현 뒤(무드 선택됨): 현재 무드를 그 방향으로 "다듬어" 재실현한다. picker 로 안 돌아간다.
   * 무드냐 세부냐는 모델이 intent 로 가른다. 사용자·모델 발화는 하단 대화(msgs)에 쌓인다.
   */
  async function applyNote(note) {
    noteBusy = true;
    msgs.push({ role: 'user', text: note });
    drawShow(getState());
    scrollChat?.();
    const my = ++reqSeq;
    const st = getState();
    const realized = !!(st.overallConcept && st.themeCss);

    if (realized) {
      const res = await call(buildMoodRefinePrompt({ purpose: st.purpose, current: st.overallConcept, note }));
      if (my !== reqSeq) return;
      noteBusy = false;
      if (!res.ok) {
        showError(res.error);
        drawShow(getState());
        return;
      }
      actions.addUsage(res.usage, estimateCost(st.provider, st.model, res.usage));
      const reply = String(res.data.reply || '').trim();
      if (res.data.intent === 'detail') {
        msgs.push({ role: 'assistant', text: reply || DETAIL_DEFAULT });
        drawShow(getState());
        scrollChat?.();
        return;
      }
      // 무드 다듬기: 현재 무드를 갈아끼우고 재실현한다(아래에 새 시안이 쌓인다).
      msgs.push({ role: 'assistant', text: reply || '그 방향으로 다듬어 아래에 새로 만들었어요. 위와 비교해 보세요.' });
      actions.setOverallConcept(markMoods([res.data.mood])[0]);
      scrollChat?.();
      generateDesign(note);
      return;
    }

    // 고르기 중: 후보 3개를 새로 뽑는다.
    directions.push(note);
    const res = await call(buildMoodsPrompt({ purpose: st.purpose, note: directions.join(' / ') }));
    if (my !== reqSeq) return;
    noteBusy = false;
    if (!res.ok) {
      showError(res.error);
      drawShow(getState());
      return;
    }
    actions.addUsage(res.usage, estimateCost(st.provider, st.model, res.usage));
    const reply = String(res.data.reply || '').trim();
    if (res.data.intent === 'detail') {
      directions.pop(); // 세부 요청은 무드 방향이 아니므로 문맥에 남기지 않는다
      msgs.push({ role: 'assistant', text: reply || DETAIL_DEFAULT });
      drawShow(getState());
      scrollChat?.();
      return;
    }
    msgs.push({ role: 'assistant', text: reply || '그 방향으로 세 가지를 다시 잡았어요. 위에서 골라 주세요.' });
    actions.setMoodCandidates(markMoods(res.data.moods));
    drawShow(getState());
    scrollChat?.();
  }

  /* ------------------------------------------------------------ 2) 색 실현 */

  /** 고른(또는 다듬은) 무드로 색을 입히고, 그 결과를 캔버스 시안 스택에 쌓는다. */
  async function generateDesign(suffix) {
    actions.applySelectedConcept();
    designBusy = true;
    drawShow(getState());
    const my = ++reqSeq;
    const st = getState();
    const key = actions.conceptKey(st.selectedConcept);

    const res = await call(buildDesignPrompt({ purpose: st.purpose, concept: st.selectedConcept }));
    if (my !== reqSeq) return;
    designBusy = false;
    if (!res.ok) {
      showError(res.error);
      drawShow(getState());
      return;
    }
    actions.addUsage(res.usage, estimateCost(st.provider, st.model, res.usage));
    const css = sanitizeThemeCss(res.data.css);
    const sidebar = ['left', 'right', 'none'].includes(res.data.sidebar) ? res.data.sidebar : getState().details.sidebar;
    actions.setDetails({ ...getState().details, sidebar, bodyFont: res.data.bodyFont, headingFont: res.data.headingFont });
    actions.setTheme({ css, forKey: key });
    pushRealization(suffix);
    drawShow(getState());
  }

  /** 지금 상태의 미리보기를 srcdoc 으로 굳혀 시안 스택에 더한다(나중에 다시 안 그려도 되게). */
  function pushRealization(suffix) {
    const s = getState();
    const name = s.overallConcept?.name || '시안';
    const preset = detailsToPreset(s.details, { uploadedFont: s.uploadedFont, themeCss: s.themeCss });
    const skin = buildSkinHtml(preset);
    const srcdoc = renderPreview(skin, {
      pageType: 'tt-body-index',
      css: shared.css,
      js: shared.js,
      extraCss: PREVIEW_EXTRA_CSS,
      mock: s.sample ? mockFrom(s.sample) : undefined,
    });
    realizations.push({ label: suffix ? `${name} · ${suffix}` : name, srcdoc });
    lastCanvasSig = ''; // 스택이 늘었으니 캔버스를 다시 그린다
  }

  /* ------------------------------------------------------------ 용도에 맞는 예시 글 */

  async function ensureSample() {
    const st = getState();
    if (sampleBusy || !st.keyChecked || !st.purpose) return;
    if (st.sample && st.sample.purpose === st.purpose) return;
    sampleBusy = true;
    const prompt = buildSampleContentPrompt(st.purpose);
    const res = await createStructured(st.provider, st.apiKey, {
      model: st.model,
      system: prompt.system,
      messages: prompt.messages,
      schema: prompt.schema,
      effort: prompt.effort,
    });
    sampleBusy = false;
    if (res.ok && res.data) {
      actions.addUsage(res.usage, estimateCost(st.provider, st.model, res.usage));
      actions.setSample({ purpose: st.purpose, ...res.data });
    }
  }

  /* ------------------------------------------------------------ 보여주기 */

  /** 하단 대화 말풍선. 왼쪽=모델, 오른쪽=나(.msg.user). */
  function msgsHtml() {
    return msgs
      .map((m) =>
        m.role === 'user'
          ? `<div class="msg user"><div class="msg-body">${esc(m.text)}</div></div>`
          : `<div class="msg"><div class="msg-body">${esc(m.text)}</div></div>`,
      )
      .join('');
  }

  function drawShow(state) {
    const chosen = state.overallConcept;
    if (chosen && (state.themeCss || designBusy)) drawRealized(state);
    else drawChoosing(state);
    drawCanvas(state);
  }

  /* -- 고르기: 후보 목록 -- */

  function drawChoosing(state) {
    const cands = state.moodCandidates || [];
    const cards = cands.map(moodCardHtml).join('');
    const loadingCard = candBusy
      ? '<div class="card" style="padding:12px"><span class="busy">무드 후보를 만드는 중…</span></div>'
      : '';
    root.innerHTML =
      `<div class="msg">
        <div class="msg-body">
          마음에 드는 무드를 골라 주세요. 고르면 색을 입힌 실제 화면을 만들어 드려요.
          <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">${cards}${loadingCard}</div>
          ${noteRowHtml()}
          <button class="block" id="more" style="margin-top:8px"${candBusy ? ' disabled' : ''}>다른 무드 더 보기</button>
          <button class="block" id="relayout" style="margin-top:8px">레이아웃 다시 고르기</button>
        </div>
      </div>` + msgsHtml();

    for (const card of root.querySelectorAll('[data-mood]')) {
      card.addEventListener('click', () => {
        if (candBusy || designBusy) return;
        actions.chooseMood(Number(card.dataset.mood));
        generateDesign();
      });
    }
    root.querySelector('#more').addEventListener('click', () => {
      if (candBusy) return;
      generateMoods({ more: true });
    });
    root.querySelector('#relayout').addEventListener('click', () => actions.go('P1'));
    wireNote();
  }

  /* -- 실현: 고른 무드 + 팔레트 편집 -- */

  function drawRealized(state) {
    const c = state.overallConcept;
    const ready = !!state.themeCss && !designBusy;
    root.innerHTML =
      `<div class="msg">
        <div class="msg-body">
          무드를 <strong>${esc(c.name)}</strong> 로 잡았어요 — ${esc(c.summary || '')}
          ${swatchesEdit(c.palette)}
          <p class="small dim" style="margin:8px 0 0">여기선 무드·색만 정합니다. 폰트·정렬·목록 배치 같은 세부는 다음 단계에서 말로 바꿀 수 있어요.<br>무드를 더 다듬고 싶으면 입력창에 말해 주세요.</p>
          ${noteRowHtml()}
          <button class="block" id="confirm" style="margin-top:14px"${ready ? '' : ' disabled'}>이 디자인으로</button>
          <button class="block" id="rechoose" style="margin-top:8px">다른 무드 고르기</button>
          <button class="block" id="relayout" style="margin-top:8px">레이아웃 다시 고르기</button>
        </div>
      </div>` + msgsHtml();

    // 색 스와치를 손보면 그 팔레트로 디자인을 다시 만든다(새 시안으로 쌓인다).
    for (const inp of root.querySelectorAll('input[data-idx]')) {
      inp.addEventListener('change', () => {
        if (designBusy || candBusy) return;
        const cur = getState().overallConcept?.palette || [];
        const next = cur.map((item, i) => (i === Number(inp.dataset.idx) ? { ...item, hex: inp.value } : item));
        actions.setPalette(next);
        generateDesign('색 조정');
      });
    }
    root.querySelector('#confirm').addEventListener('click', () => {
      if (!getState().themeCss) return;
      actions.go('W1'); // 디자인은 이미 만들어졌다. W1 에서 미리보며 대화로 다듬는다.
    });
    root.querySelector('#rechoose').addEventListener('click', () => {
      if (designBusy) return;
      actions.clearChosenMood();
      drawShow(getState());
    });
    root.querySelector('#relayout').addEventListener('click', () => actions.go('P1'));
    wireNote();
  }

  /* ------------------------------------------------------------ 캔버스(시안 스택) */

  function drawCanvas(state) {
    const c = state.overallConcept;
    panes.canvasHead.innerHTML =
      '<span class="badge accent">컨셉 디자인</span>' +
      (c ? `<span class="badge plain accent">${esc(c.name || '')}</span>` : '');
    panes.canvasBody.className = 'canvas-body';

    // 시안이 있고 무드가 살아 있을 때만 스택을 보여준다(고르기로 돌아가면 안내로).
    const showStack = !!((c || designBusy) && realizations.length);
    const sig = showStack
      ? `stack${realizations.length}${designBusy ? 'b' : ''}`
      : designBusy || c
        ? 'realizing'
        : candBusy
          ? 'candbusy'
          : 'choose';
    if (sig === lastCanvasSig) return;
    lastCanvasSig = sig;

    if (showStack) {
      const cards = realizations
        .map(
          (r, i) =>
            `<div class="card" style="padding:0;overflow:hidden">
              <div style="padding:8px 12px;border-bottom:1px solid var(--border)"><span class="eyebrow">${i + 1}안</span> <span class="strong">${esc(r.label)}</span></div>
              <iframe data-real="${i}" title="시안 ${i + 1}" style="width:100%;height:78vh;border:0;background:#fff;display:block"></iframe>
            </div>`,
        )
        .join('');
      const busyCard = designBusy
        ? `<div class="card" style="padding:0;overflow:hidden"><div class="skeleton" style="height:78vh"></div>
             <div style="padding:8px 12px;border-top:1px solid var(--border)"><span class="busy">새 시안을 만드는 중…</span></div></div>`
        : '';
      panes.canvasBody.innerHTML = `<div style="display:flex;flex-direction:column;gap:14px">${cards}${busyCard}</div>`;
      for (const frame of panes.canvasBody.querySelectorAll('iframe[data-real]')) {
        frame.srcdoc = realizations[Number(frame.dataset.real)].srcdoc;
      }
      // 방금 만든 시안이 보이게 아래로 내린다.
      panes.canvasBody.scrollTop = panes.canvasBody.scrollHeight;
      return;
    }

    const msg =
      designBusy || c
        ? '디자인을 입히는 중…'
        : candBusy
          ? '무드 후보를 만드는 중…'
          : '왼쪽에서 무드를 고르면 색을 입힌 실제 화면이 여기에 나옵니다.';
    const cls = designBusy || candBusy || c ? 'busy' : 'small dim';
    panes.canvasBody.innerHTML = `<div class="preview-loading"><span class="${cls}">${msg}</span></div>`;
  }

  /* ------------------------------------------------------------ 오류 */

  function showError(error) {
    if (!error) return;
    if (error.kind === 'invalid_key' || error.kind === 'format') {
      toast?.('키에 문제가 있습니다. 등록 화면으로 갑니다', 'bad');
      actions.go('E1');
      return;
    }
    toast?.(error.message || '요청이 실패했습니다', 'bad');
  }

  /* ------------------------------------------------------------ 진입 */

  const at = getState();
  if (!at.keyChecked || !at.purpose) {
    actions.go('E1');
  } else if (at.genIndex < 0) {
    actions.go('P1'); // 레이아웃을 먼저 골라야 한다
  } else if (at.overallConcept && at.themeCss) {
    ensureSample();
    // 이미 만든 디자인이 있으면 첫 시안으로 스택에 올려 두고 보여준다.
    pushRealization();
    drawShow(at);
  } else {
    ensureSample();
    if (at.overallConcept && !at.themeCss) queueMicrotask(() => generateDesign());
    else if (!(at.moodCandidates && at.moodCandidates.length)) queueMicrotask(() => generateMoods({}));
    drawShow(at);
  }

  return {
    update() {},
  };
}

/* ------------------------------------------------------------ 조각 */

/** 받은 무드들에 실현가능성 위반 여부(warned)를 달아 준다. */
function markMoods(rawMoods) {
  return (Array.isArray(rawMoods) ? rawMoods : []).map((m) => {
    const { violations } = lintWireFeasibility(overallConceptToText(m), { name: m.name });
    return { ...m, warned: violations.length > 0 };
  });
}

/** 고르기 단계의 무드 후보 카드(클릭하면 선택). 이름·한 줄 + 읽기전용 색칩. */
function moodCardHtml(m, i) {
  return (
    `<button type="button" class="card pick" data-mood="${i}" ` +
    `style="display:block;width:100%;text-align:left;padding:12px;cursor:pointer">` +
    `<span class="strong">${esc(m.name || '')}</span>${m.warned ? ' <span class="badge bad">확인 필요</span>' : ''}` +
    `<p class="small dim" style="margin:4px 0 8px">${esc(m.summary || '')}</p>` +
    chipsRO(m.palette) +
    `</button>`
  );
}

/** 읽기전용 색칩 줄(후보 카드용). 팔레트 길이만큼. */
function chipsRO(palette) {
  if (!Array.isArray(palette) || !palette.length) return '';
  const chips = palette
    .map(
      (c) =>
        `<span title="${esc(c.label || '')} ${esc(c.hex || '')}" ` +
        `style="display:inline-block;width:20px;height:20px;border-radius:5px;border:1px solid var(--border);background:${safeColor(c.hex)}"></span>`,
    )
    .join('');
  return `<div class="row" style="gap:6px;flex-wrap:wrap">${chips}</div>`;
}

/** 실현 단계의 편집 가능한 색 스와치들(팔레트 길이만큼). */
function swatchesEdit(palette) {
  if (!Array.isArray(palette) || !palette.length) return '';
  const items = palette
    .map(
      (c, idx) =>
        `<label class="tiny dim" style="display:flex;flex-direction:column;gap:3px;align-items:center">${esc(c.label || c.role || '색')}` +
        `<input type="color" data-idx="${idx}" value="${hex6(c.hex)}" ` +
        `style="width:36px;height:26px;border:1px solid var(--border);border-radius:6px;padding:0;background:none;cursor:pointer"></label>`,
    )
    .join('');
  return `<div class="row" style="gap:12px;margin-top:10px;flex-wrap:wrap">${items}</div>`;
}

/** input[type=color] 는 #rrggbb 만 받는다. 아니면 검정으로 떨어뜨린다. */
function hex6(v) {
  const s = String(v || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s : '#000000';
}

/** 인라인 background 에 넣기 전에 색값을 소독한다(모델이 준 값이라). 아니면 투명. */
function safeColor(v) {
  const s = String(v || '').trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(s) ? s : 'transparent';
}

function looksLikeKey(text) {
  const t = String(text || '').trim();
  return Object.values(PROVIDERS).some((p) => t.startsWith(p.keyPrefix));
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
