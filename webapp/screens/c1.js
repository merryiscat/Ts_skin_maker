/**
 * C1 무드/컨셉 정하기 (레이아웃 고른 뒤, 2026-08-26 옵션2)
 *
 * P1 에서 레이아웃을 고른 다음, 그 위에 입힐 무드·색을 "한 줄" 로 정한다(장황한 카드 대신).
 * 모델이 한 줄 컨셉을 제안하고, 사용자가 채팅으로 방향을 더 다듬는다. 확정하면 고른 레이아웃 +
 * 이 무드를 들고 P2 로 가서 CSS 로 실현한다.
 *
 * 화면 모듈 규약은 app/app.js 위쪽 주석에 있다.
 */

import { buildOverallConceptPrompt, overallConceptToText } from '../harness/concept-prompt.js';
import { lintWireFeasibility } from '../harness/wire-feasibility.js';
import { renderWireDoc } from '../loop/wire-render.js';
import { createStructured, estimateCost, PROVIDERS } from '../providers.js';

// 컨셉이 티스토리 미지원 기능(조회수 정렬 등)을 전제하면 사유를 실어 다시 잡는다.
const MAX_TRIES = 3;

export function mount(root, ctx) {
  const { actions, toast, panes } = ctx;
  const getState = actions.getState;

  let busy = false;
  let reqSeq = 0;
  let directions = []; // 사용자가 채팅으로 더한 방향들(누적)

  function call(prompt) {
    const st = getState();
    return createStructured(st.provider, st.apiKey, {
      model: st.model,
      system: prompt.system,
      messages: prompt.messages,
      schema: prompt.schema,
      effort: prompt.effort,
    });
  }

  /* ------------------------------------------------------------ 생성 */

  async function generateConcept() {
    busy = true;
    drawBusy();
    const my = ++reqSeq;
    const st = getState();
    const note = directions.join(' / ');

    let fix = [];
    let concept = null;
    let lastError = null;
    for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
      const res = await call(buildOverallConceptPrompt({ purpose: st.purpose, note, fix }));
      if (my !== reqSeq) return;
      if (!res.ok) {
        lastError = res.error;
        break;
      }
      actions.addUsage(res.usage, estimateCost(st.provider, st.model, res.usage));
      const { violations } = lintWireFeasibility(overallConceptToText(res.data), { name: res.data.name });
      if (violations.length && attempt < MAX_TRIES - 1) {
        fix = violations.map((v) => v.message);
        continue;
      }
      concept = res.data;
      break;
    }

    if (my !== reqSeq) return;
    busy = false;
    if (!concept) {
      showError(lastError);
      drawShow(getState());
      return;
    }
    actions.setOverallConcept(concept);
    drawShow(getState());
  }

  function drawBusy() {
    root.innerHTML =
      '<div class="msg"><div class="msg-body"><span class="busy">무드·색 컨셉을 잡는 중입니다</span></div></div>';
    panes.foot.innerHTML = '';
    panes.canvasHead.innerHTML = '<span class="badge">컨셉</span>';
    panes.canvasBody.className = 'canvas-body';
    panes.canvasBody.innerHTML = '<div class="card"><div class="skeleton" style="height:20px;width:50%"></div></div>';
  }

  /* ------------------------------------------------------------ 보여주기 */

  function drawShow(state) {
    const c = state.overallConcept;
    const dirs = directions.length
      ? `<div class="small dim" style="margin-top:8px">더한 방향: ${directions.map(esc).join(' · ')}</div>`
      : '';
    root.innerHTML = `
      <div class="msg">
        <div class="msg-body">
          ${c ? `무드를 <strong>${esc(c.name)}</strong> 로 잡았어요 — ${esc(c.summary || '')}` : '무드를 잡지 못했습니다.'}
          <div class="row" style="gap:8px;margin-top:10px;flex-wrap:nowrap">
            <input type="text" id="note-input" class="chip-input" style="flex:1 1 150px;min-width:0"
              placeholder="무드를 바꿔 말해 보세요 (예: 좀 더 미니멀하게)">
            <button class="sm" id="refine">반영</button>
          </div>
          ${dirs}
          <button class="primary block" id="confirm" style="margin-top:14px"${c ? '' : ' disabled'}>이 무드로 만들기</button>
          <button class="ghost block sm" id="relayout" style="margin-top:8px">레이아웃 다시 고르기</button>
        </div>
      </div>`;

    const noteEl = root.querySelector('#note-input');
    const refine = () => {
      if (busy) return;
      const v = noteEl.value.trim();
      if (!v) return;
      if (looksLikeKey(v)) {
        toast?.('API 키로 보이는 값이라 보내지 않았습니다. 키는 설정에서 바꿉니다.', 'bad');
        return;
      }
      directions.push(v);
      generateConcept();
    };
    root.querySelector('#refine').addEventListener('click', refine);
    noteEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        refine();
      }
    });
    root.querySelector('#confirm').addEventListener('click', () => {
      if (!getState().overallConcept) return;
      actions.applySelectedConcept(); // 고른 레이아웃 + 이 무드를 실현 재료로
      actions.go('P2');
    });
    root.querySelector('#relayout').addEventListener('click', () => actions.go('P1'));

    drawCanvas(state);
  }

  function drawCanvas(state) {
    const c = state.overallConcept;
    const wire = state.genIndex >= 0 ? state.genConcepts[state.genIndex] : null;
    panes.canvasHead.innerHTML =
      '<span class="badge">컨셉</span>' + (wire ? `<span class="badge plain">${esc(wire.name)} 레이아웃</span>` : '');
    panes.canvasBody.className = 'canvas-body';
    panes.canvasBody.innerHTML = `
      <div class="card" style="padding:10px">
        <div class="eyebrow">무드</div>
        <div class="strong" style="margin-top:2px">${esc(c?.name || '')}</div>
        <p class="small dim" style="margin:4px 0 0">${esc(c?.summary || '')}</p>
      </div>
      <div class="small dim" style="margin:12px 0 6px">고른 레이아웃</div>
      <iframe id="wire-frame" title="고른 레이아웃" sandbox="" tabindex="-1"
        style="width:100%;height:300px;border:0;background:#fff;border-radius:8px;pointer-events:none"></iframe>`;
    const frame = panes.canvasBody.querySelector('#wire-frame');
    if (frame && wire) frame.srcdoc = renderWireDoc(wire.wireHtml);
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
  } else if (at.overallConcept) {
    drawShow(at);
  } else {
    busy = true;
    drawBusy();
    queueMicrotask(() => generateConcept());
  }

  return {
    update() {},
  };
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
