/**
 * 공유 스크립트
 *
 * 의존성 없음. defer 로 로드된다.
 *
 * MutationObserver 와 IntersectionObserver 를 쓰지 않는다.
 * 과거 이 프로젝트에서 observer 기반 검색이 무한 루프를 일으켰다. 티스토리가
 * 페이지 로드 후에도 DOM 을 계속 건드리기 때문에 observer 콜백이 스스로를 다시
 * 트리거한다. 스크롤 추적은 scroll 이벤트 + requestAnimationFrame 으로 한다.
 */

(function () {
  'use strict';

  var doc = document;
  var body = doc.body;
  var pageType = body.id; // tt-body-index, tt-body-page, ...

  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }

  /* ---------- 푸터 연도 ---------- */

  var yearEl = $('#footer-year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- 모바일 사이드바 ---------- */

  var menuBtn = $('#mobile-menu-btn');
  var sidebar = $('#sidebar');
  var overlay = $('#sidebar-overlay');

  function setSidebar(open) {
    if (!sidebar) return;
    sidebar.classList.toggle('open', open);
    if (overlay) overlay.hidden = !open;
    if (menuBtn) menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', function () {
      setSidebar(!sidebar.classList.contains('open'));
    });
  }
  if (overlay) overlay.addEventListener('click', function () { setSidebar(false); });

  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setSidebar(false);
  });

  /* ---------- 검색 ---------- */
  /*
     엔터를 누르면 /search/검색어 로 이동시키는 것이 전부다.
     티스토리 기본 검색 경로라서 별도 처리가 필요 없고, 단순해서 깨질 여지도 없다.
  */

  function wireSearch(input) {
    if (!input) return;
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var q = input.value.trim();
      if (!q) return;
      e.preventDefault();
      location.href = '/search/' + encodeURIComponent(q);
    });
  }
  wireSearch($('#search-input'));
  wireSearch($('#search-input-side'));

  /* ---------- 맨 위로 ---------- */

  var toTop = $('#scroll-to-top');
  if (toTop) {
    toTop.addEventListener('click', function () {
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  /* ---------- 빈 공지 블록 숨김 ---------- */
  /*
     공지 글이 하나도 없을 때 래퍼만 남아 빈 영역이 생기는 경우가 있다.
     항목이 없으면 섹션째 감춘다.
  */

  var noticeBlock = $('#sidebar-notice');
  if (noticeBlock && !$('li', noticeBlock)) {
    noticeBlock.style.display = 'none';
  }

  /* ---------- 코드블록 ---------- */

  var content = $('.article-content');

  if (content) {
    // 티스토리 코드블록은 data-ke-language 로 언어를 표시한다. 구문 강조기가
    // 기대하는 language-* 클래스로 바꿔 둔다. 강조기가 없어도 해가 없다.
    $$('pre[data-ke-language]', content).forEach(function (pre) {
      var lang = pre.getAttribute('data-ke-language');
      if (!lang) return;
      var code = $('code', pre) || pre;
      if (code.className.indexOf('language-') === -1) {
        code.className = (code.className + ' language-' + lang).trim();
      }
    });

    // 복사 버튼
    $$('pre', content).forEach(function (pre) {
      if (pre.querySelector('.code-copy')) return;
      var btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'code-copy';
      btn.textContent = '복사';
      btn.addEventListener('click', function () {
        var code = $('code', pre) || pre;
        var text = code.innerText;
        var done = function () {
          btn.textContent = '복사됨';
          setTimeout(function () { btn.textContent = '복사'; }, 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () {});
        } else {
          var ta = doc.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.position = 'absolute';
          ta.style.left = '-9999px';
          body.appendChild(ta);
          ta.select();
          try { doc.execCommand('copy'); done(); } catch (err) {}
          body.removeChild(ta);
        }
      });
      pre.style.position = 'relative';
      pre.appendChild(btn);
    });

    // 구문 강조기가 로드돼 있으면 여기서 수동 실행한다.
    // (Prism.manual = true 이므로 자동 실행되지 않는다)
    if (window.Prism && typeof window.Prism.highlightAllUnder === 'function') {
      window.Prism.highlightAllUnder(content);
    }
  }

  /* ---------- 목차 ---------- */
  /*
     글 상세 페이지에서만, 그리고 목차를 놓을 자리가 있는 넓은 화면에서만 만든다.
     좁은 화면에서는 아예 만들지 않는다 (CSS 로 숨기는 게 아니라 DOM 을 안 만든다).
  */

  var TOC_MIN_WIDTH = 1500;

  function buildToc() {
    if (pageType !== 'tt-body-page') return;
    if (!body.classList.contains('has-toc')) return;
    if (!content) return;
    if (window.innerWidth < TOC_MIN_WIDTH) return;
    if ($('.toc')) return;

    var heads = $$('h2, h3', content).filter(function (h) {
      return h.textContent.trim().length > 0;
    });
    if (heads.length < 2) return;

    var nav = doc.createElement('nav');
    nav.className = 'toc';
    nav.setAttribute('aria-label', '목차');

    var title = doc.createElement('p');
    title.className = 'toc-title';
    title.textContent = '목차';
    nav.appendChild(title);

    var ul = doc.createElement('ul');

    heads.forEach(function (h, i) {
      if (!h.id) h.id = 'toc-heading-' + i;
      var li = doc.createElement('li');
      li.className = 'toc-' + h.tagName.toLowerCase();
      var a = doc.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent.trim();
      li.appendChild(a);
      ul.appendChild(li);
    });

    nav.appendChild(ul);
    doc.querySelector('.main').appendChild(nav);

    return { links: $$('a', ul), heads: heads };
  }

  var toc = buildToc();

  if (toc) {
    var ticking = false;

    function updateActive() {
      ticking = false;
      var offset = 100;
      var current = 0;
      for (var i = 0; i < toc.heads.length; i++) {
        if (toc.heads[i].getBoundingClientRect().top - offset <= 0) current = i;
        else break;
      }
      for (var j = 0; j < toc.links.length; j++) {
        toc.links[j].classList.toggle('active', j === current);
      }
    }

    // observer 대신 scroll + rAF. 티스토리 DOM 변경과 무관하게 동작한다.
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateActive);
    }, { passive: true });

    updateActive();
  }
})();
