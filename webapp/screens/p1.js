/**
 * P1 레이아웃 고르기 (1안씩 탐색, 2026-08-26 옵션2 + 피드백)
 *
 * 순서(옵션2)는 그대로 - 레이아웃을 먼저 고르고 무드는 C1 에서. 다만 P1 은 "4개를 한 번에"
 * 가 아니라 "한 안씩 탐색" 이다(디자인 피드백):
 *   - 시작에 레이아웃 1안을 보여준다. 용도가 유일한 재료다(시드 없음, 2026-08-31).
 *   - "새로운 안": 이미 본 안들의 요약(avoid)을 실어, 그것들과 다른 새 레이아웃.
 *   - "이 안 수정": 입력한 의견으로 지금 안의 구조는 유지한 채 고친다(base 모드).
 *   - "이 레이아웃으로": 이 레이아웃을 들고 C1(무드) 로.
 *   - "이전으로": 용도(E1) 로.
 *
 * 각 안은 모델이 짓는 흑백 자유 와이어이고, 소독+실현가능성 린트를 통과한 것만 그린다.
 *
 * 화면 모듈 규약은 app/app.js 위쪽 주석에 있다.
 */

import { buildVariantPrompt, conceptSummary } from '../harness/concept-prompt.js';
import { sanitizeWireHtml, lintWireFeasibility } from '../harness/wire-feasibility.js';
import { mountWire } from '../loop/wire-render.js';
import { createStructured, estimateCost, PROVIDERS } from '../providers.js';

const MAX_TRIES = 3; // 실현가능성 위반 시 재시도(최초 1 + 재시도 2)

export function mount(root, ctx) {
  const { actions, toast, panes, showCanvas } = ctx;
  const getState = actions.getState;

  let busy = false;
  let reqSeq = 0;

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

  /* ------------------------------------------------------------ 생성 */

  /**
   * 레이아웃 한 안을 만든다.
   * @param {{refine?:boolean, note?:string}} opts
   *   refine=true 면 지금 안의 구조를 유지하며 note 로 고친다. 아니면 새 구조를 avoid 로 뽑는다.
   */
  async function generateOne({ refine = false, note = '' } = {}) {
    busy = true;
    drawBusy();
    const my = ++reqSeq;
    const st = getState();
    const seen = st.genConcepts;

    let promptBase;
    if (refine) {
      const cur = seen[st.genIndex];
      if (!cur) {
        busy = false;
        drawShow(st);
        return;
      }
      promptBase = { purpose: st.purpose, base: `${cur.name} — ${cur.hint}`, note };
    } else {
      // 용도가 유일한 재료다. 2안부터는 이미 본 안들의 요약을 실어 같은 걸 또 내지 않게 한다.
      const avoid = seen.map(conceptSummary).filter(Boolean);
      promptBase = { purpose: st.purpose, avoid };
    }

    let fix = [];
    let concept = null;
    let lastError = null;
    for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
      const res = await call(buildVariantPrompt({ ...promptBase, fix }));
      if (my !== reqSeq) return;
      if (!res.ok) {
        lastError = res.error;
        break;
      }
      actions.addUsage(res.usage, estimateCost(st.provider, st.model, res.usage));
      // 사이드바 위치는 모델의 wireHtml 을 믿지 않고 sidebar 필드로 앱이 강제한다
      // (싼 모델이 "오른쪽" 을 desc 엔 쓰고 wireHtml 엔 반영 못 하는 것을 막는다).
      const wireHtml = withSidebarSide(sanitizeWireHtml(res.data.wireHtml), res.data.sidebar);
      const { violations } = lintWireFeasibility(wireHtml, res.data);
      if (violations.length && attempt < MAX_TRIES - 1) {
        fix = violations.map((v) => v.message);
        continue;
      }
      concept = {
        name: res.data.name || '',
        desc: res.data.desc || '',
        hint: res.data.hint || '',
        sidebar: res.data.sidebar || 'left',
        wireHtml,
        warned: violations.length > 0,
      };
      break;
    }

    if (my !== reqSeq) return;
    busy = false;
    if (!concept) {
      showError(lastError);
      drawShow(getState());
      return;
    }
    actions.addConcept(concept);
    drawShow(getState());
    showCanvas?.();
    // 새로 더한 안이 보이게 캔버스를 아래로 내린다.
    panes.canvasBody.scrollTop = panes.canvasBody.scrollHeight;
  }

  function drawBusy() {
    root.innerHTML =
      '<div class="msg"><div class="msg-body"><span class="busy">새 레이아웃을 만드는 중입니다</span></div></div>';
    panes.foot.innerHTML = '';
    // 기존 안은 그대로 두고, 맨 아래에 로딩 카드만 붙인다.
    drawCanvas(getState(), true);
    panes.canvasBody.scrollTop = panes.canvasBody.scrollHeight;
  }

  /* ------------------------------------------------------------ 보여주기 */

  function drawShow(state) {
    const c = state.genIndex >= 0 ? state.genConcepts[state.genIndex] : null;
    root.innerHTML = `
      <div class="msg">
        <div class="msg-body">
          레이아웃 안내 드립니다.
          <div id="sel-info" style="margin-top:6px">${selInfoHtml(c)}</div>
          <div class="row" style="gap:8px;margin-top:10px;flex-wrap:nowrap">
            <input type="text" id="note-input" class="chip-input" style="flex:1 1 150px;min-width:0"
              placeholder="예) 사이드바를 오른쪽으로">
            <button id="refine" style="align-self:stretch">수정</button>
          </div>
          <button class="block" id="new" style="margin-top:8px">새로운 안 보기</button>
          <button class="block" id="confirm" style="margin-top:8px"${c ? '' : ' disabled'}>레이아웃 선택</button>
          <button class="block" id="back" style="margin-top:8px">이전으로</button>
        </div>
      </div>`;

    const noteEl = root.querySelector('#note-input');
    const refine = () => {
      if (busy) return;
      const v = noteEl.value.trim();
      if (!v) {
        toast?.('고칠 의견을 적어 주세요', 'bad');
        return;
      }
      if (looksLikeKey(v)) {
        toast?.('API 키로 보이는 값이라 보내지 않았습니다. 키는 설정에서 바꿉니다.', 'bad');
        return;
      }
      generateOne({ refine: true, note: v });
    };
    root.querySelector('#refine').addEventListener('click', refine);
    noteEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        refine();
      }
    });
    root.querySelector('#new').addEventListener('click', () => {
      if (busy) return;
      generateOne({ refine: false });
    });
    root.querySelector('#confirm').addEventListener('click', () => {
      if (getState().genIndex < 0) return;
      actions.go('C1'); // 레이아웃 확정 → 무드 단계로
    });
    root.querySelector('#back').addEventListener('click', () => actions.go('E1'));

    drawCanvas(state);
  }

  function drawCanvas(state, generating = false) {
    const items = state.genConcepts;
    panes.canvasHead.innerHTML =
      '<span class="badge accent">레이아웃</span>' + `<span class="badge plain accent">${esc(state.purpose)}</span>`;
    panes.canvasBody.className = 'canvas-body';

    // 안들을 세로로 쌓는다. "새로운 안 보기" 는 기존 안 아래로 새 안을 더한다 -
    // 그래서 이전 안도 그대로 보이고 아무거나 골라 선택할 수 있다.
    const cards = items
      .map(
        (v, i) => `
        <button type="button" class="card pick${i === state.genIndex ? ' selected' : ''}" data-i="${i}"
          style="display:block;width:100%;text-align:left;padding:0;overflow:hidden;cursor:pointer">
          <iframe data-wire="${i}" title="와이어프레임" sandbox="" tabindex="-1"
            style="width:100%;height:360px;border:0;background:#fff;display:block;pointer-events:none"></iframe>
          <div style="padding:10px 12px;border-top:1px solid var(--border)">
            <span class="eyebrow">${i + 1}안</span> <span class="strong">${esc(v.name)}</span>${v.warned ? ' <span class="badge bad">확인 필요</span>' : ''}
            <p class="small dim" style="margin:4px 0 0">${esc(v.desc)}</p>
          </div>
        </button>`,
      )
      .join('');

    // 생성 중이면 기존 안 아래에 로딩 카드를 따로 붙인다(기존 안은 안 사라진다).
    const loading = generating
      ? `<div class="card" style="padding:0;overflow:hidden">
           <div class="skeleton" style="height:360px"></div>
           <div style="padding:10px 12px;border-top:1px solid var(--border)"><span class="busy">새 안을 만드는 중…</span></div>
         </div>`
      : '';

    panes.canvasBody.innerHTML = `<div style="display:flex;flex-direction:column;gap:14px">${cards}${loading}</div>`;

    for (const frame of panes.canvasBody.querySelectorAll('iframe[data-wire]')) {
      const v = items[Number(frame.dataset.wire)];
      if (v) mountWire(frame, v.wireHtml); // 내용 높이에 맞춰 자동 확장(잘림 방지)
    }
    // 생성 중에는 선택 클릭을 막는다(끝나면 다시 붙는다).
    if (!generating) {
      for (const card of panes.canvasBody.querySelectorAll('[data-i]')) {
        card.addEventListener('click', () => selectConcept(Number(card.dataset.i)));
      }
    }
  }

  /** 쌓인 안 중 하나를 고른다(강조). 확정 버튼은 이 선택을 쓴다. */
  function selectConcept(i) {
    if (getState().genIndex !== i) actions.chooseConcept(i);
    const state = getState();
    for (const card of panes.canvasBody.querySelectorAll('[data-i]')) {
      card.classList.toggle('selected', Number(card.dataset.i) === state.genIndex);
    }
    const cf = root.querySelector('#confirm');
    if (cf) cf.disabled = state.genIndex < 0;
    // 좌측의 "선택된 레이아웃 정보" 도 갱신한다.
    const info = root.querySelector('#sel-info');
    if (info) info.innerHTML = selInfoHtml(state.genIndex >= 0 ? state.genConcepts[state.genIndex] : null);
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
  } else if (at.pendingGenerate || at.genPurpose !== at.purpose) {
    busy = true;
    drawBusy();
    queueMicrotask(() => {
      actions.requestGenerate(false);
      actions.resetConsult(at.purpose);
      generateOne({ refine: false });
    });
  } else if (at.genConcepts.length) {
    drawShow(at);
  } else {
    busy = true;
    drawBusy();
    queueMicrotask(() => generateOne({ refine: false }));
  }

  return {
    update() {},
  };
}

/** 와이어 루트(.wf)에 사이드바 위치 클래스를 심어 렌더 측에서 좌/우/없음을 강제한다. */
function withSidebarSide(html, sidebar) {
  const cls = sidebar === 'right' ? 'side-right' : sidebar === 'none' ? 'side-none' : 'side-left';
  return String(html)
    .replace(/class="wf"/, `class="wf ${cls}"`)
    .replace(/class='wf'/, `class='wf ${cls}'`);
}

/** 좌측에 보여줄 "지금 고른 레이아웃" 정보(이름·설명). */
function selInfoHtml(c) {
  if (!c) return '<span class="small dim">아직 고른 레이아웃이 없어요. 오른쪽에서 하나 고르세요.</span>';
  return (
    `<span class="strong">${esc(c.name)}</span>` +
    (c.warned ? ' <span class="badge bad">확인 필요</span>' : '') +
    `<p class="small dim" style="margin:2px 0 0">${esc(c.desc)}</p>`
  );
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
