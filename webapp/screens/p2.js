/**
 * P2 실현 (생성형 뒷단, 2026-08-25 개편)
 *
 * P1 에서 확정한 컨셉을 받아, 그 컨셉의 "구조 + 색" 을 CSS 로 한 번 생성하고(디자인 실현)
 * 진짜 화면을 미리보기로 보여 준다. 생성 CSS 는 고정 골격 위에 얹혀 목록 배치·색·타이포를
 * 만든다(harness/theme-prompt.js buildDesignPrompt).
 *
 * 예전엔 여기서 노브(사이드바/목록형/글자크기…)를 손으로 만졌지만, 이제 그건 생성 CSS 가
 * 소유하고 세부 수정은 W1 대화로 한다. 그래서 폼을 걷어내고 미리보기 중심으로 바꿨다.
 *
 * 자리 배치
 *   왼쪽 대화   무엇을 만들었는지 알림 + 다시 만들기 / 이전으로
 *   캔버스      진짜 렌더 미리보기 (페이지 종류·데스크탑/모바일 전환)
 *
 * 화면 모듈 규약은 app/app.js 위쪽 주석에 있다.
 */

import { detailsToPreset } from '../harness/spec.js';
import { buildSkinHtml } from '../presets/base/skeleton.js';
import { renderPreview, PREVIEW_PAGES } from '../loop/render.js';
import { PREVIEW_EXTRA_CSS, mockFrom } from '../loop/mock-data.js';
import { buildSampleContentPrompt } from '../harness/sample-prompt.js';
import { buildDesignPrompt, sanitizeThemeCss } from '../harness/theme-prompt.js';
import { createStructured, estimateCost } from '../providers.js';

export function mount(root, ctx) {
  const { actions, shared, panes, toast } = ctx;

  let sampleBusy = false; // 미리보기 샘플 글을 만드는 중
  let designBusy = false; // 컨셉의 디자인(구조+색)을 만드는 중
  let designNotes = ''; // 생성이 무엇을 했는지 한 문장

  let pageType = 'tt-body-index';
  let mobile = false;

  /* ------------------------------------------------------------ 오른쪽 캔버스 */

  panes.canvasHead.innerHTML = `
    <select id="page"></select>
    <button id="desktop" class="sm on">데스크탑</button>
    <button id="mobile" class="sm">모바일</button>`;

  panes.canvasBody.className = 'canvas-body';
  panes.canvasBody.innerHTML = `
    <iframe class="preview" id="preview" title="미리보기"></iframe>
    <div id="preview-loading" class="preview-loading" hidden><span class="busy">화면을 만드는 중…</span></div>`;

  panes.foot.innerHTML = `
    <div class="composer">
      <input type="text" placeholder="다음 화면부터 말로 고칩니다" disabled>
      <div class="row">
        <span class="tiny dim">이 화면을 바탕으로 대화하며 다듬습니다</span>
        <span class="spacer"></span>
        <button class="primary" id="next">시작하기</button>
      </div>
    </div>`;

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
  panes.foot.querySelector('#next').addEventListener('click', () => actions.go('W1'));

  /* ------------------------------------------------------------ 왼쪽 알림 */

  function drawInfo(state) {
    const name = state.selectedConcept?.name || '내 스킨';
    root.innerHTML = `
      <div class="msg">
        <div class="msg-body">
          <span class="strong">${esc(name)}</span> 컨셉으로 화면을 만들었습니다.
          ${designNotes ? `<p class="small dim" style="margin:8px 0 0">${esc(designNotes)}</p>` : ''}
          <div class="msg-actions" style="margin-top:12px">
            <button class="sm" id="back">이전으로</button>
            <button class="sm" id="regen">다시 만들기</button>
          </div>
        </div>
      </div>
      <div class="msg sys">
        <div class="msg-body tiny dim">더 고칠 것은 다음 화면에서 말로 바꿉니다. 색·배치·글꼴 무엇이든.</div>
      </div>`;
    root.querySelector('#back').addEventListener('click', () => actions.go('P1'));
    root.querySelector('#regen').addEventListener('click', () => {
      designNotes = '';
      actions.setTheme({ css: '', forKey: '' }); // 비우면 update 가 다시 만든다
    });
  }

  /* ------------------------------------------------------------ 미리보기 */

  function drawView(state) {
    const frame = $('preview');
    const loadingEl = $('preview-loading');
    const key = state.selectedConcept ? actions.conceptKey(state.selectedConcept) : '';
    const loadingSample = sampleBusy && (!state.sample || state.sample.purpose !== state.purpose);
    const loadingDesign = designBusy && (!state.themeCss || state.themeFor !== key);
    if (loadingSample || loadingDesign) {
      if (loadingEl) {
        loadingEl.hidden = false;
        const busy = loadingEl.querySelector('.busy');
        if (busy) busy.textContent = loadingDesign ? '컨셉으로 화면을 만드는 중…' : '미리보기 글을 만드는 중…';
      }
      frame.hidden = true;
      return;
    }
    if (loadingEl) loadingEl.hidden = true;

    // 생성된 디자인 CSS(구조+색)를 골격 마지막에 얹는다. 목록은 중립 클래스(list-custom)라
    // base 규칙에 안 눌린다. 글꼴은 노브(details)로 흐른다.
    const preset = detailsToPreset(state.details, { uploadedFont: state.uploadedFont, themeCss: state.themeCss });
    const skin = buildSkinHtml(preset);
    frame.hidden = false;
    frame.srcdoc = renderPreview(skin, {
      pageType,
      css: shared.css,
      js: shared.js,
      extraCss: PREVIEW_EXTRA_CSS,
      mock: mockFrom(state.sample),
    });
    frame.classList.toggle('mobile', mobile);
    frame.style.height = 'calc(100vh - 150px)';
  }

  /* ------------------------------------------------------------ 생성 */

  /** 용도에 맞는 미리보기 샘플 글. 스킨이 아니라 미리보기 채움용이라 어긋나도 위험 없다. */
  async function ensureSample(state) {
    if (sampleBusy) return;
    if (!state.keyChecked || !state.purpose) return;
    if (state.sample && state.sample.purpose === state.purpose) return;

    sampleBusy = true;
    drawView(actions.getState());
    const prompt = buildSampleContentPrompt(state.purpose);
    const res = await createStructured(state.provider, state.apiKey, {
      model: state.model,
      system: prompt.system,
      messages: prompt.messages,
      schema: prompt.schema,
      effort: prompt.effort,
    });
    sampleBusy = false;
    if (res.ok && res.data) {
      actions.addUsage(res.usage, estimateCost(state.provider, state.model, res.usage));
      actions.setSample({ purpose: state.purpose, ...res.data });
    } else {
      toast?.('샘플 글을 만들지 못했습니다. 기본 예시로 보여 줍니다', 'bad');
      drawView(actions.getState());
    }
  }

  /**
   * 고른 컨셉의 "구조 + 색" 을 CSS 로 한 번 생성한다(디자인 실현).
   *
   * 컨셉이 바뀌면(themeFor 키 불일치) 다시 만든다. 생성이 응답한 사이드바 위치와 글꼴은
   * 골격/폰트 시스템이 맡도록 details 로, 배치·색·타이포는 themeCss 로 간다.
   */
  async function ensureDesign(state) {
    if (designBusy) return;
    if (!state.keyChecked || !state.selectedConcept) return;
    const key = actions.conceptKey(state.selectedConcept);
    if (state.themeCss && state.themeFor === key) return;

    designBusy = true;
    drawView(actions.getState());
    const prompt = buildDesignPrompt({ purpose: state.purpose, concept: state.selectedConcept });
    const res = await createStructured(state.provider, state.apiKey, {
      model: state.model,
      system: prompt.system,
      messages: prompt.messages,
      schema: prompt.schema,
      effort: prompt.effort,
    });
    designBusy = false;

    if (res.ok && res.data) {
      actions.addUsage(res.usage, estimateCost(state.provider, state.model, res.usage));
      const css = sanitizeThemeCss(res.data.css);
      const sidebar = ['left', 'right', 'none'].includes(res.data.sidebar)
        ? res.data.sidebar
        : actions.getState().details.sidebar;
      actions.setDetails({
        ...actions.getState().details,
        sidebar,
        bodyFont: res.data.bodyFont,
        headingFont: res.data.headingFont,
      });
      designNotes = res.data.notes || '';
      actions.setTheme({ css, forKey: key });
      drawInfo(actions.getState());
    } else {
      toast?.('화면을 만들지 못했습니다. 다시 시도해 주세요', 'bad');
    }
    drawView(actions.getState());
  }

  /* ------------------------------------------------------------ */

  let lastSample = null;
  let lastTheme = null;
  let lastDetails = null;
  let infoDrawn = false;

  return {
    update(state) {
      // 컨셉 확정 없이 들어온 경우. 앞 화면으로 돌려보낸다
      if (!state.selectedConcept) {
        actions.go('P1');
        return;
      }
      if (!infoDrawn) {
        infoDrawn = true;
        drawInfo(state);
      }

      ensureSample(state);
      ensureDesign(state);

      if (state.sample !== lastSample || state.themeCss !== lastTheme || state.details !== lastDetails) {
        lastSample = state.sample;
        lastTheme = state.themeCss;
        lastDetails = state.details;
        drawView(state);
      }
    },
  };
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
