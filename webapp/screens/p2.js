/**
 * P2 세부 정하기
 *
 * 항목을 만지면 오른쪽 미리보기가 곧바로 따라온다. 여기서는 API 를 쓰지 않는다.
 * 전부 플래그 조작이라 마음껏 눌러 볼 수 있고, 그 점이 W1 과 갈리는 지점이다.
 *
 * 자리 배치
 *   왼쪽 대화   항목 폼(.msg-form). 컨셉과 달라진 것도 여기서 알린다
 *   캔버스      진짜 렌더 미리보기. 도식으로 바꿔 볼 수도 있다
 *
 * 와이어에는 "목록 보기 / 도식 보기" 전환이 있었지만 디자인에서 합쳤다.
 * 폭이 모자라 나눴던 것이고, 대화와 캔버스로 갈라 놓으면 둘을 동시에 볼 수 있다.
 *
 * 화면 모듈 규약은 app/app.js 위쪽 주석에 있다.
 */

import { detailsToPreset } from '../harness/spec.js';
import { buildSkinHtml } from '../presets/base/skeleton.js';
import { renderPreview, PREVIEW_PAGES } from '../loop/render.js';
import { PREVIEW_EXTRA_CSS } from '../loop/mock-data.js';
import { renderDetailForm, changedFromConcept } from '../ui/detail-form.js';
import { schematic } from '../ui/schematic.js';

export function mount(root, ctx) {
  const { actions, shared, panes } = ctx;

  let pageType = 'tt-body-index';
  let mobile = false;
  let showSchematic = false;

  /* ------------------------------------------------------------ 왼쪽 대화 */

  root.innerHTML = `
    <div class="msg">
      <div class="msg-role">안내</div>
      <div class="msg-body">
        고른 컨셉의 값을 채워 뒀습니다. 바꾸고 싶은 것만 만지세요.
        <div class="tiny dim" style="margin-top:6px" id="concept-name"></div>
        <div class="msg-form" id="form"></div>
      </div>
    </div>

    <div class="msg sys" id="changed" hidden>
      <div class="msg-body" id="changed-body"></div>
    </div>

    <div class="msg sys">
      <div class="msg-body">
        여기서는 호출하지 않습니다. 마음껏 눌러 보세요.
        <div class="msg-actions">
          <button class="sm" id="back">컨셉 다시 고르기</button>
          <button class="sm" id="reset">컨셉 값으로 되돌리기</button>
        </div>
      </div>
    </div>`;

  panes.foot.innerHTML = `
    <div class="composer">
      <input type="text" placeholder="다음 화면부터 말로 고칩니다" disabled>
      <div class="row">
        <span class="tiny dim">정한 값으로 스킨을 한 벌 만들어 둡니다</span>
        <span class="spacer"></span>
        <button class="primary" id="next">시작하기</button>
      </div>
    </div>`;

  /* ------------------------------------------------------------ 오른쪽 */

  panes.canvasHead.innerHTML = `
    <select id="page"></select>
    <button id="desktop" class="sm on">데스크탑</button>
    <button id="mobile" class="sm">모바일</button>
    <button id="schematic" class="sm">도식</button>`;

  panes.canvasBody.className = 'canvas-body';
  panes.canvasBody.innerHTML = `
    <iframe class="preview" id="preview" title="미리보기"></iframe>
    <div id="schematic-box" hidden style="max-width:520px;margin:0 auto"></div>`;

  const $ = (id) =>
    root.querySelector('#' + id) ||
    panes.foot.querySelector('#' + id) ||
    panes.canvasHead.querySelector('#' + id) ||
    panes.canvasBody.querySelector('#' + id);

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

  $('desktop').addEventListener('click', () => {
    mobile = false;
    $('desktop').classList.add('on');
    $('mobile').classList.remove('on');
    drawView(actions.getState());
  });
  $('mobile').addEventListener('click', () => {
    mobile = true;
    $('mobile').classList.add('on');
    $('desktop').classList.remove('on');
    drawView(actions.getState());
  });
  $('schematic').addEventListener('click', () => {
    showSchematic = !showSchematic;
    $('schematic').classList.toggle('on', showSchematic);
    drawView(actions.getState());
  });

  $('reset').addEventListener('click', () => actions.resetDetails());
  $('back').addEventListener('click', () => actions.go('P1'));
  $('next').addEventListener('click', () => actions.go('W1'));

  /** 폼은 값이 바뀔 때만 다시 그린다. 의존 항목이 나타나거나 사라질 수 있다. */
  function drawForm(state) {
    renderDetailForm($('form'), {
      details: state.details,
      conceptDetails: state.conceptDetails,
      onChange: (next) => actions.setDetails(next),
    });
  }

  function drawView(state) {
    const preset = detailsToPreset(state.details);

    const frame = $('preview');
    frame.hidden = showSchematic;
    if (!showSchematic) {
      const skin = buildSkinHtml(preset);
      frame.srcdoc = renderPreview(skin, {
        pageType,
        css: shared.css,
        js: shared.js,
        extraCss: PREVIEW_EXTRA_CSS,
      });
      frame.classList.toggle('mobile', mobile);
      // 캔버스 머리와 바깥 여백을 뺀 나머지. 미리보기가 잘리면 세부를 볼 수 없다
      frame.style.height = 'calc(100vh - 150px)';
    }

    const box = $('schematic-box');
    box.hidden = !showSchematic;
    if (showSchematic) box.innerHTML = schematic(preset, { lg: true });

    drawChanged(state);
  }

  /**
   * 컨셉과 달라진 것.
   *
   * 세부를 많이 바꾸는 것 자체는 문제가 아니지만, 네 개 넘게 바꿨다면 애초에
   * 고른 컨셉이 안 맞는 것일 수 있다. 그 사실을 알려 P1 으로 돌아갈 기회를 준다.
   */
  function drawChanged(state) {
    const changed = changedFromConcept(state.details, state.conceptDetails);
    const box = $('changed');
    box.hidden = changed.length === 0;
    if (!changed.length) return;

    $('changed-body').innerHTML =
      '<span class="strong">컨셉과 달라진 것</span>' +
      '<ul class="list marked small">' +
      changed
        .map((x) => `<li>${esc(x.label)} <span class="dim">${esc(x.from)} - ${esc(x.to)}</span></li>`)
        .join('') +
      '</ul>' +
      (changed.length >= 4
        ? '<p class="tiny dim" style="margin:6px 0 0">많이 바꿨다면 컨셉이 맞지 않는 것일 수 있습니다.</p>'
        : '');
  }

  let lastDetails = null;

  return {
    update(state) {
      // 컨셉을 안 고르고 들어온 경우. P1 으로 돌려보낸다
      if (!state.conceptDetails) {
        actions.go('P1');
        return;
      }

      const name = state.concepts[state.conceptIndex]?.name || '';
      $('concept-name').textContent = name ? `컨셉 ${name}` : '';

      if (state.details !== lastDetails) {
        lastDetails = state.details;
        drawForm(state);
        drawView(state);
      }
    },
  };
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
