# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## ⚠️ 중요 규칙
**절대 이모지를 사용하지 말 것** - 코드, 주석, 커밋 메시지, 모든 곳에서 이모지 사용 금지
**자동 버전 관리 필수** - src/ 폴더의 파일을 수정할 때마다 반드시 새 버전 폴더(3.X) 생성. 사용자가 시키지 않아도 자동으로 버전업해야 함. 롤백 기점 확보가 목적.

## 프로젝트 개요

**티스토리 블로그 스킨 개발 프로젝트**로, 코드 가독성, SEO, 반응형 디자인에 중점을 둔 모던하고 성능 최적화된 기술 블로그용 스킨을 제작합니다.

**대상**: 개인 기술 블로그 (코드 중심 콘텐츠)
**디자인**: 모던하고 깔끔한 미학, 다크/라이트 모드 지원
**기술 스택**: Vanilla JavaScript + Tailwind CSS (유지보수성 우선)
**우선순위**: SEO 최적화, 성능, 모바일 반응형

## 티스토리 스킨 핵심 구조

### 필수 파일:
- **`index.xml`**: 스킨 메타데이터, 설정 변수, 기본값
- **`skin.html`**: 티스토리 치환자가 포함된 메인 HTML 템플릿
- **`style.css`**: 스타일링 (Tailwind + 커스텀 CSS)
- **`images/script.js`**: JavaScript 기능
- **`preview*.jpg`**: 미리보기 이미지 (256px, 560px, 1600px 버전)

### 티스토리 치환자 문법:
```html
<!-- 그룹 치환자 -->
<s_article_rep>...</s_article_rep>
<s_permalink_article_rep>...</s_permalink_article_rep>
<s_index_article_rep>...</s_index_article_rep>

<!-- 값 치환자 -->
[##_title_##]
[##_article_rep_title_##]
[##_page_title_##]

<!-- 조건부 치환자 -->
<s_if_var_variableName>...</s_if_var_variableName>
<s_not_var_variableName>...</s_not_var_variableName>
```

## 분석된 참고 스킨

`reference/` 디렉토리에는 서로 다른 접근 방식을 보여주는 5개의 참고 스킨이 있습니다:

1. **hannoone_skin_v1.3.2**: 가볍고 SEO 중심, 스크립트 최적화 패턴 (MutationObserver로 불필요한 스크립트 차단)
2. **Odyssey**: 4가지 리스트 스타일 변형이 있는 반응형 퍼블릭 사이트 디자인
3. **pg_Poster**: jQuery + Slick.js를 사용한 커버/슬라이더 기능의 포트폴리오 중심 스킨
4. **tistory_discord_ui**: Tailwind CSS를 사용한 모던한 디스코드 영감 UI (1줄로 압축된 CSS)
5. **xf_Portfolio**: 반응형 그리드와 캐러셀이 있는 포트폴리오 쇼케이스

**확인된 주요 패턴:**
- 스크립트 최적화: 불필요한 티스토리 스크립트 차단/지연
- 반응형 디자인: 모두 햄버거 메뉴, 뷰포트 메타 태그, 브레이크포인트 사용
- CSS 접근: 전통적인 BEM (2K+ 줄) vs Tailwind 유틸리티 우선 (1줄)
- JavaScript: jQuery 기반 vs Vanilla JS vs 모던 ES6+
- 성능: 지연 로딩, 에셋 프리로딩, CDN 사용

## 아키텍처 결정사항

### CSS 전략: Tailwind CSS + 커스텀 컴포넌트
- **90% Tailwind 유틸리티** - 유지보수성을 위해
- **10% 커스텀 CSS** - 특수 컴포넌트용
- 다크 모드: 클래스 기반 전략 (`dark:` 접두사)
- 프로덕션 빌드 시 미사용 CSS 제거

### JavaScript: Vanilla JS (의존성 없음)
- **핵심 기능**: 테마 토글, 지연 로딩, 모바일 메뉴, 검색, 목차 생성
- **성능**: IntersectionObserver로 지연 로딩, MutationObserver로 스크립트 차단
- **모던**: ES6+, 화살표 함수, 옵셔널 체이닝, 필요시 async/await

### HTML 구조:
```html
<body id='[##_body_id_##]'>
<s_t3> <!-- 필수 티스토리 래퍼 -->
  <header> <!-- 고정 내비게이션 -->
  <div class="container">
    <main> <!-- 글 목록 -->
    <aside> <!-- 사이드바 -->
  </div>
  <footer>
  <script src="./images/script.js" defer></script>
</s_t3>
</body>
```

## 구현할 주요 기능

### 1. 성능 최적화
- `https://t1.daumcdn.net/` 및 `https://tistory1.daumcdn.net/`에 프리커넥트
- IntersectionObserver로 이미지 지연 로딩
- 불필요한 티스토리 스크립트 차단 (hannoone_skin 패턴)
- 중요하지 않은 JavaScript 지연 로드

### 2. SEO 최적화
- 시맨틱 HTML5 태그 (`<article>`, `<aside>`, `<nav>`, `<header>`, `<footer>`)
- 메타 태그: description, keywords, author
- 소셜 공유용 Open Graph 태그
- Twitter Card 태그
- BlogPosting 스키마를 위한 구조화된 데이터 (JSON-LD)
- 적절한 제목 계층 구조 (H1 → H6)

### 3. 반응형 디자인
- 모바일 우선 접근
- Tailwind 브레이크포인트: sm (640px), md (768px), lg (1024px), xl (1280px)
- 모바일 내비게이션용 햄버거 메뉴
- 유연한 그리드 시스템 (Flexbox/Grid)
- 터치 친화적 버튼 크기 (최소 44px)

### 4. 다크 모드
- 클래스 기반 토글: `document.documentElement.classList.toggle('dark')`
- `localStorage`에 설정 저장
- 페이지 로드 시 초기화
- 테마 색상용 CSS 변수

### 5. 개발자 친화적 기능
- 구문 강조 (Prism.js 또는 Highlight.js 통합)
- 코드 블록 최적화 (가로 스크롤, 적절한 폰트)
- H2/H3 제목에서 자동 생성되는 목차
- 읽기에 충분한 line-height를 가진 깔끔한 타이포그래피

## index.xml 설정 구조

```xml
<skin>
  <information> <!-- name, version, description, license -->
  <author> <!-- name, homepage, email -->
  <default> <!-- entriesOnPage, contentWidth, expandComment 등 -->
  <variables>
    <variablegroup name="Appearance">
      <variable>
        <name>accentColor</name>
        <label>대표 색상</label>
        <type>COLOR</type>
        <default>#3b82f6</default>
      </variable>
    </variablegroup>
  </variables>
</skin>
```

**변수 타입**: STRING, SELECT, IMAGE, BOOL, COLOR

## 개발 워크플로우

### Phase 1: 핵심 구조
1. 메타데이터와 설정 변수가 포함된 `index.xml` 생성
2. 티스토리 치환자가 포함된 `skin.html` 구축
3. 기본 HTML 구조 구현 (header, main, aside, footer)

### Phase 2: 스타일링
4. Tailwind CSS 설정 (CDN 또는 PostCSS 빌드)
5. 커스텀 CSS 컴포넌트 생성 (카드, 버튼, 태그)
6. 다크 모드 스타일링 구현
7. 반응형 브레이크포인트 추가

### Phase 3: 인터랙티브 기능
8. 핵심 JavaScript 기능 작성 (테마 토글, 지연 로딩, 모바일 메뉴)
9. 검색 기능 추가
10. 목차 생성 구현
11. 스크립트 최적화 (불필요한 티스토리 스크립트 차단)

### Phase 4: 최적화 및 테스트
12. SEO 메타 태그 및 구조화된 데이터
13. 성능 최적화 (프리커넥트, 지연 로딩, defer)
14. 여러 기기/브라우저에서 테스트
15. Lighthouse 감사 (목표: >90 점수)
16. 접근성 체크 (WCAG AA)

### Phase 5: 마무리
17. 미리보기 이미지 생성 (256x192, 560x420, 1600x1200)
18. 설치 가이드가 포함된 README 작성
19. 티스토리 스킨 업로드용 패키징

## 테스트 체크리스트

- [ ] 모바일 반응형 (Chrome DevTools 사용)
- [ ] 다크/라이트 모드 토글 작동
- [ ] 모든 티스토리 치환자가 올바르게 렌더링
- [ ] 검색이 `/search/{query}`로 리다이렉트
- [ ] 댓글 섹션 표시 (`[##_guestbook_group_##]` 사용)
- [ ] 카테고리 및 태그 내비게이션 작동
- [ ] `<head>`에 SEO 메타 태그 존재
- [ ] 성능: Lighthouse 점수 > 90
- [ ] 크로스 브라우저: Chrome, Firefox, Safari, Edge
- [ ] 접근성: 키보드 내비게이션, 스크린 리더 지원

## 티스토리 특화 중요사항

### 치환자 카테고리:
1. **블로그 정보**: `[##_title_##]`, `[##_desc_##]`, `[##_blogger_##]`, `[##_image_##]`
2. **내비게이션**: `[##_blog_link_##]`, `[##_rss_url_##]`, `[##_taglog_link_##]`, `[##_guestbook_link_##]`
3. **글 목록**: `<s_article_rep>`, `[##_article_rep_title_##]`, `[##_article_rep_link_##]`
4. **퍼머링크**: `<s_permalink_article_rep>`, `[##_article_rep_desc_##]`
5. **인덱스**: `<s_index_article_rep>`, `[##_article_rep_summary_##]`
6. **사이드바**: `[##_category_list_##]`, `[##_recent_article_##]`, `<s_tag>`
7. **관리**: `<s_ad_div>`, `[##_s_ad_m_link_##]`, `[##_s_ad_d_onclick_##]`
8. **댓글**: `[##_guestbook_group_##]` (새로운 기본 방명록 치환자)

### 필수 래퍼:
```html
<s_t3>
  <!-- 모든 콘텐츠는 이 래퍼 안에 있어야 함 -->
  <!-- 티스토리가 여기에 공통 스크립트를 주입함 -->
</s_t3>
```

### 페이지 타입 감지용 Body ID:
```javascript
// 페이지 타입 감지
const bodyId = document.body.id;
// tt-body-index: 홈
// tt-body-page: 글 퍼머링크
// tt-body-category: 카테고리 목록
// tt-body-tag: 태그 목록
// tt-body-search: 검색 결과
// tt-body-guestbook: 방명록
```

## 피해야 할 일반적인 함정

1. **`<s_t3>` 래퍼 누락**: 모든 콘텐츠는 이 태그 안에 있어야 함
2. **잘못된 태그 문법**: 티스토리 가이드의 정확한 문법 사용
3. **`[##_body_id_##]` 누락**: 페이지별 스타일링에 필요
4. **댓글 테스트 누락**: 최신 댓글 시스템을 위해 `[##_guestbook_group_##]` 사용
5. **경로 하드코딩**: URL에는 티스토리 치환자 사용
6. **모바일 무시**: 항상 모바일 우선 테스트
7. **시맨틱 HTML 무시**: SEO를 위한 적절한 제목 계층 구조 유지

## 성능 모범 사례

참고 스킨 분석에서:

```javascript
// 1. 불필요한 티스토리 스크립트 차단 (hannoone_skin에서)
const UNWANTED_SCRIPTS = [
  'TistoryProfileLayer/script.js',
  'roosevelt_dk_bt.js'
];

const observer = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.tagName === 'SCRIPT' &&
          UNWANTED_SCRIPTS.some(script => node.src?.includes(script))) {
        node.remove();
      }
    });
  });
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});

// 2. 이미지 지연 로딩
const lazyLoadImages = () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src || img.src;
        img.classList.add('loaded');
        observer.unobserve(img);
      }
    });
  }, { rootMargin: '50px' });

  document.querySelectorAll('img.lazy').forEach(img => observer.observe(img));
};
```

## 리소스

- **퀵 레퍼런스**: `TISTORY_quick_reference.md` ⭐ **구현 시 먼저 참조**
  - 자주 쓰는 핵심 치환자 50-60개 정리
  - 실전 패턴 예제 포함
  - 빠른 참조용 (약 5-8KB, 400줄)
- **티스토리 스킨 가이드**: `TISTRORY_skin_guide.md` (완전한 참고 자료)
  - 전체 1,748줄 문서 (72KB)
  - 모든 치환자와 상세 설명
  - 궁금한 점이 있을 때 참조
- **참고 스킨**: `reference/` 디렉토리에 5개의 프로덕션 스킨
- **계획 문서**: `.claude/plans/glowing-gathering-goose.md` (상세한 구현 계획)

## 빠른 명령어

```bash
# 파일 구조 보기
ls -la

# 참고 스킨 확인
ls reference/

# 모든 index.xml 파일 찾기
find reference/ -name "index.xml"

# 모든 skin.html 파일 찾기
find reference/ -name "skin.html"
```

## 구현 시 유의사항

1. **치환자 참조 순서**:
   - 먼저 `TISTORY_quick_reference.md` 확인 (빠른 참조)
   - 찾는 내용이 없으면 `TISTRORY_skin_guide.md` 참조 (완전한 문서)
2. **참고 스킨 연구**: 구현 패턴을 위해 `reference/`의 참고 스킨 연구
3. **계획 따르기**: 단계별 가이드를 위해 `.claude/plans/glowing-gathering-goose.md`의 계획 따르기
4. **점진적 테스트** - 모든 것이 완료될 때까지 기다리지 말 것
5. **핵심 기능 우선순위** (index.xml, skin.html, style.css, script.js)를 개선보다 먼저
