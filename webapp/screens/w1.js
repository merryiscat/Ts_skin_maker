/**
 * W1 작업 화면
 *
 * 지시하고, 결과를 확인하고, 더 고칠지 받아갈지 정한다. 모델을 부르는 두 곳 중 하나다.
 *
 * 이 화면이 지키는 것 세 가지.
 *   - 실패해도 직전 결과를 지우지 않는다. 되돌아갈 자리가 없으면 마음 놓고 시킬 수 없다
 *   - 검증에 걸려도 자동으로 다시 시키지 않는다. 재시도 한 번이 사용자 지갑에서 나간다
 *   - 무엇이 바뀌었는지 응답에 목록으로 붙인다. 미리보기만 보고 짐작하게 두지 않는다
 *
 * 세부 값을 고치는 경로는 여기서 대화 하나뿐이다. P2 처럼 항목 패널을 같이 두면
 * 경로가 둘이 되어 어느 쪽이 최신인지 알 수 없게 된다.
 *
 * 자리 배치
 *   왼쪽 대화   지시와 응답. 앞 단계와 같은 자리다
 *   캔버스      미리보기 또는 코드
 *
 * 좁은 폭에서 둘 중 하나만 보여주는 일은 셸(app.js)이 한다. 이 화면은 그 사정을
 * 몰라도 되고, 대화를 접고 미리보기를 넓게 볼 때만 ctx.setWide 를 부른다.
 */

import { detailsToPreset, validateDetails } from '../harness/spec.js';
import { buildStyleEditPrompt } from '../harness/edit-prompt.js';
import { sanitizeThemeCss } from '../harness/theme-prompt.js';
import { auditPlaceholders, auditGroupTags } from '../harness/contract.js';
import { checkPitfalls } from '../harness/pitfalls.js';
import { buildSkinHtml, buildIndexXml } from '../presets/base/skeleton.js';
import { renderPreview, PREVIEW_PAGES } from '../loop/render.js';
import { PREVIEW_EXTRA_CSS, mockFrom } from '../loop/mock-data.js';
import { createStructured, estimateCost, PROVIDERS } from '../providers.js';

/** 코드 열람 탭. 키는 파일 묶음의 이름이고 라벨만 짧게 줄인다. */
const CODE_TABS = [
  { key: 'skin.html', label: 'skin.html' },
  { key: 'style.css', label: 'style.css' },
  { key: 'images/script.js', label: 'script.js' },
  { key: 'index.xml', label: 'index.xml' },
];

export function mount(root, ctx) {
  const { actions, shared, toast, panes, setWide, scrollChat } = ctx;

  // 화면 안에서만 쓰는 표시 상태. 상태 저장소에 넣지 않는다. 새로고침하면 사라져도 되는 것들이다
  let pageType = 'tt-body-index';
  let mobileFrame = false;
  let zoomed = false;
  let codeOpen = false;
  let codeTab = 'skin.html';

  // 검증에 걸린 뒤 "그냥 두기" 를 고른 것. 기록은 남기되 버튼만 접는다.
  // 순번이 아니라 항목 자체를 기억한다. 되돌리기가 대화를 자르면 순번은 다른 것을 가리킨다
  const dismissed = new WeakSet();

  // 중단을 누르면 이 번호가 올라간다. 늦게 도착한 응답은 자기 번호로 자기가 버려진 것을 안다
  let reqSeq = 0;

  let files = null;
  let audit = { ok: true, problems: [] };

  /* ------------------------------------------------------- 대화 아래 발판 */

  panes.foot.innerHTML = `
    <div class="composer">
      <textarea id="input" rows="2" placeholder="바꿀 내용을 적으세요. 엔터로 보냅니다"></textarea>
      <div class="row">
        <button class="primary sm" id="send">보내기</button>
        <span class="busy" id="busy" hidden>고치는 중</span>
        <button class="sm" id="stop" hidden>중단</button>
        <button class="sm ghost" id="reset">처음으로</button>
        <span class="spacer"></span>
        <span class="tiny dim" id="usage"></span>
      </div>
    </div>`;

  /* ------------------------------------------------------------ 오른쪽 */

  panes.canvasHead.innerHTML = `
    <span class="badge" id="verdict"></span>
    <select id="page"></select>
    <button class="sm" id="mobile">모바일</button>
    <button class="sm" id="zoom">확대</button>
    <button class="sm" id="code">코드</button>
    <span class="spacer"></span>
    <span class="mono tiny" id="model-name"></span>
    <button class="primary sm" id="download">내려받기</button>`;

  panes.canvasBody.className = 'canvas-body';
  panes.canvasBody.innerHTML = `
    <iframe class="preview" id="preview" title="미리보기"></iframe>
    <div id="code-box" hidden>
      <div class="tabs" id="code-tabs"></div>
      <pre class="code" id="code-text" style="margin:10px 0 0;max-height:calc(100vh - 220px)"></pre>
      <p class="tiny dim" style="margin:8px 0 0">읽기 전용입니다. 고칠 내용은 왼쪽 대화로 지시하세요.</p>
    </div>`;

  const $ = (id) =>
    root.querySelector('#' + id) ||
    panes.foot.querySelector('#' + id) ||
    panes.canvasHead.querySelector('#' + id) ||
    panes.canvasBody.querySelector('#' + id);

  /* ---------------------------------------------------------- 미리보기 */

  const sel = $('page');
  for (const p of PREVIEW_PAGES) {
    const o = document.createElement('option');
    o.value = p.id;
    o.textContent = p.label;
    sel.append(o);
  }
  sel.value = pageType;
  sel.addEventListener('change', () => {
    pageType = sel.value;
    drawView(actions.getState());
  });

  $('mobile').addEventListener('click', () => {
    mobileFrame = !mobileFrame;
    $('mobile').classList.toggle('on', mobileFrame);
    drawView(actions.getState());
  });

  // 확대는 이 레이아웃의 약점을 메우는 장치다. 미리보기가 절반뿐이라 판단이 어려운
  // 순간에만 대화를 접고 전폭으로 본다
  $('zoom').addEventListener('click', () => {
    zoomed = !zoomed;
    setWide?.(zoomed);
    $('zoom').textContent = zoomed ? '대화 열기' : '확대';
    $('zoom').classList.toggle('on', zoomed);
    drawView(actions.getState());
  });

  $('code').addEventListener('click', () => {
    codeOpen = !codeOpen;
    drawView(actions.getState());
  });

  $('code-tabs').addEventListener('click', (e) => {
    const key = e.target.dataset?.tab;
    if (!key) return;
    codeTab = key;
    drawView(actions.getState());
  });

  /* ---------------------------------------------------------- 보내기 */

  $('send').addEventListener('click', () => send($('input').value));
  $('input').addEventListener('keydown', (e) => {
    // 줄바꿈이 필요한 지시는 드물다. 엔터를 보내기로 쓰고 줄바꿈은 시프트에 둔다
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      send($('input').value);
    }
  });

  $('stop').addEventListener('click', () => {
    reqSeq++;
    actions.setBusy(false);
    actions.pushChat({
      role: 'note',
      kind: 'stopped',
      text: '중단했습니다. 이미 보낸 요청의 비용은 발생합니다.',
    });
  });

  // 작업 기록을 통째로 버리는 유일한 버튼이고 되돌릴 방법이 없다. 한 번 더 묻는다
  let resetArmed = false;
  const disarmReset = () => {
    resetArmed = false;
    $('reset').textContent = '처음으로';
  };
  $('reset').addEventListener('click', () => {
    if (!actions.getState().chat.length) return;
    if (!resetArmed) {
      resetArmed = true;
      $('reset').textContent = '정말 지울까요';
      setTimeout(disarmReset, 4000);
      return;
    }
    disarmReset();
    actions.clearChat();
  });

  $('download').addEventListener('click', () => {
    const state = actions.getState();
    if (!audit.ok) toast?.('검증에 걸린 채로 넘어갑니다. 그대로 올리면 깨질 수 있습니다.', 'bad');
    handOffFiles(state);
    actions.go('D1');
  });

  /**
   * 만든 파일 묶음을 D1 에게 넘긴다.
   *
   * D1 이 스스로 만들게 두지 않는다. 그러면 같은 조립 과정이 두 곳에 생겨
   * 어느 쪽이 진짜인지 헷갈린다. 만든 곳이 넘긴다.
   */
  function handOffFiles(state) {
    actions.setFiles(makeFiles(state.details, state));
  }

  /**
   * 지시 한 번을 처리한다.
   *
   * 검증을 통과한 것만 세부 값에 반영한다. 하나라도 걸리면 직전 결과를 그대로 두고
   * 무엇이 왜 막혔는지만 대화에 남긴다.
   */
  async function send(raw) {
    const message = String(raw || '').trim();
    const state = actions.getState();
    if (!message || state.busy) return;

    /*
     * 비밀값을 지시로 보내는 것을 막는다.
     *
     * E1 에서 키를 아래 입력줄에 붙여넣어 등록하기 때문에, 여기서도 같은 자리에
     * 키를 붙여넣는 손버릇이 생길 수 있다. 그런데 이 입력줄의 내용은 **모델에게
     * 그대로 전송된다.** 서버가 없어서 안전하다고 말해 온 도구가 사용자 손으로
     * 키를 밖에 내보내게 만드는 셈이라, 보내기 전에 막는다.
     *
     * 접두사만 보고 판단한다. 지시문에 우연히 sk-ant- 로 시작하는 낱말이 들어갈
     * 일은 없고, 놓치는 것보다 한 번 더 묻는 쪽이 낫다.
     */
    if (looksLikeKey(message)) {
      actions.pushChat({
        role: 'note',
        kind: 'stopped',
        text:
          'API 키로 보이는 값이라 보내지 않았습니다. 이 입력줄의 내용은 모델에게 그대로 전송됩니다. ' +
          '키를 바꾸려면 위 설정에서 키 관리로 가세요.',
      });
      $('input').value = '';
      return;
    }

    $('input').value = '';
    // 최근 대화는 이번 지시를 넣기 전에 뽑는다. 넣고 뽑으면 방금 것이 두 번 들어간다
    const recentTurns = conversationTurns(state.chat);
    actions.pushChat({ role: 'user', text: message });
    await run(message, recentTurns);
  }

  /** 같은 지시를 다시 보낸다. 검증에 걸렸을 때 사용자가 직접 고른 경우에만 부른다. */
  async function retry(message) {
    const state = actions.getState();
    if (state.busy) return;
    actions.pushChat({ role: 'user', text: message });
    await run(message, conversationTurns(state.chat));
  }

  async function run(message, recentTurns) {
    const state = actions.getState();
    const before = state.details;
    const my = ++reqSeq;

    actions.setBusy(true);

    // 최근 대화를 몇 개까지 보낼지는 buildStyleEditPrompt 가 정한다. 여기서 자르면
    // 기준이 두 곳에 생겨 반드시 어긋난다
    const prompt = buildStyleEditPrompt({
      currentDetails: before,
      currentThemeCss: state.themeCss,
      recentTurns,
      userMessage: message,
    });

    const res = await createStructured(state.provider, state.apiKey, {
      model: state.model,
      system: prompt.system,
      // 프리픽스/태스크 분리본. 없으면 undefined 그대로 넘어가고 제공자 쪽에서 system 만 쓴다
      systemParts: prompt.systemParts,
      messages: prompt.messages,
      schema: prompt.schema,
      effort: prompt.effort,
    });

    // 비용은 중단해도 이미 나갔다. 버릴 응답이어도 사용량은 반드시 더한다
    if (res.ok) {
      actions.addUsage(res.usage, estimateCost(state.provider, state.model, res.usage));
    }
    if (my !== reqSeq) return;

    actions.setBusy(false);

    if (!res.ok) {
      actions.pushChat({
        role: 'note',
        kind: 'failed',
        title: '모델을 부르지 못했습니다',
        text: res.error.message,
        problems: [],
        ask: message,
      });
      return;
    }

    const data = res.data || {};
    const changes = Array.isArray(data.changes) ? data.changes.filter(Boolean) : [];
    const reply = String(data.reply || '').trim();

    // 모델이 못 하겠다고 한 경우. 검증 실패와 원인이 다르므로 모양도 다르게 남긴다
    if (!changes.length) {
      actions.pushChat({
        role: 'assistant',
        refused: true,
        text: reply || '바꿀 수 있는 항목이 없습니다.',
      });
      return;
    }

    const problems = verify(data.details);
    if (problems.length) {
      actions.pushChat({
        role: 'note',
        kind: 'failed',
        title: '적용하지 않았습니다',
        text: reply,
        problems,
        ask: message,
      });
      return;
    }

    // 테마 CSS 도 함께 반영한다. 소독 후 적용하고, 고른 안 키(themeFor)는 그대로 둬서
    // 이 편집이 P2 로 돌아가도 다시 생성되지 않게 한다.
    const nextTheme = sanitizeThemeCss(data.themeCss);

    // 되돌리기가 동작하려면 그 시점의 세부 값과 테마가 대화에 같이 들어 있어야 한다
    actions.setDetails(data.details);
    actions.setTheme({ css: nextTheme, forKey: state.themeFor });
    actions.pushChat({
      role: 'assistant',
      text: reply,
      changes,
      details: data.details,
      themeCss: nextTheme,
    });
  }

  /**
   * 모델이 낸 세부 값을 실제 산출물까지 만들어 보고 확인한다.
   *
   * 값 범위만 보고 넘기면 골격이 만들어 낸 마크업이 계약을 어긴 경우를 놓친다.
   * 검사 순서는 값 -> 치환자 -> 그룹 태그 -> 함정이다. 앞이 깨지면 뒤는 볼 필요가 없다.
   */
  function verify(details, prebuilt) {
    const bad = validateDetails(details);
    if (bad.length) return bad;

    const made = prebuilt || makeFiles(details, actions.getState());
    const ph = auditPlaceholders(made['skin.html']);
    const gt = auditGroupTags(made['skin.html']);

    const out = [
      ...ph.unknown.map((n) => `없는 치환자를 썼습니다: [##_${n}_##]`),
      ...ph.blacklisted.map((b) => `[##_${b.name}_##] 는 존재하지 않습니다. ${b.why}`),
      ...ph.scopeErrors.map((e) => e.message),
      ...gt.unknown.map((t) => `없는 그룹 태그를 썼습니다: <${t}>`),
      ...gt.unbalanced.map((u) => `<${u.tag}> 의 여는 태그와 닫는 태그 수가 다릅니다`),
      ...gt.parentErrors.map((e) => e.message),
    ];
    if (out.length) return out;

    return checkPitfalls(made)
      .filter((p) => p.severity !== 'info')
      .map((p) => `${p.title}: ${p.message}`);
  }

  /* ---------------------------------------------------------- 그리기 */

  /** 산출물 네 개. 미리보기, 코드 열람, 검증이 전부 같은 묶음을 본다. */
  function makeFiles(details, state) {
    const name = state.selectedConcept?.name || state.concepts[state.conceptIndex]?.name || '내 스킨';
    const preset = detailsToPreset(details, { name, uploadedFont: state.uploadedFont, themeCss: state.themeCss });
    return {
      'skin.html': buildSkinHtml(preset),
      'style.css': shared.css,
      'images/script.js': shared.js,
      'index.xml': buildIndexXml(preset, { name }),
    };
  }

  function drawView(state) {
    files = makeFiles(state.details, state);

    const problems = verify(state.details, files);
    audit = { ok: problems.length === 0, problems };

    const v = $('verdict');
    v.textContent = audit.ok ? '검증 통과' : '검증 실패';
    v.className = 'badge ' + (audit.ok ? 'ok' : 'bad');

    $('page').hidden = codeOpen;
    $('mobile').hidden = codeOpen;
    $('code').textContent = codeOpen ? '미리보기' : '코드';
    $('code').classList.toggle('on', codeOpen);

    const frame = $('preview');
    frame.hidden = codeOpen;
    $('code-box').hidden = !codeOpen;

    if (codeOpen) {
      $('code-tabs').innerHTML = CODE_TABS.map(
        (t) => `<button class="tab mono${t.key === codeTab ? ' on' : ''}" data-tab="${t.key}">${t.label}</button>`,
      ).join('');
      $('code-text').textContent = files[codeTab] || '';
      return;
    }

    frame.srcdoc = renderPreview(files['skin.html'], {
      pageType,
      css: shared.css,
      js: shared.js,
      extraCss: PREVIEW_EXTRA_CSS,
      mock: mockFrom(actions.getState().sample),
    });
    frame.classList.toggle('mobile', mobileFrame);
    frame.style.height = 'calc(100vh - 150px)';
  }

  /** 대화를 통째로 다시 그린다. 입력칸은 발판에 있어서 포커스가 날아가지 않는다. */
  function drawChat(state) {
    const name = state.concepts[state.conceptIndex]?.name || '지금 값';
    const intro =
      `<div class="msg sys"><div class="msg-body">${esc(name)} 으로 시작합니다. ` +
      `바꾸고 싶은 것을 말해 주세요.</div></div>`;

    root.innerHTML = intro + state.chat.map(entryHtml).join('');
    // 새 응답은 아래에 쌓인다. 사용자가 매번 굴려 내리게 두지 않는다
    scrollChat?.();
  }

  function entryHtml(e, i) {
    // 이름표(나/응답)는 두지 않는다 - 말풍선 좌우로 화자를 안다. 앞 단계의
    // 대화와 같은 결로 이어지게 (2026-08-23: 전체 흐름을 하나의 연속 대화로)
    if (e.role === 'user') {
      return `<div class="msg user"><div class="msg-body">${esc(e.text)}</div></div>`;
    }

    if (e.role === 'assistant' && e.refused) {
      // 모델이 거절한 것. 값은 멀쩡했고 요청이 범위 밖이었다는 뜻이라 실패와 갈라 놓는다
      return (
        `<div class="msg"><div class="msg-body">` +
        `<span class="badge">바꾸지 않음</span> ${esc(e.text)}</div></div>`
      );
    }

    if (e.role === 'assistant') {
      const list = (e.changes || []).map((c) => `<li>${esc(c)}</li>`).join('');
      return (
        `<div class="msg"><div class="msg-body">` +
        `${esc(e.text)}` +
        (list ? `<ul class="list marked">${list}</ul>` : '') +
        `<div class="msg-actions"><button class="sm" data-rewind="${i}">이 지점으로 되돌리기</button></div>` +
        `</div></div>`
      );
    }

    if (e.kind === 'failed') {
      const done = dismissed.has(e);
      const list = (e.problems || []).map((p) => `<li>${esc(p)}</li>`).join('');
      return (
        `<div class="msg sys"><div class="msg-body" style="border-style:solid;border-color:var(--danger);background:var(--danger-bg)">` +
        `<h3 style="font-size:var(--t-body);color:var(--danger);margin-bottom:4px">${esc(e.title || '적용하지 않았습니다')}</h3>` +
        (e.text ? `<p style="margin:0 0 4px">${esc(e.text)}</p>` : '') +
        (list ? `<ul class="list marked small">${list}</ul>` : '') +
        `<p class="tiny dim" style="margin:6px 0 0">직전 결과가 그대로 유지됩니다.</p>` +
        (done
          ? `<p class="tiny dim" style="margin:2px 0 0">그냥 두기를 골랐습니다.</p>`
          : `<div class="msg-actions">` +
            `<button class="sm" data-retry="${i}">다시 시키기</button>` +
            `<button class="sm ghost" data-keep="${i}">그냥 두기</button>` +
            `</div>`) +
        `</div></div>`
      );
    }

    return `<div class="msg sys"><div class="msg-body">${esc(e.text)}</div></div>`;
  }

  /*
   * 대화는 통째로 다시 그려지므로 버튼마다 리스너를 달면 매번 새로 달아야 한다.
   * 그래서 대화 자리(root) 하나에만 달고 눌린 것을 dataset 으로 가려낸다.
   *
   * 다만 root 는 셸이 들고 있는 요소라 화면을 나갔다 들어와도 같은 객체다.
   * 함수를 변수에 담아 두고 unmount 에서 떼지 않으면, W1 - D1 - W1 로 오간
   * 뒤에는 리스너가 둘이 되어 되돌리기가 두 번 실행된다.
   */
  const onChatClick = (e) => {
    const t = e.target;
    if (t.dataset?.rewind !== undefined) {
      actions.rewindTo(Number(t.dataset.rewind));
      return;
    }
    if (t.dataset?.keep !== undefined) {
      const entry = actions.getState().chat[Number(t.dataset.keep)];
      if (!entry) return;
      dismissed.add(entry);
      drawChat(actions.getState());
      return;
    }
    if (t.dataset?.retry !== undefined) {
      const entry = actions.getState().chat[Number(t.dataset.retry)];
      if (entry?.ask) retry(entry.ask);
    }
  };
  root.addEventListener('click', onChatClick);

  function drawUsage(state) {
    const u = state.usage;
    if (!u.calls) {
      $('usage').textContent = '아직 부르지 않았습니다';
      return;
    }
    const cost = u.cost > 0 ? ` · 약 $${u.cost.toFixed(4)}` : ' · 단가를 모르는 모델';
    $('usage').textContent = `${u.calls}회 · 입력 ${u.input.toLocaleString()} · 출력 ${u.output.toLocaleString()}${cost}`;
  }

  /* ---------------------------------------------------------- 갱신 */

  let lastDetails = null;
  let lastChat = null;
  let lastError = null;

  return {
    unmount() {
      // 확대한 채로 나가면 다음 화면에 대화가 없다. 셸을 원래대로 돌려놓는다
      setWide?.(false);
      // root 는 셸의 것이라 화면이 바뀌어도 살아 있다. 뗀 만큼만 사라진다
      root.removeEventListener('click', onChatClick);
    },

    update(state) {
      // 앞 단계를 건너뛰고 들어온 경우. 돌려보낸다
      if (!state.keyChecked) {
        actions.go('E1');
        return;
      }
      if (!state.conceptDetails) {
        actions.go('E1');
        return;
      }

      $('model-name').textContent = state.model || '';

      $('busy').hidden = !state.busy;
      $('stop').hidden = !state.busy;
      $('input').disabled = state.busy;
      $('send').disabled = state.busy;
      $('reset').disabled = state.busy || !state.chat.length;
      // 생성 중에도 직전 결과는 받아갈 수 있다. 다만 눈에 덜 띄게 둔다
      $('download').classList.toggle('primary', !state.busy);

      drawUsage(state);

      if (state.chat !== lastChat) {
        lastChat = state.chat;
        drawChat(state);
      }

      // 미리보기는 값이 바뀔 때만 다시 그린다. 생성 중에 비우면 무엇을 만들던
      // 중이었는지 잃는다
      if (state.details !== lastDetails) {
        lastDetails = state.details;
        drawView(state);
      }

      if (state.error && state.error !== lastError) {
        lastError = state.error;
        toast?.(String(state.error), 'bad');
      }
    },
  };
}

/**
 * 모델에게 보낼 대화 턴을 고른다.
 *
 * 안내와 실패 기록은 지시가 아니라서 뺀다. 응답을 못 받은 지시도 뺀다. 그것이 남으면
 * 사용자 발화가 연달아 붙어 어느 것이 이번 지시인지 흐려진다.
 */
function conversationTurns(chat) {
  const out = [];
  for (const e of chat) {
    if (e.role !== 'user' && e.role !== 'assistant') continue;
    if (e.role === 'user' && out[out.length - 1]?.role === 'user') out.pop();
    out.push({ role: e.role, content: e.text });
  }
  if (out[out.length - 1]?.role === 'user') out.pop();
  return out;
}

/**
 * 이 글이 API 키로 보이는가.
 *
 * 제공자 정의의 접두사를 그대로 쓴다. 여기에 문자열을 따로 적어 두면 제공자가
 * 늘어날 때 한쪽만 고쳐져서, 새 제공자의 키는 그대로 통과한다.
 */
function looksLikeKey(text) {
  const t = text.trim();
  return Object.values(PROVIDERS).some((p) => t.startsWith(p.keyPrefix));
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
