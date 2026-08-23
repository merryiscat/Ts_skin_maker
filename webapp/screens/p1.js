/**
 * P1 상담 + 방향 고르기 (생성형 앞단, 2026-08-24)
 *
 * 용도·느낌을 받아 한 번의 호출로 ①상담과 ②컨셉 4안을 만든다.
 *
 *   왼쪽 대화   상담(시안 요청자에게 디자이너가 건네듯 대화체 한 덩이) + 고르기 + 의견
 *   캔버스      4 방향을 와이어프레임으로 나란히. 눌러서 고른다
 *
 * 사용자에게는 A안·B안·C안·D안 으로만 보인다(내부 kind 는 품질용, 숨김).
 * 고른 안의 구조(wire)는 세부 값으로 옮겨 다음 화면(P2)이 바로 렌더한다.
 * 시각 성격(look)은 selectedConcept 에 남아 ④(CSS 실현)에서 입혀진다.
 *
 * 화면 모듈 규약은 app/app.js 위쪽 주석에 있다.
 */

import { buildConsultConceptPrompt, validateConceptSet, wireToSpec, conceptLabel } from '../harness/concept-prompt.js';
import { createStructured, estimateCost } from '../providers.js';
import { wireframe } from '../ui/wireframe.js';

export function mount(root, ctx) {
  const { actions, toast, panes, showCanvas } = ctx;

  let phase = 'busy'; // busy | show

  /* ------------------------------------------------------------ 생성 */

  function drawBusy() {
    root.innerHTML = `
      <div class="msg">
        <div class="msg-body">
          <span class="busy">상담하고 방향을 잡는 중입니다</span>
          <div class="tiny dim" style="margin-top:10px">되는 것과 어려운 것을 살펴 네 방향으로 정리합니다</div>
        </div>
      </div>`;

    panes.foot.innerHTML = `
      <div class="composer">
        <input type="text" placeholder="만드는 중" disabled>
        <div class="row"><span class="tiny dim">한 번의 호출로 상담과 네 방향을 받습니다</span></div>
      </div>`;

    panes.canvasHead.textContent = '방향을 그리는 중';
    panes.canvasBody.className = 'canvas-body';
    panes.canvasBody.innerHTML = `
      <div class="split">
        ${['A안', 'B안', 'C안', 'D안']
          .map(
            (k) =>
              '<div class="card">' +
              `<div class="eyebrow">${k}</div>` +
              '<div class="skeleton" style="height:120px;width:100%;margin-top:10px"></div>' +
              '<div class="skeleton" style="height:12px;width:60%;margin-top:10px"></div>' +
              '<div class="skeleton" style="height:9px;width:100%;margin-top:6px"></div>' +
              '</div>',
          )
          .join('')}
      </div>`;
  }

  async function generate() {
    const st = actions.getState();
    if (!st.keyChecked) {
      actions.go('E1');
      return;
    }

    phase = 'busy';
    actions.setBusy(true);
    drawBusy();

    const prompt = buildConsultConceptPrompt({ purpose: st.purpose });
    const res = await createStructured(st.provider, st.apiKey, {
      model: st.model,
      system: prompt.system,
      systemParts: prompt.systemParts,
      messages: prompt.messages,
      schema: prompt.schema,
      effort: prompt.effort,
    });

    actions.setBusy(false);

    if (!res.ok) {
      // 물을 자리는 앞 화면(E1)에 있다. 알리고 돌려보내면 용도를 그대로 둔 채 다시 시도한다
      showError(res.error);
      if (actions.getState().screen !== 'E1') actions.go('E1');
      return;
    }
    if (res.usage) actions.addUsage(res.usage, estimateCost(st.provider, st.model, res.usage));

    const data = res.data || {};
    const concepts = data.concepts || [];
    // 넷이 서로 다른지만 가볍게 본다. 거친 구조가 겹치면 고를 근거가 약하다
    const errs = validateConceptSet(concepts);
    if (errs.length) {
      // 치명적이지 않다. 그대로 보여 주되 로그에 남긴다
      console.warn('concept set warnings:', errs);
    }

    actions.setConsult({ consultation: data.consultation, concepts, purpose: st.purpose });
    phase = 'show';
    drawShow(actions.getState());
    // 좁은 화면에서는 4안이 탭 건너에 있다. 만들어진 순간 그쪽으로 넘겨 준다
    showCanvas?.();
  }

  /* ------------------------------------------------------------ 보여주기 */

  function drawShow(state) {
    // 용도(사용자 말)는 왼쪽 대화 로그가 위에 그려 둔다. 여기서 상담부터 얹는다
    root.innerHTML = `
      <div class="msg">
        <div class="msg-body" style="white-space:pre-wrap">${esc(state.consultation)}</div>
      </div>
      <div class="msg">
        <div class="msg-body">
          오른쪽 네 방향 중 하나를 고르세요.
          <div class="msg-form">
            <div class="field">
              <div class="field-label">방향</div>
              <div class="opts" id="picks"></div>
            </div>
            <div class="field">
              <div class="field-label">덧붙일 의견 (선택)</div>
              <textarea id="note" class="chip-input" rows="2"
                placeholder="고른 방향에 바라는 점을 적으면 다음 단계에 반영합니다"></textarea>
            </div>
          </div>
        </div>
      </div>
      <div class="msg sys">
        <div class="msg-body">
          <span class="strong">다시 만들기</span>
          <p class="small" style="margin:4px 0 0">마음에 드는 방향이 없으면 다시 만들 수 있습니다.</p>
          <div class="msg-actions" style="margin-top:10px">
            <button class="sm primary" id="remake">다시 만들기</button>
          </div>
        </div>
      </div>`;

    panes.foot.innerHTML = `
      <div class="composer">
        <input type="text" placeholder="오른쪽에서 방향을 골라 다음으로 넘어갑니다" disabled>
        <div class="row">
          <span class="tiny dim">고른 방향의 구조를 다음 화면에서 봅니다</span>
          <span class="spacer"></span>
          <button class="primary" id="next" ${state.genIndex < 0 ? 'disabled' : ''}>이 방향으로</button>
        </div>
      </div>`;

    // 덧붙일 의견은 상태에 저장해 둔 값으로 되살린다(되돌아온 경우)
    const note = root.querySelector('#note');
    note.value = state.conceptNote || '';
    note.addEventListener('change', () => actions.setConceptNote(note.value));

    // A~D 고르기 버튼
    const picks = root.querySelector('#picks');
    state.genConcepts.forEach((c, i) => {
      picks.append(button(conceptLabel(i), i === state.genIndex, () => selectConcept(i)));
    });

    root.querySelector('#remake').addEventListener('click', () => generate());

    panes.foot.querySelector('#next').addEventListener('click', () => {
      // 의견을 담고, 고른 안을 확정(wire→details)한 뒤 구조를 보러 P2 로
      actions.setConceptNote(root.querySelector('#note').value);
      actions.applyGenConcept();
      actions.go('P2');
    });

    drawCards(state);
  }

  /** 캔버스의 4 방향 비교. 와이어가 주인공이고 글은 밑에 짧게. */
  function drawCards(state) {
    panes.canvasHead.innerHTML =
      '<span class="badge">4 방향</span>' + `<span class="badge plain">${esc(state.purpose)}</span>`;

    panes.canvasBody.className = 'canvas-body';
    panes.canvasBody.innerHTML = state.genConcepts
      .map((c, i) => conceptPanel(c, i, i === state.genIndex))
      .join('');

    wireCards();
  }

  /** 한 방향 패널. 와이어 + A안 이름 + 한 줄 소개 + 포기하는 것. */
  function conceptPanel(c, i, selected) {
    const spec = wireToSpec(c.wire);
    return `
      <div class="card pick${selected ? ' selected' : ''}" data-choose="${i}" style="margin-bottom:16px">
        ${wireframe(spec, { lg: true })}
        <div style="margin-top:12px">
          <div class="eyebrow">${esc(conceptLabel(i))}</div>
          <h3 style="font-size:var(--t-h2);margin:6px 0 8px">${esc(c.name)}</h3>
          <p style="margin:0 0 10px">${esc(c.pitch)}</p>
          <p class="small dim" style="margin:0 0 12px"><span class="strong">포기하는 것</span> ${esc(c.tradeoff)}</p>
          <button class="${selected ? 'primary' : 'sm'}" data-choose-btn="${i}">${selected ? '선택됨' : '선택'}</button>
        </div>
      </div>`;
  }

  function wireCards() {
    for (const b of panes.canvasBody.querySelectorAll('[data-choose-btn]')) {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        selectConcept(Number(b.dataset.chooseBtn));
      });
    }
    for (const card of panes.canvasBody.querySelectorAll('[data-choose]')) {
      card.addEventListener('click', () => selectConcept(Number(card.dataset.choose)));
    }
  }

  /**
   * 방향을 고른다. 캔버스를 통째로 다시 그리지 않고 필요한 곳만 제자리에서 손본다 -
   * 크게 보며 내려둔 스크롤 위치를 지키기 위해서다.
   */
  function selectConcept(i) {
    actions.chooseGenConcept(i);

    for (const card of panes.canvasBody.querySelectorAll('[data-choose]')) {
      const on = Number(card.dataset.choose) === i;
      card.classList.toggle('selected', on);
      const btn = card.querySelector('[data-choose-btn]');
      if (btn) {
        btn.textContent = on ? '선택됨' : '선택';
        btn.classList.toggle('primary', on);
        btn.classList.toggle('sm', !on);
      }
    }

    for (const b of root.querySelectorAll('#picks button')) {
      b.classList.toggle('on', b.textContent === conceptLabel(i));
    }
    const next = panes.foot.querySelector('#next');
    if (next) next.disabled = false;
  }

  /* ------------------------------------------------------------ 오류 */

  function showError(error) {
    if (!error) return;
    if (error.kind === 'invalid_key' || error.kind === 'format') {
      toast('키에 문제가 있습니다. 등록 화면으로 갑니다', 'bad');
      actions.go('E1');
      return;
    }
    toast(error.message || '요청이 실패했습니다', 'bad');
  }

  /* ------------------------------------------------------------ */

  function button(label, on, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `opt sm${on ? ' on' : ''}`;
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  const at = actions.getState();

  /*
   * 진입 규칙
   *   - 이 용도로 만든 4안이 이미 있으면 그것을 보여 준다(P2 에서 되돌아온 경우).
   *   - E1 의 예약(pendingGenerate)으로 들어왔으면 곧장 만든다.
   *   - 용도만 있고 예약이 없으면(직접 도착) 그래도 만든다.
   *   - 용도조차 없으면 물을 자리가 여기 없으니 E1 으로.
   */
  if (at.genConcepts.length && at.genPurpose === at.purpose) {
    phase = 'show';
    drawShow(at);
  } else if (at.pendingGenerate) {
    // 마운트가 끝나 app.js 가 current 를 할당한 뒤 시작한다. 마운트 도중 set() 을
    // 부르면 show() 가 재진입해 화면과 current 가 어긋난다
    queueMicrotask(() => {
      actions.requestGenerate(false);
      generate();
    });
  } else if (at.purpose) {
    queueMicrotask(() => generate());
  } else {
    actions.go('E1');
  }

  return {
    update() {
      // 'show' 중 상태 변화(방향 고르기)는 selectConcept 가 제자리에서 처리한다.
      // 여기서 다시 그리면 캔버스 스크롤이 튀므로 아무것도 하지 않는다.
    },
  };
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
