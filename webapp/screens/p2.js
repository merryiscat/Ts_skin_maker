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
import { PREVIEW_EXTRA_CSS, mockFrom } from '../loop/mock-data.js';
import { renderDetailForm, changedFromConcept } from '../ui/detail-form.js';
import { wireframe } from '../ui/wireframe.js';
import { buildSampleContentPrompt } from '../harness/sample-prompt.js';
import { buildThemePrompt, sanitizeThemeCss } from '../harness/theme-prompt.js';
import { createStructured, estimateCost } from '../providers.js';

export function mount(root, ctx) {
  const { actions, shared, panes, toast } = ctx;

  let generating = false; // 미리보기 샘플을 만드는 중인지
  let themeGenerating = false; // 고른 방향의 테마(look→CSS)를 만드는 중인지

  let pageType = 'tt-body-index';
  let mobile = false;
  let showSchematic = false;

  /* ------------------------------------------------------------ 왼쪽 대화 */

  root.innerHTML = `
    <div class="msg">
      <div class="msg-body">
        블로그 화면을 골라 보세요. 항목을 만지면 오른쪽 미리보기가 바로 따라옵니다.
        <div class="tiny dim" style="margin-top:6px" id="purpose-note"></div>
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
          <button class="sm" id="back">이전으로</button>
          <button class="sm" id="reset">기본값으로 되돌리기</button>
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
    <button id="schematic" class="sm">와이어</button>`;

  panes.canvasBody.className = 'canvas-body';
  panes.canvasBody.innerHTML = `
    <iframe class="preview" id="preview" title="미리보기"></iframe>
    <div id="preview-loading" class="preview-loading" hidden>
      <span class="busy">용도에 맞는 미리보기 글을 만드는 중…</span>
    </div>
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
  // 이전으로: 방향 고르기(P1)로. 고른 안과 4안은 상태에 남아 있어 그대로 다시 뜬다
  $('back').addEventListener('click', () => actions.go('P1'));
  $('next').addEventListener('click', () => actions.go('W1'));

  /** 폼은 값이 바뀔 때만 다시 그린다. 의존 항목이 나타나거나 사라질 수 있다. */
  function drawForm(state) {
    renderDetailForm($('form'), {
      details: state.details,
      conceptDetails: state.conceptDetails,
      onChange: (next) => actions.setDetails(next),
      uploadedFont: state.uploadedFont,
      // 글꼴을 올리면 저장하고, 본문 글꼴을 그 올린 글꼴로 바꾼다
      onUpload: (font) => {
        actions.setUploadedFont(font);
        actions.setDetails({ ...actions.getState().details, bodyFont: 'uploaded' });
      },
    });
  }

  function drawView(state) {
    const frame = $('preview');
    const box = $('schematic-box');
    const loadingEl = $('preview-loading');

    // 샘플 글이나 테마를 만드는 중이면, 이전/기본 내용을 보여주다 바뀌게 두지 않고
    // 그동안은 "생성 중"만 보여 준다 (2026-08-23 피드백)
    const themeKey = state.selectedConcept ? actions.conceptKey(state.selectedConcept) : '';
    const loadingSample = generating && (!state.sample || state.sample.purpose !== state.purpose);
    const loadingTheme =
      themeGenerating && state.selectedConcept && (!state.themeCss || state.themeFor !== themeKey);
    if (loadingSample || loadingTheme) {
      if (loadingEl) {
        loadingEl.hidden = false;
        const busy = loadingEl.querySelector('.busy');
        if (busy) busy.textContent = loadingTheme ? '고른 방향의 느낌을 입히는 중…' : '용도에 맞는 미리보기 글을 만드는 중…';
      }
      frame.hidden = true;
      box.hidden = true;
      return;
    }
    if (loadingEl) loadingEl.hidden = true;

    // 테마 CSS 를 골격 마지막에 얹어 look 을 입힌다(themeCss). 글꼴은 노브(details)로 간다.
    const preset = detailsToPreset(state.details, { uploadedFont: state.uploadedFont, themeCss: state.themeCss });

    frame.hidden = showSchematic;
    if (!showSchematic) {
      const skin = buildSkinHtml(preset);
      frame.srcdoc = renderPreview(skin, {
        pageType,
        css: shared.css,
        js: shared.js,
        extraCss: PREVIEW_EXTRA_CSS,
        // 용도별 LLM 샘플이 있으면 그 글로 채운다. 없으면 렌더러가 기본 목업을 쓴다.
        mock: mockFrom(state.sample),
      });
      frame.classList.toggle('mobile', mobile);
      // 캔버스 머리와 바깥 여백을 뺀 나머지. 미리보기가 잘리면 세부를 볼 수 없다
      frame.style.height = 'calc(100vh - 150px)';
    }

    box.hidden = !showSchematic;
    if (showSchematic) box.innerHTML = wireframe(preset, { lg: true });

    drawChanged(state);
  }

  /** 기본값에서 바꾼 것. 되돌리기 기준이 무엇인지 보여 준다. */
  function drawChanged(state) {
    const changed = changedFromConcept(state.details, state.conceptDetails);
    const box = $('changed');
    box.hidden = changed.length === 0;
    if (!changed.length) return;

    $('changed-body').innerHTML =
      '<span class="strong">기본값과 달라진 것</span>' +
      '<ul class="list marked small">' +
      changed
        .map((x) => `<li>${esc(x.label)} <span class="dim">${esc(x.from)} - ${esc(x.to)}</span></li>`)
        .join('') +
      '</ul>';
  }

  /**
   * 용도에 맞는 미리보기 샘플 글을 LLM 으로 한 번 만든다.
   *
   * 스킨을 생성하는 게 아니라 미리보기를 채우는 것뿐이라 값이 조금 어긋나도
   * 위험이 없다 - LLM 이 잘하는 자유 텍스트 생성이다. 용도별로 한 번만 만들고,
   * 용도가 바뀌면 (sample.purpose 가 달라져) 다시 만든다. 실패하면 기본 목업으로
   * 조용히 둔다.
   */
  async function ensureSample(state) {
    if (generating) return;
    if (!state.keyChecked || !state.purpose) return;
    if (state.sample && state.sample.purpose === state.purpose) return;

    generating = true;
    drawView(actions.getState()); // 생성 중 표시로 그린다

    const prompt = buildSampleContentPrompt(state.purpose);
    const res = await createStructured(state.provider, state.apiKey, {
      model: state.model,
      system: prompt.system,
      messages: prompt.messages,
      schema: prompt.schema,
      effort: prompt.effort,
    });

    generating = false;

    if (res.ok && res.data) {
      actions.addUsage(res.usage, estimateCost(state.provider, state.model, res.usage));
      // 용도를 함께 저장해 두어 그 용도가 바뀔 때만 다시 만든다.
      // setSample → update → drawView 로 완성된 샘플이 그려진다
      actions.setSample({ purpose: state.purpose, ...res.data });
    } else {
      // 미리보기 채움 실패는 치명적이지 않다. 기본 목업으로 계속 쓴다.
      toast?.('샘플 글을 만들지 못했습니다. 기본 예시로 보여 줍니다', 'bad');
      drawView(actions.getState());
    }
  }

  /**
   * 고른 방향(selectedConcept)의 look 을 실제 테마 CSS 로 만든다(④ 실현).
   *
   * 고른 안이 바뀌면(themeFor 키 불일치) 다시 만든다. 색·질감은 themeCss 로,
   * 어울리는 글꼴은 노브(details.bodyFont/headingFont)로 나눠 넣는다 - 글꼴은
   * 이 도구의 폰트 시스템(폼·업로드)이 계속 맡게 하기 위해서다.
   */
  async function ensureTheme(state) {
    if (themeGenerating) return;
    if (!state.keyChecked || !state.selectedConcept) return;
    const key = actions.conceptKey(state.selectedConcept);
    if (state.themeCss && state.themeFor === key) return;

    themeGenerating = true;
    drawView(actions.getState()); // "느낌 입히는 중" 표시

    const prompt = buildThemePrompt({
      purpose: state.purpose,
      concept: { ...state.selectedConcept, note: state.conceptNote },
    });
    const res = await createStructured(state.provider, state.apiKey, {
      model: state.model,
      system: prompt.system,
      messages: prompt.messages,
      schema: prompt.schema,
      effort: prompt.effort,
    });

    if (res.ok && res.data) {
      actions.addUsage(res.usage, estimateCost(state.provider, state.model, res.usage));
      const css = sanitizeThemeCss(res.data.css);
      // 글꼴은 노브로(테마가 고른 것을 폼에도 반영), 색·질감은 themeCss 로
      actions.setDetails({ ...actions.getState().details, bodyFont: res.data.bodyFont, headingFont: res.data.headingFont });
      actions.setTheme({ css, forKey: key });
    } else {
      toast?.('느낌을 입히지 못했습니다. 기본 모습으로 보여 줍니다', 'bad');
    }

    themeGenerating = false;
    drawView(actions.getState());
  }

  let lastDetails = null;
  let lastSample = null;
  let lastTheme = null;

  return {
    update(state) {
      // 기준선 없이 들어온 경우(용도 전). 처음으로 돌려보낸다
      if (!state.conceptDetails) {
        actions.go('E1');
        return;
      }

      $('purpose-note').textContent = state.purpose ? `용도: ${state.purpose}` : '';

      // 진입 시 한 번씩: 용도에 맞는 샘플 글, 고른 방향의 테마(look→CSS).
      // 끝나면 상태 변화로 update 가 다시 불리고, 그때 새 값으로 미리보기가 갱신된다.
      ensureSample(state);
      ensureTheme(state);

      if (state.details !== lastDetails) {
        lastDetails = state.details;
        drawForm(state);
        drawView(state);
      } else if (state.sample !== lastSample || state.themeCss !== lastTheme) {
        // 값은 그대로인데 샘플이나 테마만 바뀌면(생성 완료) 미리보기만 다시 그린다
        drawView(state);
      }
      lastSample = state.sample;
      lastTheme = state.themeCss;
    },
  };
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
