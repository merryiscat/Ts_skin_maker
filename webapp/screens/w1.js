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
 *   왼쪽 대화   지시와 응답(버전 이력). 앞 단계와 같은 자리다
 *   캔버스      미리보기(비교 모드면 이전·지금 버전을 위아래로)
 *
 * 편집(요소 선택·채팅)마다 대화에 스냅샷이 쌓여 버전(ver 0.1, 0.2 …)이 된다. "비교" 로
 * 이전 버전과 나란히 견주고, 각 버전은 "이 버전으로 되돌리기" 로 돌아갈 수 있다.
 */

import { detailsToPreset, validateDetails } from '../harness/spec.js';
import { buildStyleEditPrompt } from '../harness/edit-prompt.js';
import { buildSampleContentPrompt } from '../harness/sample-prompt.js';
import { sanitizeThemeCss } from '../harness/theme-prompt.js';
import { auditPlaceholders, auditGroupTags } from '../harness/contract.js';
import { checkPitfalls } from '../harness/pitfalls.js';
import { buildSkinHtml, buildIndexXml } from '../presets/base/skeleton.js';
import { FONT_CATALOG } from '../presets/base/fonts.js';
import { renderPreview, PREVIEW_PAGES } from '../loop/render.js';
import { PREVIEW_EXTRA_CSS, mockFrom } from '../loop/mock-data.js';
import { createStructured, estimateCost, PROVIDERS } from '../providers.js';

/** 버전 번호 라벨. 1→0.1, 9→0.9, 10→1.0. 편집할 때마다 하나씩 올라간다. */
function verLabel(i) {
  return `${Math.floor(i / 10)}.${i % 10}`;
}

export function mount(root, ctx) {
  const { actions, shared, toast, panes, scrollChat } = ctx;

  // 화면 안에서만 쓰는 표시 상태. 상태 저장소에 넣지 않는다. 새로고침하면 사라져도 되는 것들이다
  let pageType = 'tt-body-index';
  let mobileFrame = false;
  let compareOn = false; // 이전 버전과 나란히 비교 중
  let base = null; // 이 화면에 들어왔을 때의 첫 버전(ver 0.1) 스냅샷 { details, themeCss }
  let selectMode = false; // 미리보기에서 요소를 집는 중
  let pickHandlers = null; // 미리보기 iframe 문서에 단 선택 리스너들(뗄 때 씀)
  let pendingImage = null; // 캡처+표시한 이미지(data URL). 다음 지시에 함께 보낸다
  let annotateEl = null; // 표시(그리기) 모달 요소. 열려 있으면 이것
  let fontPanelEl = null; // 글꼴 고르기 모달. 열려 있으면 이것
  let fontsInjected = false; // 샘플용 글꼴 CSS 를 문서에 넣었는지(한 번만)
  let sampleBusy = false; // 용도에 맞는 예시 글을 만드는 중(미리보기 채움)

  // 검증에 걸린 뒤 "그냥 두기" 를 고른 것. 기록은 남기되 버튼만 접는다.
  // 순번이 아니라 항목 자체를 기억한다. 되돌리기가 대화를 자르면 순번은 다른 것을 가리킨다
  const dismissed = new WeakSet();

  // 중단을 누르면 이 번호가 올라간다. 늦게 도착한 응답은 자기 번호로 자기가 버려진 것을 안다
  let reqSeq = 0;

  let files = null;
  let audit = { ok: true, problems: [] };

  /* ------------------------------------------------------- 대화 아래 발판 */

  // 미리보기를 가리켜 지시를 만드는 도구(요소 선택·그리기)와 모바일 보기는 입력창 옆에 둔다.
  // 이것들은 결국 텍스트 박스로 들어갈 지시를 돕는 것이라, 오른쪽 머리에 흩어 두지 않는다
  // (2026-08-30 피드백: 화면 구성 정리 + 텍스트 박스에 모바일 같이).
  panes.foot.innerHTML = `
    <div class="composer">
      <textarea id="input" rows="2" placeholder="바꿀 내용을 적으세요. 엔터로 보냅니다"></textarea>
      <div class="row" style="gap:6px;margin:2px 0 6px;flex-wrap:wrap">
        <button class="sm accent" id="pick" title="미리보기에서 고칠 요소를 클릭해 지시에 넣습니다">요소 선택</button>
        <button class="sm accent" id="capture" title="미리보기를 캡처해 손으로 표시한 뒤 이미지로 함께 보냅니다">그리기</button>
        <button class="sm accent" id="mobile" title="미리보기를 모바일 폭으로 봅니다">모바일</button>
        <button class="sm accent" id="font" title="글꼴을 모양을 보며 고르거나 파일로 올립니다">글꼴</button>
        <span class="badge ok" id="img-note" hidden>이미지 첨부됨</span>
        <button class="sm ghost" id="img-clear" hidden>첨부 지우기</button>
      </div>
      <div class="row">
        <span class="busy" id="busy" hidden>고치는 중</span>
        <button class="sm" id="stop" hidden>중단</button>
        <button class="sm ghost" id="toconcept" title="이전(컨셉) 화면으로">이전으로</button>
        <button class="sm ghost" id="reset" title="대화를 모두 지우고 처음 상태로">처음으로</button>
        <span class="spacer"></span>
        <button class="sm" id="download" title="편집을 마치고 내려받기 화면으로">완성하기</button>
        <button class="primary sm" id="send" title="지시를 보냅니다 (엔터)">전송</button>
      </div>
    </div>`;

  /* ------------------------------------------------------------ 오른쪽 */

  panes.canvasHead.innerHTML = `
    <span class="badge" id="verdict" title="티스토리 치환자·그룹 태그·함정 검사 결과"></span>
    <span class="badge accent" id="ver" hidden></span>
    <select id="page" class="accent" title="미리보기로 볼 페이지 종류를 고릅니다"></select>
    <button class="sm accent" id="compare" title="이전 버전과 나란히 비교" hidden>비교</button>`;

  panes.canvasBody.className = 'canvas-body';
  panes.canvasBody.innerHTML = '<iframe class="preview" id="preview" title="미리보기"></iframe>';

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

  // 이전 버전과 나란히 비교. 편집(요소 선택·채팅)으로 만들어진 버전들을 위아래로 견준다.
  $('compare').addEventListener('click', () => {
    compareOn = !compareOn;
    if (compareOn && selectMode) {
      // 비교 중엔 요소 선택을 끈다(단일 미리보기가 사라져 집을 대상이 없다).
      selectMode = false;
      reflectPick();
      clearPick();
    }
    drawView(actions.getState());
  });

  /* ---------------------------------------------------- 요소 선택(미리보기) */

  /*
   * 미리보기에서 요소를 집어 채팅으로 넘긴다. 클로드 디자인 피드백처럼 "이 부분" 을 손으로
   * 가리켜 지시하게 한다. 미리보기는 same-origin srcdoc 이라 부모에서 contentDocument 에
   * 리스너를 달 수 있다. 집은 요소의 "겨냥할 수 있는 클래스"(.card-title 등)를 입력줄에 [선택: …]
   * 로 넣으면, 모델이 그 클래스를 겨냥해 고친다(edit-prompt 에 그 규약을 적어 둠).
   */
  $('pick').addEventListener('click', () => {
    if (compareOn) return;
    selectMode = !selectMode;
    reflectPick();
    if (selectMode) applyPick();
    else clearPick();
  });

  function reflectPick() {
    const b = $('pick');
    b.classList.toggle('on', selectMode);
    b.textContent = selectMode ? '선택 끄기' : '요소 선택';
  }

  function clearPick() {
    if (!pickHandlers) return;
    const { doc, over, click, styleEl } = pickHandlers;
    try {
      doc.removeEventListener('mouseover', over, true);
      doc.removeEventListener('click', click, true);
      styleEl?.remove?.();
      doc.querySelectorAll?.('.__pick-on').forEach((el) => el.classList.remove('__pick-on'));
    } catch {
      // 문서가 이미 갈렸으면(재렌더) 리스너도 같이 사라졌다. 무시한다
    }
    pickHandlers = null;
  }

  function applyPick() {
    clearPick();
    const frame = $('preview');
    const doc = frame && frame.contentDocument;
    if (!doc || !doc.body) return;
    const styleEl = doc.createElement('style');
    styleEl.textContent =
      '.__pick-on{outline:2px solid #2f6f4f!important;outline-offset:-2px;cursor:pointer;background:rgba(47,111,79,.06)!important;}';
    (doc.head || doc.body).appendChild(styleEl);
    let cur = null;
    const over = (e) => {
      const info = pickInfo(e.target);
      const el = info && info.el;
      if (cur && cur !== el) cur.classList.remove('__pick-on');
      cur = el || null;
      if (el) el.classList.add('__pick-on');
    };
    const click = (e) => {
      const info = pickInfo(e.target);
      if (!info) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      insertPick(info);
      selectMode = false;
      reflectPick();
      clearPick();
      $('input').focus();
    };
    doc.addEventListener('mouseover', over, true);
    doc.addEventListener('click', click, true);
    pickHandlers = { doc, over, click, styleEl };
  }

  /** 집은 요소 참조를 입력줄 앞에 넣는다. 라벨 + 겨냥 클래스 + 짧은 텍스트. */
  function insertPick(info) {
    const raw = (info.el.innerText || info.el.textContent || '').replace(/\s+/g, ' ').trim();
    const text = raw.slice(0, 24);
    const ref = `[선택: ${info.label} ${info.cls}${text ? ` "${text}${raw.length > 24 ? '…' : ''}"` : ''}] `;
    const ta = $('input');
    ta.value = ref + ta.value;
    try {
      ta.setSelectionRange(ta.value.length, ta.value.length);
    } catch {
      // 일부 브라우저에서 커서 이동이 막혀도 값은 들어갔으니 괜찮다
    }
  }

  /* ------------------------------------------------ 캡처 + 표시(그리기) */

  /*
   * 미리보기를 이미지로 굳혀 그 위에 손으로 표시하고, 다음 지시에 비전으로 함께 보낸다.
   * 캡처는 라이브러리 없이 SVG foreignObject 로 한다 - 미리보기가 same-origin 이라 문서를
   * 통째로 SVG 안에 넣어 이미지로 그린다. 외부 폰트/CSS(구글폰트 등)는 이미지로 뜰 때 안
   * 불러와져 폴백되지만, 레이아웃·색·표시는 잡히므로 "여기를 고쳐줘" 용도엔 충분하다.
   */
  $('capture').addEventListener('click', openAnnotate);
  $('img-clear').addEventListener('click', () => {
    pendingImage = null;
    reflectImage();
  });

  function reflectImage() {
    $('img-note').hidden = !pendingImage;
    $('img-clear').hidden = !pendingImage;
  }

  /** 미리보기 iframe 의 보이는 부분을 PNG data URL 로. 실패하면 null. */
  function captureIframe() {
    return new Promise((resolve) => {
      try {
        const frame = $('preview');
        const doc = frame && frame.contentDocument;
        if (!doc || !doc.documentElement) return resolve(null);
        const w = frame.clientWidth;
        const h = frame.clientHeight;
        const scEl = doc.scrollingElement || doc.documentElement;
        const sx = scEl.scrollLeft || 0;
        const sy = scEl.scrollTop || 0;
        const fullW = Math.max(scEl.scrollWidth || w, w);
        const fullH = Math.max(scEl.scrollHeight || h, h);
        let xml = new XMLSerializer().serializeToString(doc.documentElement);
        // foreignObject 안은 XHTML 이어야 렌더된다. 루트에 네임스페이스가 없으면 넣어 준다.
        if (!/\bxmlns=/.test(xml.slice(0, 300))) {
          xml = xml.replace(/^<html/i, '<html xmlns="http://www.w3.org/1999/xhtml"');
        }
        const svg =
          `<svg xmlns="http://www.w3.org/2000/svg" width="${fullW}" height="${fullH}">` +
          `<foreignObject x="0" y="0" width="${fullW}" height="${fullH}">${xml}</foreignObject></svg>`;
        const img = new Image();
        img.onload = () => {
          try {
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            const ctx = c.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, sx, sy, w, h, 0, 0, w, h); // 보이는 부분만 잘라 그린다
            resolve(c.toDataURL('image/png'));
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      } catch {
        resolve(null);
      }
    });
  }

  function openAnnotate() {
    if (compareOn) return;
    captureIframe().then((shot) => {
      if (!shot) {
        toast?.('미리보기를 캡처하지 못했습니다. 다시 시도해 주세요.', 'bad');
        return;
      }
      showAnnotate(shot);
    });
  }

  /** 캡처 이미지를 띄우고 그 위에 그리게 한다. "이 이미지로" 를 누르면 합쳐 pendingImage 로. */
  function showAnnotate(shotUrl) {
    closeAnnotate();
    const base = new Image();
    base.onerror = () => toast?.('캡처 이미지를 여는 데 실패했습니다.', 'bad');
    base.onload = () => {
      const overlay = document.createElement('div');
      overlay.setAttribute(
        'style',
        'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.55);display:flex;' +
          'flex-direction:column;align-items:center;justify-content:center;padding:24px;gap:12px',
      );
      overlay.innerHTML =
        '<div style="color:#fff;font-size:13px">고칠 곳을 마우스로 표시하세요 (동그라미·화살표 등).</div>' +
        '<div style="max-width:92vw;max-height:74vh;overflow:auto;background:#fff;border-radius:8px">' +
        '<canvas id="annotate-canvas" style="display:block;max-width:100%;touch-action:none;cursor:crosshair"></canvas>' +
        '</div>' +
        '<div class="row" style="gap:8px">' +
        '<button class="sm" id="annotate-clear">표시 지우기</button>' +
        '<button class="sm ghost" id="annotate-cancel">취소</button>' +
        '<button class="primary sm" id="annotate-done">이 이미지로</button>' +
        '</div>';
      document.body.appendChild(overlay);
      annotateEl = overlay;

      const canvas = overlay.querySelector('#annotate-canvas');
      canvas.width = base.naturalWidth || base.width;
      canvas.height = base.naturalHeight || base.height;
      const ctx = canvas.getContext('2d');
      const redraw = () => ctx.drawImage(base, 0, 0);
      redraw();
      ctx.strokeStyle = '#e4573d';
      ctx.lineWidth = Math.max(3, Math.round(canvas.width / 320));
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      let drawing = false;
      const at = (e) => {
        const r = canvas.getBoundingClientRect();
        const p = e.touches ? e.touches[0] : e;
        return { x: (p.clientX - r.left) * (canvas.width / r.width), y: (p.clientY - r.top) * (canvas.height / r.height) };
      };
      const start = (e) => {
        drawing = true;
        const { x, y } = at(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        e.preventDefault();
      };
      const move = (e) => {
        if (!drawing) return;
        const { x, y } = at(e);
        ctx.lineTo(x, y);
        ctx.stroke();
        e.preventDefault();
      };
      const end = () => {
        drawing = false;
      };
      canvas.addEventListener('mousedown', start);
      canvas.addEventListener('mousemove', move);
      window.addEventListener('mouseup', end);
      canvas.addEventListener('touchstart', start, { passive: false });
      canvas.addEventListener('touchmove', move, { passive: false });
      canvas.addEventListener('touchend', end);
      overlay._cleanup = () => window.removeEventListener('mouseup', end);

      overlay.querySelector('#annotate-clear').addEventListener('click', redraw);
      overlay.querySelector('#annotate-cancel').addEventListener('click', closeAnnotate);
      overlay.querySelector('#annotate-done').addEventListener('click', () => {
        try {
          pendingImage = canvas.toDataURL('image/png');
        } catch {
          pendingImage = null;
        }
        closeAnnotate();
        reflectImage();
        if (pendingImage) toast?.('이미지를 첨부했습니다. 지시를 적고 보내기.', 'ok');
      });
    };
    base.src = shotUrl;
  }

  function closeAnnotate() {
    if (!annotateEl) return;
    annotateEl._cleanup?.();
    annotateEl.remove();
    annotateEl = null;
  }

  /* ------------------------------------------------------ 글꼴 고르기(갤러리) */

  /*
   * 글꼴을 이름만 나열하면 어떤 모양인지 알 수 없다(피드백). 카탈로그를 각 글꼴의 실제
   * 모양으로 보여 주고, 클릭으로 본문/제목에 적용한다. 파일 업로드도 여기서 받는다.
   * 샘플을 그리려면 그 글꼴의 웹폰트가 이 앱 문서에도 있어야 하므로, 패널을 처음 열 때
   * 카탈로그의 CDN 스타일시트를 문서 <head> 에 한 번 넣는다(무겁지만 사용자가 연 순간뿐).
   */
  $('font').addEventListener('click', openFontPanel);

  function injectSampleFonts() {
    if (fontsInjected) return;
    fontsInjected = true;
    const seen = new Set();
    for (const f of FONT_CATALOG) {
      if (!f.url || seen.has(f.url)) continue;
      seen.add(f.url);
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = f.url;
      document.head.appendChild(link);
    }
  }

  /** 올린 글꼴 @font-face 를 문서에 넣어 패널에서도 샘플이 보이게 한다. */
  function injectUploadedSample(font) {
    let s = document.getElementById('w1-uploaded-font');
    if (!font) {
      s?.remove();
      return;
    }
    if (!s) {
      s = document.createElement('style');
      s.id = 'w1-uploaded-font';
      document.head.appendChild(s);
    }
    s.textContent = font.css || '';
  }

  function closeFontPanel() {
    if (!fontPanelEl) return;
    fontPanelEl.remove();
    fontPanelEl = null;
  }

  function openFontPanel() {
    injectSampleFonts();
    const up0 = actions.getState().uploadedFont;
    if (up0) injectUploadedSample(up0);
    closeFontPanel();

    let target = 'bodyFont'; // 본문 또는 제목
    const overlay = document.createElement('div');
    overlay.setAttribute(
      'style',
      'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:24px',
    );
    overlay.innerHTML =
      '<div style="background:#fff;color:var(--text);width:min(600px,94vw);max-height:86vh;display:flex;flex-direction:column;border-radius:12px;overflow:hidden;border:1px solid var(--border)">' +
      '<div class="panel-head">글꼴 <span class="spacer"></span><button class="sm ghost" id="font-close">닫기</button></div>' +
      '<div class="row" style="gap:8px;padding:10px 14px;border-bottom:1px solid var(--border);align-items:center;flex-wrap:wrap">' +
      '<span class="tiny dim">적용 대상</span>' +
      '<button class="sm" id="t-body">본문</button>' +
      '<button class="sm" id="t-head">제목</button>' +
      '<span class="spacer"></span>' +
      '<button class="sm ghost" id="font-upload">글꼴 파일 올리기</button>' +
      '<input type="file" id="font-file" accept=".woff2,.woff,.ttf,.otf" hidden>' +
      '</div>' +
      '<div id="font-list" style="overflow:auto;padding:8px 14px 16px"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    fontPanelEl = overlay;

    const listEl = overlay.querySelector('#font-list');
    const tBody = overlay.querySelector('#t-body');
    const tHead = overlay.querySelector('#t-head');

    const pickFont = (id) => {
      const d = actions.getState().details;
      actions.setDetails({ ...d, [target]: id });
      renderList();
    };

    const renderList = () => {
      const d = actions.getState().details;
      const up = actions.getState().uploadedFont;
      const cur = target === 'headingFont' ? d.headingFont : d.bodyFont;
      tBody.classList.toggle('on', target === 'bodyFont');
      tHead.classList.toggle('on', target === 'headingFont');

      let html = '';
      // 제목은 "본문과 같게" 를 맨 위에 둔다(headingFont='same').
      if (target === 'headingFont') {
        html += fontRowHtml({ id: 'same', label: '본문과 같게', family: 'inherit' }, cur, '가나다 ABC 123');
      }
      if (up) {
        html += `<div class="tiny dim" style="margin:8px 0 4px">내 글꼴</div>`;
        html += fontRowHtml({ id: 'uploaded', label: up.name || '내 올린 글꼴', family: up.family }, cur);
      }
      for (const cat of [...new Set(FONT_CATALOG.map((f) => f.cat))]) {
        html += `<div class="tiny dim" style="margin:10px 0 4px">${esc(cat)}</div>`;
        for (const f of FONT_CATALOG.filter((x) => x.cat === cat)) html += fontRowHtml(f, cur);
      }
      listEl.innerHTML = html;
      for (const b of listEl.querySelectorAll('[data-font]')) {
        b.addEventListener('click', () => pickFont(b.dataset.font));
      }
    };

    tBody.addEventListener('click', () => {
      target = 'bodyFont';
      renderList();
    });
    tHead.addEventListener('click', () => {
      target = 'headingFont';
      renderList();
    });
    overlay.querySelector('#font-close').addEventListener('click', closeFontPanel);

    const fileInput = overlay.querySelector('#font-file');
    overlay.querySelector('#font-upload').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      const f = fileInput.files && fileInput.files[0];
      if (!f) return;
      const font = await readFontFile(f);
      if (!font) {
        toast?.('글꼴 파일을 읽지 못했습니다.', 'bad');
        return;
      }
      injectUploadedSample(font);
      actions.setUploadedFont(font);
      // 올린 글꼴은 본문에만 임베드된다(spec.js). 본문으로 적용하고 대상도 본문으로.
      target = 'bodyFont';
      actions.setDetails({ ...actions.getState().details, bodyFont: 'uploaded' });
      renderList();
      toast?.('올린 글꼴을 본문에 적용했습니다.', 'ok');
    });

    renderList();
  }

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

  // 무드·색을 다시 잡고 싶을 때 컨셉(C1)으로 돌아간다. 대화·세부는 상태에 남아 있어
  // 다시 W1 로 오면 그대로 이어진다.
  $('toconcept').addEventListener('click', () => actions.go('C1'));

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
    const typed = String(raw || '').trim();
    const state = actions.getState();
    if (state.busy) return;
    // 이미지만 첨부하고 지시를 안 적었으면 기본 지시를 붙인다.
    if (!typed && !pendingImage) return;
    const message = typed || '표시한 부분을 고쳐 주세요.';

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
    // 첨부 이미지는 이번 지시에 실어 보내고 비운다(한 번만 쓴다).
    const image = pendingImage;
    pendingImage = null;
    reflectImage();
    // 최근 대화는 이번 지시를 넣기 전에 뽑는다. 넣고 뽑으면 방금 것이 두 번 들어간다
    const recentTurns = conversationTurns(state.chat);
    actions.pushChat({ role: 'user', text: message, hasImage: !!image });
    await run(message, recentTurns, image);
  }

  /** 같은 지시를 다시 보낸다. 검증에 걸렸을 때 사용자가 직접 고른 경우에만 부른다. */
  async function retry(message) {
    const state = actions.getState();
    if (state.busy) return;
    actions.pushChat({ role: 'user', text: message });
    await run(message, conversationTurns(state.chat));
  }

  async function run(message, recentTurns, image) {
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

    // 첨부 이미지는 이번 지시(마지막 user 메시지)에 실어 비전으로 보낸다.
    if (image && prompt.messages && prompt.messages.length) {
      const i = prompt.messages.length - 1;
      prompt.messages[i] = { ...prompt.messages[i], image };
    }

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

  /**
   * 용도에 맞는 미리보기 예시 글을 보장한다. C1 이 만들어 오지만, 실패했거나 용도가
   * 바뀌었으면(요리인데 개발 예시가 뜨는 경우) 여기서 다시 만든다. 스킨이 아니라 미리보기
   * 채움이라 어긋나도 위험 없다. sample 이 채워지면 update 의 lastSample 감지로 다시 그린다.
   */
  async function ensureSample(state) {
    if (sampleBusy || !state.keyChecked || !state.purpose) return;
    if (state.sample && state.sample.purpose === state.purpose) return;
    sampleBusy = true;
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
    }
  }

  /** 산출물 네 개. 미리보기, 코드 열람, 검증이 전부 같은 묶음을 본다. */
  function makeFiles(details, state) {
    const name = state.selectedConcept?.name || '내 스킨';
    const preset = detailsToPreset(details, { name, uploadedFont: state.uploadedFont, themeCss: state.themeCss });
    return {
      'skin.html': buildSkinHtml(preset),
      'style.css': shared.css,
      'images/script.js': shared.js,
      'index.xml': buildIndexXml(preset, { name }),
    };
  }

  /** 지금 화면에 들어온 뒤로 쌓인 버전들. 첫 버전(base) + 편집마다 남은 스냅샷. */
  function versionList(state) {
    const out = [];
    if (base) out.push(base);
    for (const e of state.chat) {
      if (e.role === 'assistant' && e.details) out.push({ details: e.details, themeCss: e.themeCss });
    }
    return out;
  }

  /** 한 스냅샷(details+themeCss)을 미리보기 srcdoc 으로. */
  function snapshotSrcdoc(details, themeCss, state) {
    const name = state.selectedConcept?.name || '내 스킨';
    const preset = detailsToPreset(details, { name, uploadedFont: state.uploadedFont, themeCss });
    return renderPreview(buildSkinHtml(preset), {
      pageType,
      css: shared.css,
      js: shared.js,
      extraCss: PREVIEW_EXTRA_CSS,
      mock: mockFrom(state.sample),
    });
  }

  function drawView(state) {
    files = makeFiles(state.details, state);

    const problems = verify(state.details, files);
    audit = { ok: problems.length === 0, problems };

    const v = $('verdict');
    v.textContent = audit.ok ? '티스토리 검증 통과' : '티스토리 검증 실패';
    v.className = 'badge ' + (audit.ok ? 'ok' : 'bad');
    v.title = audit.ok
      ? '치환자·그룹 태그·함정 검사를 모두 통과했습니다'
      : '걸린 것: ' + (audit.problems[0] || '검사 실패');

    // 버전 뱃지·비교 버튼. 편집이 두 개 이상 쌓여야 비교가 의미 있다.
    const vers = versionList(state);
    const cur = vers.length;
    $('ver').textContent = cur ? 'ver ' + verLabel(cur) : '';
    $('ver').hidden = !cur;
    $('compare').hidden = cur < 2;
    $('compare').classList.toggle('on', compareOn);

    // 비교 모드: 이전 버전과 지금 버전을 위아래로.
    if (compareOn && cur >= 2) {
      const prev = vers[cur - 2];
      const now = vers[cur - 1];
      const cards = [
        { label: `ver ${verLabel(cur - 1)} · 이전`, snap: prev },
        { label: `ver ${verLabel(cur)} · 지금`, snap: now },
      ];
      panes.canvasBody.innerHTML =
        '<div style="display:flex;flex-direction:column;gap:14px">' +
        cards
          .map(
            (c, i) =>
              `<div class="card" style="padding:0;overflow:hidden">
                <div style="padding:8px 12px;border-bottom:1px solid var(--border)"><span class="strong">${esc(c.label)}</span></div>
                <iframe data-cmp="${i}" title="${esc(c.label)}" style="width:100%;height:70vh;border:0;background:#fff;display:block"></iframe>
              </div>`,
          )
          .join('') +
        '</div>';
      const frames = panes.canvasBody.querySelectorAll('iframe[data-cmp]');
      frames.forEach((f, i) => {
        f.srcdoc = snapshotSrcdoc(cards[i].snap.details, cards[i].snap.themeCss, state);
      });
      return;
    }

    // 단일 미리보기. 비교에서 돌아왔으면 iframe 을 다시 만든다.
    let frame = panes.canvasBody.querySelector('#preview');
    if (!frame) {
      panes.canvasBody.innerHTML = '<iframe class="preview" id="preview" title="미리보기"></iframe>';
      frame = panes.canvasBody.querySelector('#preview');
    }
    // 미리보기가 새로 로드되면(편집·페이지 전환 등) 선택 모드였을 때 리스너를 다시 단다.
    frame.onload = () => {
      if (selectMode) applyPick();
    };
    frame.srcdoc = snapshotSrcdoc(state.details, state.themeCss, state);
    frame.classList.toggle('mobile', mobileFrame);
    frame.style.height = 'calc(100vh - 150px)';
  }

  /** 대화를 통째로 다시 그린다. 입력칸은 발판에 있어서 포커스가 날아가지 않는다. */
  function drawChat(state) {
    const name = state.selectedConcept?.name || '지금 값';
    const intro =
      `<div class="msg sys"><div class="msg-body"><span class="badge accent">ver ${verLabel(1)}</span> ` +
      `${esc(name)} 으로 시작합니다. 바꾸고 싶은 것을 말해 주세요.</div></div>`;

    // 편집(details 를 남긴 응답)마다 버전이 하나씩 올라간다. base 가 ver 0.1.
    let ver = 1;
    const body = state.chat
      .map((e, i) => {
        const isEdit = e.role === 'assistant' && e.details;
        if (isEdit) ver += 1;
        return entryHtml(e, i, isEdit ? verLabel(ver) : null);
      })
      .join('');
    root.innerHTML = intro + body;
    // 새 응답은 아래에 쌓인다. 사용자가 매번 굴려 내리게 두지 않는다
    scrollChat?.();
  }

  function entryHtml(e, i, ver) {
    // 이름표(나/응답)는 두지 않는다 - 말풍선 좌우로 화자를 안다. 앞 단계의
    // 대화와 같은 결로 이어지게 (2026-08-23: 전체 흐름을 하나의 연속 대화로)
    if (e.role === 'user') {
      const img = e.hasImage
        ? '<span class="tiny dim" style="display:block;margin-top:4px">표시 이미지 첨부</span>'
        : '';
      return `<div class="msg user"><div class="msg-body">${esc(e.text)}${img}</div></div>`;
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
      const tag = ver ? `<span class="badge accent">ver ${ver}</span> ` : '';
      return (
        `<div class="msg"><div class="msg-body">` +
        `${tag}${esc(e.text)}` +
        (list ? `<ul class="list marked">${list}</ul>` : '') +
        `<div class="msg-actions"><button class="sm" data-rewind="${i}">이 버전으로 되돌리기</button></div>` +
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

  /* ---------------------------------------------------------- 갱신 */

  let lastDetails = null;
  let lastChat = null;
  let lastError = null;
  let lastSample = null;

  return {
    unmount() {
      // root 는 셸의 것이라 화면이 바뀌어도 살아 있다. 뗀 만큼만 사라진다
      root.removeEventListener('click', onChatClick);
      // 미리보기 문서에 단 선택 리스너도 뗀다(문서가 갈리면 자동으로 죽지만 안전하게)
      clearPick();
      // 모달들이 열려 있으면 닫는다(document.body 에 붙어 화면 밖에 남는다)
      closeAnnotate();
      closeFontPanel();
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

      // 이 화면에 들어왔을 때의 상태가 첫 버전(ver 0.1)이다. 편집마다 대화에 스냅샷이 쌓여 버전이 는다.
      if (base === null) base = { details: state.details, themeCss: state.themeCss };

      // 용도에 맞는 예시 글이 없으면 채운다(C1 에서 못 만들었어도 여기서 보장).
      ensureSample(state);

      $('busy').hidden = !state.busy;
      $('stop').hidden = !state.busy;
      $('input').disabled = state.busy;
      $('send').disabled = state.busy;
      $('reset').disabled = state.busy || !state.chat.length;

      if (state.chat !== lastChat) {
        lastChat = state.chat;
        drawChat(state);
      }

      // 미리보기는 값이 바뀔 때만 다시 그린다. 생성 중에 비우면 무엇을 만들던
      // 중이었는지 잃는다. 예시 글(sample)은 C1 에서 만들어 오는데, 늦게 도착하면
      // 그때 한 번 다시 그려 용도에 맞는 예시가 미리보기에 들어가게 한다.
      if (state.details !== lastDetails || state.sample !== lastSample) {
        lastDetails = state.details;
        lastSample = state.sample;
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

/** 글꼴 한 줄. 라벨 + 그 글꼴로 그린 샘플. 고른 것이면 강조(.selected). */
function fontRowHtml(f, cur, sample) {
  const on = f.id === cur;
  const text = sample || '다람쥐 헌 쳇바퀴 타고파 AaGg 123';
  return (
    `<button type="button" class="card pick${on ? ' selected' : ''}" data-font="${esc(f.id)}" ` +
    `style="display:block;width:100%;text-align:left;padding:8px 10px;margin-bottom:6px;cursor:pointer">` +
    `<span class="tiny dim">${esc(f.label)}</span>` +
    `<div style="font-family:${f.family};font-size:18px;line-height:1.4;margin-top:2px">${esc(text)}</div>` +
    `</button>`
  );
}

/** 올린 글꼴 파일을 @font-face(data URL) 로 만든다. detail-form 의 것과 같은 규약. */
function readFontFile(file) {
  const fmt =
    { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' }[
      (file.name.split('.').pop() || '').toLowerCase()
    ] || '';
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => {
      const dataUrl = reader.result;
      const css =
        `@font-face{font-family:'UploadedFont';` +
        `src:url(${dataUrl})${fmt ? ` format('${fmt}')` : ''};font-display:swap;}`;
      resolve({ name: file.name, family: "'UploadedFont', sans-serif", css });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * 겨냥할 수 있는 클래스와 사람이 읽을 라벨. theme-prompt 의 CLASS_HOOKS 와 같은 손잡이다.
 * 안쪽(구체적)일수록 앞에 둔다 - 집은 자리에서 위로 올라가며 처음 만나는 것을 고른다.
 */
const PICK_HOOKS = [
  ['card-title', '글 제목'],
  ['post-title', '글 상세 제목'],
  ['card-summary', '요약'],
  ['card-cat', '카테고리 라벨'],
  ['card-meta', '날짜·카테고리 줄'],
  ['card-thumb', '썸네일'],
  ['card-body', '카드 본문'],
  ['card', '글 카드'],
  ['site-title', '블로그 제목'],
  ['top-nav', '헤더 메뉴'],
  ['site-header', '상단 헤더'],
  ['side-title', '사이드바 제목'],
  ['sidebar', '사이드바'],
  ['tag', '태그'],
  ['paging', '페이지 번호'],
  ['article-content', '본문'],
  ['site-footer', '푸터'],
  ['main-inner', '글 목록'],
];

/**
 * 집은 자리에서 위로 올라가며 겨냥 가능한 훅 클래스를 찾는다. 없으면 클릭한 요소 자체를
 * 일반 참조(태그/첫 클래스)로 돌려준다. body/html 은 무시한다.
 */
function pickInfo(start) {
  let el = start && start.nodeType === 1 ? start : start && start.parentElement;
  while (el && el.nodeType === 1 && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
    if (el.classList) {
      for (const [cls, label] of PICK_HOOKS) {
        if (el.classList.contains(cls)) return { el, cls: '.' + cls, label };
      }
    }
    el = el.parentElement;
  }
  const self = start && start.nodeType === 1 ? start : start && start.parentElement;
  if (!self || self.tagName === 'BODY' || self.tagName === 'HTML') return null;
  const first = self.className ? String(self.className).trim().split(/\s+/)[0] : '';
  return { el: self, cls: first ? '.' + first : self.tagName.toLowerCase(), label: '요소' };
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
