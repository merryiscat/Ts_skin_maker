/**
 * ========================================
 * Code Editor Blog - JavaScript (v1.0.1)
 * ========================================
 *
 * 주요 기능:
 * - 목차(TOC) 자동 생성 및 스크롤 스파이
 * - 네온 블루 컬러 스타일링 (H2 > H3 > H4)
 * - 검색 기능 (무한 루프 방지 포함)
 * - 테마 토글, 모바일 메뉴
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  console.log('=== Code Editor Blog v1.0.1 초기화 ===');

  initThemeToggle();
  initMobileMenu();
  initCategoryToggle();
  initScrollToTop();
  initTagLimit(); // 태그 제한 기능 추가

  // 상세 페이지인 경우에만 TOC 및 태그 이동 실행
  if (getPageType() === 'page') {
    initTableOfContents();
    moveTagSection();
  }

  // 검색 기능 (페이지 타입 무관, 헤더에 있으므로)
  initSearch();
});

// ========================================
// 0. 사이드바 태그 제한 (v1.0.2)
// ========================================

/**
 * 사이드바 태그 클라우드에서 최신 15개만 보여주고 나머지는 ... 처리
 */
function initTagLimit() {
  // 사이드바 내의 태그 컨테이너 찾기
  // layout 구조상 aside#sidebar 내의 flex-wrap 클래스를 가진 div가 태그 컨테이너임
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  // 태그 컨테이너 찾기: "Tags" 헤더 다음의 div (flex-wrap 클래스 등)
  // 명확한 식별을 위해 aside 내부의 특정 구조를 탐색
  // skin.html 구조: aside > nav > div(Tags) > div.flex.flex-wrap
  const tagContainer = sidebar.querySelector('.flex.flex-wrap.gap-1\\.5');

  if (!tagContainer) {
    console.log('❌ 태그 컨테이너를 찾을 수 없습니다.');
    return;
  }

  const tags = tagContainer.querySelectorAll('a');
  const limit = 15;

  if (tags.length <= limit) return; // 제한보다 적으면 아무것도 안 함

  // 15개 이후 숨기기
  for (let i = limit; i < tags.length; i++) {
    tags[i].style.display = 'none';
  }

  // 더보기 버튼 (...) 생성
  const moreBtn = document.createElement('button');
  moreBtn.textContent = '...';
  moreBtn.className = 'px-2 py-1 bg-gray-800 text-gray-400 hover:text-white rounded text-xs transition-colors ml-1';
  moreBtn.title = '태그 더보기';

  // 클릭 이벤트
  moreBtn.addEventListener('click', () => {
    // 숨겨진 태그들 보이기
    for (let i = limit; i < tags.length; i++) {
      tags[i].style.display = 'inline-block'; // or '' to reset
    }
    // 버튼 제거 (또는 '접기'로 변경 가능)
    moreBtn.remove();
  });

  tagContainer.appendChild(moreBtn);
  console.log(`✅ 태그 제한 적용 완료 (${tags.length}개 중 ${limit}개 표시)`);
}

/**
 * 목차 생성 및 스크롤 감지 초기화
 */
function initTableOfContents() {
  const content = document.querySelector('.article-content');
  if (!content) return;

  // 1. 헤딩 태그 수집 (h2, h3, h4)
  const headings = content.querySelectorAll('h2, h3, h4');
  if (headings.length === 0) return;

  // 2. TOC 컨테이너 생성 (본문 오른쪽)
  const mainWrapper = document.querySelector('main > div'); // .max-w-5xl.mx-auto...
  if (!mainWrapper) return;

  // 레이아웃 조정: 기존 mainWrapper를 flex 컨테이너로 감싸거나 스타일 조정
  // 여기서는 absolute positioning 대신 grid/flex 구조를 추천하지만,
  // 기존 구조를 유지하며 우측에 float/fixed 형태로 배치하는 전략 사용.

  // TOC 컨테이너 생성
  const tocContainer = document.createElement('aside');
  tocContainer.id = 'toc-sidebar';
  tocContainer.className = 'hidden xl:block fixed top-24 right-8 w-64 p-4 max-h-[80vh] overflow-y-auto z-30';

  const tocTitle = document.createElement('h3');
  tocTitle.className = 'text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-2';
  tocTitle.innerHTML = `
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path>
    </svg>
    On this page
  `;
  tocContainer.appendChild(tocTitle);

  const tocList = document.createElement('ul');
  tocList.className = 'space-y-1 text-sm border-l border-gray-700';

  // 3. 목차 아이템 생성
  headings.forEach((heading, index) => {
    // ID가 없으면 생성
    if (!heading.id) {
      heading.id = `heading-${index}`;
    }

    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${heading.id}`;
    a.textContent = heading.textContent;
    a.className = 'block pl-4 py-1 border-l-2 border-transparent hover:text-white transition-all duration-200 truncate';

    // 태그 레벨에 따른 스타일 및 색상 지정 (네온 블루 계열)
    // H2: 밝은 네온 파랑 (Cyan/Blue)
    // H3: 중간 파랑
    // H4: 연한/어두운 파랑
    const tagName = heading.tagName.toLowerCase();

    if (tagName === 'h2') {
      a.dataset.level = '2';
      a.classList.add('text-gray-400'); // 기본색
      // 활성화 시: text-cyan-400 (Tailwind) 또는 커스텀 hex
    } else if (tagName === 'h3') {
      a.dataset.level = '3';
      a.classList.add('pl-8', 'text-gray-500');
    } else if (tagName === 'h4') {
      a.dataset.level = '4';
      a.classList.add('pl-12', 'text-gray-600');
    }

    // 클릭 시 부드러운 스크롤
    a.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById(heading.id).scrollIntoView({
        behavior: 'smooth',
        block: 'start' // 상단에 맞춤. 필요시 header 높이 고려하여 조정 가능 (scroll-margin-top CSS 활용 권장)
      });
      // URL 해시 업데이트 (history api)
      history.pushState(null, null, `#${heading.id}`);
    });

    li.appendChild(a);
    tocList.appendChild(li);
  });

  tocContainer.appendChild(tocList);

  // Body 또는 Main에 TOC 추가
  // 1280px(xl) 이상에서만 보이도록 클래스 처리됨.
  document.body.appendChild(tocContainer);


  // 4. 스크롤 스파이 (Intersection Observer)
  const observerOptions = {
    root: null,
    rootMargin: '-10% 0px -80% 0px', // 상단 10% 지점에서 감지 시작
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // 기존 활성화 제거
        tocList.querySelectorAll('a').forEach(link => {
          link.classList.remove('active', 'border-accent', 'text-cyan-400', 'text-blue-400', 'text-blue-300', 'font-semibold');
          // 원래 색상 복구 (level별)
          const level = link.dataset.level;
          if (level === '2') link.classList.add('text-gray-400');
          else if (level === '3') link.classList.add('text-gray-500');
          else link.classList.add('text-gray-600');
        });

        // 현재 항목 활성화
        const activeLink = tocList.querySelector(`a[href="#${entry.target.id}"]`);
        if (activeLink) {
          activeLink.classList.remove('text-gray-400', 'text-gray-500', 'text-gray-600'); // 기본색 제거
          activeLink.classList.add('active', 'border-accent', 'font-semibold');

          // 레벨별 네온 컬러 적용
          const level = activeLink.dataset.level;
          if (level === '2') {
            activeLink.style.color = '#00ffff'; // Neon Cyan
            activeLink.style.textShadow = '0 0 5px rgba(0, 255, 255, 0.5)';
          } else if (level === '3') {
            activeLink.style.color = '#3b82f6'; // Bright Blue
            activeLink.style.textShadow = '0 0 2px rgba(59, 130, 246, 0.5)';
          } else {
            activeLink.style.color = '#93c5fd'; // Pale Blue
            activeLink.style.textShadow = 'none';
          }
        }
      }
    });
  }, observerOptions);

  headings.forEach(heading => observer.observe(heading));

  console.log('✅ TOC 목차 생성 완료');
}


// ========================================
// 2. 검색 기능 (Safe)
// ========================================

function initSearch() {
  const searchInput = document.getElementById('search-input');

  if (!searchInput) return;

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = searchInput.value.trim();

      // 빈 검색어 방지
      if (query.length === 0) {
        alert('검색어를 입력해주세요.');
        return;
      }

      // 검색어 길이 제한 (옵션)
      if (query.length < 2) {
        alert('검색어는 2글자 이상 입력해주세요.');
        return;
      }

      // 티스토리 검색 URL로 이동
      // [##_blog_link_##]search/검색어
      // JS에서는 티스토리 치환자를 쓸 수 없으므로, 현재 도메인 기반으로 추론
      const blogUrl = window.location.origin;

      // 인코딩 처리
      const encodedQuery = encodeURIComponent(query);

      // 현재 페이지가 이미 검색 결과 페이지라면? (무한 루프 방지)
      // window.location.pathname 체크
      window.location.href = `${blogUrl}/search/${encodedQuery}`;
    }
  });

  console.log('✅ 검색 핸들러 초기화 완료');
}


// ========================================
// 3. 기존 기능들 (테마, 메뉴 등)
// ========================================

function initThemeToggle() {
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (!themeToggleBtn) return;
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.classList.add(savedTheme);
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.remove(currentTheme);
    document.documentElement.classList.add(newTheme);
    localStorage.setItem('theme', newTheme);
  });
}

function initMobileMenu() {
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!mobileMenuBtn || !sidebar || !overlay) return;
  function openSidebar() {
    sidebar.classList.remove('-translate-x-full');
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
  }
  mobileMenuBtn.addEventListener('click', openSidebar);
  overlay.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
      closeSidebar();
    }
  });
}

function initCategoryToggle() {
  // 기존 코드 유지
  const categoryContainers = document.querySelectorAll('.tt_category, .category');
  categoryContainers.forEach(container => {
    const categoryItems = container.querySelectorAll('li');
    categoryItems.forEach(item => {
      const link = item.querySelector(':scope > a');
      const subList = item.querySelector(':scope > ul');
      if (subList && link) {
        link.classList.add('has-children');
        link.addEventListener('click', (e) => {
          const isArrowArea = e.offsetX < 20;
          if (isArrowArea) {
            e.preventDefault();
            toggleCategory(link, subList);
          }
        });
      }
    });
  });
}

function toggleCategory(link, subList) {
  const isCollapsed = subList.classList.contains('collapsed');
  if (isCollapsed) {
    subList.classList.remove('collapsed');
    link.classList.remove('collapsed');
  } else {
    subList.classList.add('collapsed');
    link.classList.add('collapsed');
  }
}

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

function moveTagSection() {
  const pageType = getPageType();
  if (pageType !== 'page') return;
  const tagSection = document.querySelector('.s_tag_label'); // s_tag_label 클래스가 없으면 수정 필요
  // HTML 구조상 태그 섹션을 찾아서 이동... (생략하거나 기존 코드 유지)
  // 여기서는 querySelector가 조금 불안정할 수 있으므로, 방어 코드 추가
  const tagDiv = document.querySelector('.flex.flex-wrap.gap-2.mt-4'); // 태그 컨테이너
  const postButtonContainer = document.querySelector('.container_postbtn');
  if (tagDiv && postButtonContainer) {
    postButtonContainer.parentNode.insertBefore(tagDiv, postButtonContainer.nextSibling);
  }
}

function initScrollToTop() {
  const scrollBtn = document.getElementById('scroll-to-top');
  if (!scrollBtn) return;
  scrollBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

window.scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
window.getPageType = getPageType;
