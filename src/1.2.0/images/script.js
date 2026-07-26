/**
 * ========================================
 * Code Editor Blog - JavaScript (1.2.0)
 * ========================================
 *
 * 무한 루프 방지 원칙:
 * - MutationObserver / IntersectionObserver 등 observer류를 절대 사용하지 않습니다.
 *   (과거 무한 루프 버그의 원인이었음)
 * - 모든 기능은 DOMContentLoaded에서 "한 번만" 실행됩니다.
 *
 * 포함 기능:
 * 1. 모바일 사이드바 메뉴
 * 2. 카테고리 접기/펼치기
 * 3. 검색 (엔터 시 /search/검색어 로 이동하는 단순 방식)
 * 4. 코드 블록 (Prism 구문 강조 연동 + 복사 버튼)
 * 5. 태그 섹션 재배치
 * 6. 맨 위로 버튼 / 푸터 연도
 */

'use strict';

// ========================================
// 1. 모바일 사이드바 메뉴
// ========================================

/**
 * 모바일 햄버거 메뉴
 * 버튼을 누르면 사이드바가 왼쪽에서 슬라이드되어 나타납니다.
 */
function initMobileMenu() {
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (!mobileMenuBtn || !sidebar || !overlay) return;

  // 사이드바 열기
  function openSidebar() {
    sidebar.classList.remove('-translate-x-full');
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  // 사이드바 닫기
  function closeSidebar() {
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // 이벤트 리스너
  mobileMenuBtn.addEventListener('click', openSidebar);
  overlay.addEventListener('click', closeSidebar);

  // ESC 키로 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
      closeSidebar();
    }
  });
}

// ========================================
// 2. 카테고리 토글 기능
// ========================================

/**
 * 카테고리 접기/펼치기 기능 (Cursor 스타일)
 * 하위 카테고리가 있는 항목의 왼쪽 화살표를 누르면 접거나 펼칩니다.
 */
function initCategoryToggle() {
  const categoryContainers = document.querySelectorAll('.tt_category, .category');

  categoryContainers.forEach(container => {
    // 모든 레벨의 카테고리 항목 찾기
    const categoryItems = container.querySelectorAll('li');

    categoryItems.forEach(item => {
      const link = item.querySelector(':scope > a'); // 직계 자식 a만
      const subList = item.querySelector(':scope > ul'); // 직계 자식 ul만

      // 하위 카테고리가 있는 경우에만 토글 기능 추가
      if (subList && link) {
        link.classList.add('has-children');

        // 화살표 영역 클릭 시 토글
        link.addEventListener('click', (e) => {
          // 왼쪽 화살표 영역 클릭 시 토글
          const isArrowArea = e.offsetX < 20;

          if (isArrowArea) {
            e.preventDefault();
            toggleCategory(link, subList);
          }
          // 나머지 영역 클릭 시 링크 이동
        });
      }
    });
  });
}

/**
 * 개별 카테고리 토글
 */
function toggleCategory(link, subList) {
  const isCollapsed = subList.classList.contains('collapsed');

  if (isCollapsed) {
    // 펼치기
    subList.classList.remove('collapsed');
    link.classList.remove('collapsed');
  } else {
    // 접기
    subList.classList.add('collapsed');
    link.classList.add('collapsed');
  }
}

// ========================================
// 3. 검색
// ========================================

/**
 * 검색 기능 (안전한 단순 방식)
 * 입력창에서 엔터를 누르면 티스토리 검색 결과 주소로 이동만 합니다.
 * observer를 쓰지 않으므로 무한 루프 위험이 없습니다.
 */
function initSearch() {
  const inputs = document.querySelectorAll('#search-input, #search-input-mobile');

  inputs.forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;

      const query = input.value.trim();
      if (query) {
        // 티스토리 검색 결과 페이지로 이동
        location.href = '/search/' + encodeURIComponent(query);
      }
    });
  });
}

// ========================================
// 4. 코드 블록 (구문 강조 + 복사 버튼)
// ========================================

/**
 * 티스토리 코드 블록에 Prism 구문 강조를 연결합니다.
 *
 * 티스토리 에디터는 코드 블록을 이렇게 출력합니다:
 *   <pre data-ke-language="python"><code>...</code></pre>
 * Prism은 language-python 같은 클래스가 있어야 색을 입히므로,
 * data-ke-language 속성을 클래스로 변환한 뒤 하이라이트를 실행합니다.
 */
function initCodeBlocks() {
  // 에디터 언어명 -> Prism 언어명 별칭 (다른 것만 등록)
  const LANGUAGE_ALIASES = {
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'sh': 'bash',
    'shell': 'bash',
    'yml': 'yaml',
    'html': 'markup',
    'xml': 'markup'
  };

  document.querySelectorAll('pre').forEach(pre => {
    const code = pre.querySelector('code');
    if (!code) return;

    // 1) data-ke-language 속성 -> language-* 클래스 변환
    const keLang = (pre.getAttribute('data-ke-language') || '').toLowerCase();
    const hasLangClass = /language-/.test(pre.className + ' ' + code.className);

    if (keLang && keLang !== 'default') {
      const lang = LANGUAGE_ALIASES[keLang] || keLang;
      pre.classList.add('language-' + lang);
      code.classList.add('language-' + lang);
    } else if (!hasLangClass) {
      // 언어 미지정 코드: Prism 테마 일관성을 위해 none 처리
      pre.classList.add('language-none');
      code.classList.add('language-none');
    }

    // 2) 복사 버튼 삽입
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'code-copy-btn';
    copyBtn.textContent = '복사';

    copyBtn.addEventListener('click', () => {
      try {
        navigator.clipboard.writeText(code.innerText).then(() => {
          copyBtn.textContent = '복사됨';
          setTimeout(() => { copyBtn.textContent = '복사'; }, 2000);
        });
      } catch (err) {
        console.log('[ERROR] 클립보드 복사 실패:', err.message);
      }
    });

    pre.appendChild(copyBtn);
  });

  // 3) 클래스 변환이 끝난 후 수동으로 하이라이트 실행
  //    (skin.html에서 Prism.manual = true로 자동 실행을 꺼두었음)
  if (window.Prism && typeof window.Prism.highlightAll === 'function') {
    window.Prism.highlightAll();
  }
}

// ========================================
// 5. 태그 섹션 재배치
// ========================================

/**
 * 현재 페이지 타입 확인 (body id 기준)
 */
function getPageType() {
  const bodyId = document.body.id || '';

  if (bodyId.includes('tt-body-index')) return 'index';
  if (bodyId.includes('tt-body-page')) return 'page';
  if (bodyId.includes('tt-body-category')) return 'category';
  if (bodyId.includes('tt-body-tag')) return 'tag';
  if (bodyId.includes('tt-body-search')) return 'search';
  if (bodyId.includes('tt-body-guestbook')) return 'guestbook';

  return 'unknown';
}

/**
 * 태그 섹션을 container_postbtn 아래로 이동
 */
function moveTagSection() {
  const pageType = getPageType();

  // 상세 페이지에서만 실행
  if (pageType !== 'page') return;

  const tagSection = document.querySelector('.flex.flex-wrap.gap-2.mt-4');
  const postButtonContainer = document.querySelector('.container_postbtn');

  if (tagSection && postButtonContainer) {
    // container_postbtn 바로 다음에 태그 섹션 삽입
    postButtonContainer.parentNode.insertBefore(tagSection, postButtonContainer.nextSibling);
  }
}

// ========================================
// 6. 맨 위로 버튼 / 푸터 연도
// ========================================

/**
 * 맨 위로 스크롤 버튼 기능
 */
function initScrollToTop() {
  const scrollBtn = document.getElementById('scroll-to-top');

  if (!scrollBtn) return;

  scrollBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

/**
 * 푸터의 연도를 현재 연도로 갱신
 */
function initFooterYear() {
  const yearEl = document.getElementById('footer-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

// ========================================
// 7. 초기화
// ========================================

/**
 * 페이지 로드 완료 시 초기화
 * 각 기능은 독립적으로 try/catch 처리하여
 * 하나가 실패해도 나머지는 동작하게 합니다.
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('=== Code Editor Blog 1.2.0 초기화 ===');
  console.log('페이지 타입: ' + getPageType());

  const initializers = [
    ['모바일 메뉴', initMobileMenu],
    ['카테고리 토글', initCategoryToggle],
    ['검색', initSearch],
    ['코드 블록', initCodeBlocks],
    ['태그 섹션 재배치', moveTagSection],
    ['맨 위로 버튼', initScrollToTop],
    ['푸터 연도', initFooterYear]
  ];

  initializers.forEach(([name, fn]) => {
    try {
      fn();
      console.log('[OK] ' + name);
    } catch (e) {
      console.log('[ERROR] ' + name + ': ' + e.message);
    }
  });

  console.log('=== 초기화 완료 ===');
});

// ========================================
// 전역 유틸리티
// ========================================

/**
 * 페이지 최상단으로 스크롤
 */
function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

// 전역 함수 등록
window.scrollToTop = scrollToTop;
window.getPageType = getPageType;

// 전역 에러 캡처
window.addEventListener('error', (e) => {
  console.log('[ERROR] JavaScript 에러: ' + e.message + ' (' + e.filename + ':' + e.lineno + ')');
});
