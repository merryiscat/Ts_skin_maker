/**
 * P2 세부 정하기
 *
 * 목록으로 훑고 미리보기로 다듬는다. 여기서는 API 를 쓰지 않는다.
 * 전부 플래그 조작이라 마음껏 눌러 볼 수 있고, 그 점이 W1 과 갈리는 지점이다.
 *
 * 이 파일이 화면 모듈의 본보기다. 규약은 app/app.js 위쪽 주석에 있다.
 */

import { detailsToPreset } from '../harness/spec.js';
import { buildSkinHtml } from '../presets/base/skeleton.js';
import { renderPreview, PREVIEW_PAGES } from '../loop/render.js';
import { PREVIEW_EXTRA_CSS } from '../loop/mock-data.js';
import { renderDetailForm, changedFromConcept } from '../ui/detail-form.js';
import { schematic } from '../ui/schematic.js';

export function mount(root, ctx) {
  const { actions, shared } = ctx;

  let pageType = 'tt-body-index';
  let mobile = false;
  let showSchematic = false;

  root.innerHTML = `
    <div class="page wide">
      <div class="row" style="margin-bottom:12px">
        <h2 style="font-size:16px">세부 정하기</h2>
        <span class="badge" id="concept-name"></span>
        <span class="spacer"></span>
        <button id="back">컨셉 다시 고르기</button>
        <button id="reset">컨셉 값으로 되돌리기</button>
        <button class="primary" id="next">시작하기</button>
      </div>

      <div class="split">
        <div class="panel">
          <div class="panel-head">항목 <span class="spacer"></span><span class="plain">컨셉 표시가 붙은 것부터 보세요</span></div>
          <div class="panel-body scroll" id="form"></div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <select id="page"></select>
            <button id="desktop" class="on sm">데스크탑</button>
            <button id="mobile" class="sm">모바일</button>
            <span class="spacer"></span>
            <button id="schematic" class="sm">도식</button>
            <span class="plain tiny dim">API 를 쓰지 않습니다</span>
          </div>
          <div class="panel-body">
            <iframe class="preview" id="preview" title="미리보기"></iframe>
            <div id="schematic-box" hidden style="display:flex;justify-content:center;padding:20px 0"></div>
            <div id="changed" hidden style="margin-top:12px"></div>
          </div>
        </div>
      </div>
    </div>`;

  const $ = (id) => root.querySelector('#' + id);

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
      frame.style.height = 'calc(100vh - 230px)';
    }

    const box = $('schematic-box');
    box.hidden = !showSchematic;
    if (showSchematic) box.innerHTML = schematic(preset, { width: 320 });

    const changed = changedFromConcept(state.details, state.conceptDetails);
    const c = $('changed');
    c.hidden = changed.length === 0;
    if (changed.length) {
      c.innerHTML =
        '<div class="note"><h3>컨셉과 달라진 것</h3><ul class="list">' +
        changed
          .map((x) => `<li>${esc(x.label)} <span class="dim">${esc(x.from)} - ${esc(x.to)}</span></li>`)
          .join('') +
        '</ul>' +
        (changed.length >= 4
          ? '<p class="tiny dim" style="margin-top:6px">많이 바꿨다면 컨셉이 맞지 않는 것일 수 있습니다.</p>'
          : '') +
        '</div>';
    }
  }

  let lastDetails = null;

  return {
    update(state) {
      // 컨셉을 안 고르고 들어온 경우. P1 으로 돌려보낸다
      if (!state.conceptDetails) {
        actions.go('P1');
        return;
      }

      $('concept-name').textContent = state.concepts[state.conceptIndex]?.name || '';

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
