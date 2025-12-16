/**
 * ========================================
 * Code Editor Blog - JavaScript (안전 모드)
 * ========================================
 *
 * 무한 루프 방지를 위해 최소 기능만 포함
 * - 테마 토글
 * - 모바일 메뉴
 *
 * 비활성화된 기능:
 * - 검색 (검색창 제거됨)
 * - 목차 자동 생성 (observer 제거)
 * - 이미지 지연 로딩 (observer 제거)
 * - 스크립트 차단 (observer 제거)
 */

'use strict';

// ========================================
// 1. 다크/라이트 모드 토글
// ========================================

/**
 * 테마 전환 기능 (안전함)
 */
function initThemeToggle() {
  const themeToggleBtn = document.getElementById('theme-toggle');

  if (!themeToggleBtn) return;

  // 저장된 테마 불러오기
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.classList.add(savedTheme);

  // 테마 전환
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.classList.remove(currentTheme);
    document.documentElement.classList.add(newTheme);
    localStorage.setItem('theme', newTheme);

    console.log(`테마 변경: ${currentTheme} → ${newTheme}`);
  });
}

// ========================================
// 2. 모바일 사이드바 메뉴
// ========================================

/**
 * 모바일 햄버거 메뉴 (안전함)
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
// 3. 카테고리 토글 기능
// ========================================

/**
 * 카테고리 접기/펼치기 기능 (Cursor 스타일)
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

  console.log('✅ 카테고리 토글 초기화 완료 (모든 레벨)');
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
// 4. 페이지 타입 감지 (유틸리티)
// ========================================

/**
 * 현재 페이지 타입 확인
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

// ========================================
// 4. 맨 위로 버튼
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

// ========================================
// 5. 초기화
// ========================================

/**
 * 페이지 로드 완료 시 초기화
 * 최소 기능만 실행 (안전)
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('=== Code Editor Blog 초기화 (안전 모드) ===');
  console.log(`페이지 타입: ${getPageType()}`);
  console.log(`Body ID: ${document.body.id}`);

  // 안전한 기능만 실행
  try {
    initThemeToggle();
    console.log('✅ 테마 토글 초기화 완료');
  } catch (e) {
    console.log('❌ 테마 토글 에러:', e.message);
  }

  try {
    initMobileMenu();
    console.log('✅ 모바일 메뉴 초기화 완료');
  } catch (e) {
    console.log('❌ 모바일 메뉴 에러:', e.message);
  }

  try {
    initCategoryToggle();
  } catch (e) {
    console.log('❌ 카테고리 토글 에러:', e.message);
  }

  try {
    initScrollToTop();
    console.log('✅ 맨 위로 버튼 초기화 완료');
  } catch (e) {
    console.log('❌ 맨 위로 버튼 에러:', e.message);
  }

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
  console.log(`❌ JavaScript 에러: ${e.message} (${e.filename}:${e.lineno})`);
});

console.log('✅ script.js 로드 완료 (안전 모드)');
