/**
 * P1 4안 고르기 (생성형 앞단, 2026-08-25 개편)
 *
 * 용도로 값싼 4안 스케치를 만들어(이름·설명 + 거친 구조) 오른쪽에 흑백 와이어프레임
 * 넷을 나란히 그린다. 사용자가 하나를 고르고 "이 구성으로" 를 누르면, 그 컨셉을 들고
 * P2 로 가서 "구조 + 색" 을 CSS 로 풀 생성해 진짜 화면을 본다.
 *
 * 왜 와이어를 값싸게? 4개를 다 풀 생성하면 호출이 4배다. 스케치는 출력이 작아 한 번에
 * 넷을 싸게 뽑고, 풀 생성은 고른 하나만 한다(2026-08-25 피드백). 스케치의 거친 구조는
 * 방향을 고르는 용도일 뿐, 최종 구조는 CSS 로 열려 있다(고정 템플릿 돌려쓰기가 아님).
 *
 * 화면 모듈 규약은 app/app.js 위쪽 주석에 있다.
 */

import { buildConceptSetPrompt, wireToSketch } from '../harness/concept-prompt.js';
import { wireframe } from '../ui/wireframe.js';
import { createStructured, estimateCost, PROVIDERS } from '../providers.js';

export function mount(root, ctx) {
  const { actions, toast, panes, showCanvas } = ctx;
  const getState = actions.getState;

  let busy = false; // 4안을 만드는 중
  let reqSeq = 0;

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

  async function generateConcepts(note) {
    busy = true;
    drawBusy();
    const my = ++reqSeq;
    const st = getState();
    const res = await call(buildConceptSetPrompt({ purpose: st.purpose, note: note || st.conceptNote }));
    if (my !== reqSeq) return;
    busy = false;
    if (!res.ok) {
      showError(res.error);
      drawBusy();
      return;
    }
    actions.addUsage(res.usage, estimateCost(st.provider, st.model, res.usage));
    actions.setConceptSet(res.data.concepts || []);
    drawShow(getState());
    showCanvas?.();
  }

  function drawBusy() {
    root.innerHTML =
      '<div class="msg"><div class="msg-body"><span class="busy">화면 구성 4안을 만드는 중입니다</span></div></div>';
    panes.foot.innerHTML = '';
    panes.canvasHead.textContent = '4안';
    panes.canvasBody.className = 'canvas-body';
    panes.canvasBody.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        ${[1, 2, 3, 4]
          .map(
            (n) =>
              '<div class="card">' +
              `<div class="eyebrow">${n}안</div>` +
              '<div class="skeleton" style="height:150px;margin-top:8px"></div>' +
              '<div class="skeleton" style="height:12px;width:60%;margin-top:10px"></div>' +
              '</div>',
          )
          .join('')}
      </div>`;
  }

  /* ------------------------------------------------------------ 보여주기 */

  function drawShow(state) {
    const name = state.genIndex >= 0 ? state.genConcepts[state.genIndex]?.name : '';
    root.innerHTML = `
      <div class="msg">
        <div class="msg-body">
          마음에 드는 화면 구성을 오른쪽에서 하나 고르세요.
          <div class="row" style="gap:8px;margin-top:10px;flex-wrap:nowrap">
            <input type="text" id="note-input" class="chip-input" style="flex:1 1 150px;min-width:0"
              placeholder="원하는 느낌을 적어 다시 만들 수 있어요">
            <button class="sm" id="remake">다시 만들기</button>
          </div>
          <button class="primary block" id="confirm" style="margin-top:14px"${state.genIndex < 0 ? ' disabled' : ''}>${name ? `‘${esc(name)}’ 로 만들기` : '이 구성으로 만들기'}</button>
        </div>
      </div>`;

    const note = root.querySelector('#note-input');
    note.value = state.conceptNote || '';
    const remake = () => {
      const v = note.value.trim();
      if (looksLikeKey(v)) {
        toast?.('API 키로 보이는 값이라 보내지 않았습니다. 키는 설정에서 바꿉니다.', 'bad');
        return;
      }
      actions.setConceptNote(v);
      generateConcepts(v);
    };
    root.querySelector('#remake').addEventListener('click', remake);
    note.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        remake();
      }
    });
    root.querySelector('#confirm').addEventListener('click', () => {
      if (getState().genIndex < 0) return;
      actions.applySelectedConcept();
      actions.go('P2');
    });

    drawCards(state);
  }

  function drawCards(state) {
    panes.canvasHead.innerHTML = '<span class="badge">4안</span>' + `<span class="badge plain">${esc(state.purpose)}</span>`;
    panes.canvasBody.className = 'canvas-body';
    panes.canvasBody.innerHTML =
      '<div id="grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">' +
      state.genConcepts.map((c, i) => conceptCard(c, i, i === state.genIndex)).join('') +
      '</div>';
    for (const card of panes.canvasBody.querySelectorAll('[data-i]')) {
      card.addEventListener('click', () => selectConcept(Number(card.dataset.i)));
    }
  }

  function conceptCard(c, i, selected) {
    return `
      <button type="button" class="card pick${selected ? ' selected' : ''}" data-i="${i}" style="display:block;width:100%;text-align:left;cursor:pointer">
        ${wireframe(wireToSketch(c.wire))}
        <div style="margin-top:10px"><span class="eyebrow">${i + 1}안</span> <span class="strong">${esc(c.name)}</span></div>
        <p class="small dim" style="margin:4px 0 0">${esc(c.desc)}</p>
      </button>`;
  }

  /** 고른다. 제자리 강조 + 확정 버튼 라벨/활성. */
  function selectConcept(i) {
    actions.chooseConcept(i);
    const state = getState();
    for (const card of panes.canvasBody.querySelectorAll('[data-i]')) {
      card.classList.toggle('selected', Number(card.dataset.i) === state.genIndex);
    }
    const cf = root.querySelector('#confirm');
    if (cf) {
      cf.disabled = state.genIndex < 0;
      const name = state.genIndex >= 0 ? state.genConcepts[state.genIndex]?.name : '';
      cf.textContent = name ? `‘${name}’ 로 만들기` : '이 구성으로 만들기';
    }
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
      generateConcepts();
    });
  } else if (at.genConcepts.length) {
    drawShow(at);
  } else {
    busy = true;
    drawBusy();
    queueMicrotask(() => generateConcepts());
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
