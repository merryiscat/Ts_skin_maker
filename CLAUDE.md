# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## ⚠️ 중요 규칙
**절대 이모지를 사용하지 말 것** - 코드, 주석, 커밋 메시지, 모든 곳에서 이모지 사용 금지
**자동 버전 관리 필수** - src/ 폴더의 파일을 수정할 때마다 반드시 새 버전 폴더 생성. 사용자가 시키지 않아도 자동으로 버전업해야 함. 롤백 기점 확보가 목적.
- 현재 버전 체계: `src/0.9.8` → ... → `src/1.7.0` → `src/1.8.0` (최신)
- 수정 시: 최신 버전 폴더를 통째로 복사해 새 버전 폴더를 만든 뒤 그 안에서 작업하고, `index.xml`의 `<version>`도 함께 올릴 것
- 새 버전 폴더를 만들면 `tailwind.config.js`의 content 경로와 `package.json`의 build:css 출력 경로도 새 버전으로 바꿀 것

## 이 저장소에는 두 가지가 들어 있다

**1. `src/` - 손으로 만든 티스토리 스킨** (0.9.8 ~ 1.8.0)
아래 문서 대부분이 이것을 설명한다. 수정할 때 버전 폴더를 새로 만드는 규칙도 여기에만 해당한다.

**2. `webapp/` - 스킨 생성기 웹앱** (신규)
사용자가 자기 API 키를 넣고 대화로 자기 스킨을 만들어 가져가는 정적 페이지. 서버 없음, 수익화 없음.
`src/` 를 만들며 얻은 치환자 지식과 함정 목록을 코드로 옮긴 것이 핵심이다.

```
webapp/
├── harness/      치환자 계약서(contract.js), 함정 목록(pitfalls.js),
│                 스킨 스펙 단일 출처(spec.js), 시스템 프롬프트
├── presets/base/ 공유 골격. 치환자와 그룹 태그는 전부 여기에만 있다
├── loop/         정적 검증, 미리보기 렌더러, 산출물 묶기
├── screens/      E1 키등록 - P1 컨셉4안 - P2 세부 - W1 대화 - D1 내려받기
├── app/          상태 저장소와 화면 껍데기
└── test/         테스트 8벌. node webapp/test/*.test.mjs
```

**webapp 작업 시 지켜야 할 것**

- **`harness/spec.js` 가 단일 출처다.** 세부 항목을 하나 더하면 P2 폼, 골격 플래그, 모델 출력 스키마, 프롬프트에 자동으로 반영된다. 세 곳에 따로 적지 말 것
- **Tailwind 를 쓰지 않는다.** 사용자가 빌드를 돌릴 수 없으므로 손으로 쓴 CSS 만 쓴다
- **화면은 상태를 직접 고치지 않는다.** `ctx.actions` 를 통해서만
- 실행은 로컬 서버가 필요하다. `python -m http.server 8000` 후 `/webapp/`
- 화면 기획은 `docs/screens/` 에 있고 그것이 정답이다. 새 화면은 4안을 먼저 만들어 선택을 받는다

**미리보기가 못 잡는 것이 있다.** 렌더러는 티스토리가 본문에 씌우는 래퍼를 재현하지 않는다. 문단 여백 같은 문제는 실제 블로그에 올려야만 드러난다. `harness/pitfalls.js` 가 그 목록이다.

---

## 프로젝트 개요

**티스토리 블로그 스킨 개발 프로젝트**로, 코드 가독성, SEO, 반응형 디자인에 중점을 둔 모던하고 성능 최적화된 기술 블로그용 스킨을 제작합니다.

**대상**: 개인 기술 블로그 (코드 중심 콘텐츠)
**디자인**: 모던하고 깔끔한 미학, 다크/라이트 모드 지원
**기술 스택**: Vanilla JavaScript + Tailwind CSS (유지보수성 우선)
**우선순위**: SEO 최적화, 성능, 모바일 반응형

## 현재 상태 (1.8.0 기준)

**1.8.0 변경점:**
- **문단 간격 복원 보강**: 1.7.0의 빈 줄(p:empty) 복원만으로는 마크다운 모드 글이 해결 안 됨 — 마크다운 글은 빈 p 없이 문단이 연속 `<p>`로 출력되는데 티스토리가 여백을 0으로 만들어 벽처럼 붙음. `.article-content p { margin-bottom: 0.875em !important }` 추가 (**!important 필수** — 티스토리 콘텐츠 CSS가 크로스 오리진 시트로 p 여백을 0으로 강제함, 일반 규칙으론 못 이김. 라이브 주입 테스트로 검증)

**1.7.0 변경점:**
- **문단 줄바꿈 복원**: 티스토리는 본문을 `.tt_article_useless_p_margin`으로 감싸 p 여백을 0으로 만들고, 에디터의 빈 줄을 빈 `<p></p>`로 출력함. 빈 요소는 높이 0으로 접혀 줄바꿈이 사라짐 → `.article-content p:empty { min-height: 1.7em }`으로 복원. 라이브 페이지에 CSS 임시 주입으로 검증 완료(0px → 27px)

**1.6.0 변경점:**
- **구독 버튼 위치/디자인 조정**: 프로필 카드 안 → About 섹션 하단으로 이동. "$ " 터미널 프롬프트 프리픽스 제거(별로라는 피드백), 담백한 고스트 버튼으로. 구독 중 상태는 터미널 그린 텍스트 유지
- **참고 - 서식/페이지 기능**: 서식은 에디터용 글 템플릿이라 스킨 대응 불필요. 페이지(독립 고정 문서)는 `<s_page_rep>` 치환자가 필요한데 현재 미지원 — 사용자가 페이지 기능을 쓰게 되면 추가할 것

**1.5.0 변경점:**
- **사이드바 Menu 섹션 추가**: 방명록(`[##_guestbook_link_##]`)/태그 클라우드(`[##_taglog_link_##]`) 바로가기 — 페이지 마크업은 1.1.0부터 있었지만 들어가는 링크가 없었음
- **인용문 좌측 바 색상**: 회색 → accent(파랑)로 변경 (3곳 모두)
- **구독 버튼 재디자인**: 파란 단색 버튼이 튄다는 피드백 → 터미널 프롬프트 고스트 버튼(`$ 구독하기`, em::before로 `$ ` 프리픽스, 코드 폰트, 투명 배경+회색 테두리). 구독 중이면 터미널 그린(#6a9955) 텍스트
- **참고 - 조회수/통계**: 티스토리는 스킨 치환자로도, 외부 API로도 통계를 제공하지 않음 (티스토리 오픈 API 2024년 종료). 관리자 통계 화면에서만 확인 가능. 자체 수집이 필요하면 Google Analytics 삽입이 유일한 현실적 방법

**1.4.0 변경점 (실사용 피드백 반영):**
- **본문 폭 원복**: style.css의 `.prose { max-width: 65ch }`가 Tailwind `max-w-none`을 덮어써 본문이 560px로 좁아지던 버그 수정 (`max-width: none`). 원인: 빌드 전환 후 tailwind.css가 style.css보다 먼저 로드되면서 같은 특이도의 규칙은 style.css가 이김
- **인용문 통일**: 기본 + 에디터 style1~3 전부 미니멀 좌측 바("| 인용") 디자인으로 통일. 가운데 따옴표 장식/박스형 제거
- **조회수 표기 제거**: `[##_article_rep_log_cnt_##]`는 존재하지 않는 치환자(가이드에 조회수 치환자 자체가 없음). 티스토리는 스킨에 조회수를 제공하지 않음 - 관리자 통계에서만 확인 가능
- **빈 공지 섹션 숨김**: 공지 글이 없어도 `s_rct_notice` 래퍼가 출력되는 문제를 script.js(initNoticeCleanup)로 처리 (`#sidebar-notice`에 li 없으면 숨김)
- **알아둘 것 - 구독 버튼**: `[##_subscription_button_##]`은 비로그인/타계정 방문자에게만 렌더링됨. 블로그 소유자가 로그인한 상태에서는 티스토리가 버튼을 출력하지 않는 것이 정상

**1.3.0 변경점:**
- **목차(TOC) 구현**: script.js의 initTOC()가 글 상세 페이지에서 본문 h2/h3를 수집해 오른쪽 고정 목차 생성 (1500px 이상 화면 전용). 스크롤 스파이는 observer가 아닌 scroll 이벤트 + requestAnimationFrame 사용 (observer 금지 원칙 유지). skin.html 변경 없음 - 전부 JS 생성
- **본문 제목 강화**: `.prose-invert .article-content h2`(28px + 하단 구분선)/h3/h4 재정의 (style.css 19번 섹션)
- **코드블록 줄바꿈**: pre를 가로 스크롤에서 `white-space: pre-wrap`으로 변경 (Prism 테마가 code에 거는 `white-space: pre`도 함께 덮어씀)
- preview.html의 body id를 `tt-body-page`로 변경 (TOC 로컬 테스트용)
- **티스토리 업로드 주의**: skin.html/style.css는 스킨 편집 화면에서 갱신되지만, `images/script.js`와 `images/tailwind.css`는 "파일업로드" 탭에서 별도로 올려야 함 (기존 파일 삭제 후 재업로드). 이걸 빠뜨리면 404로 레이아웃 전체가 깨짐

**1.2.0 변경점 - Tailwind 빌드 전환:**
- CDN(cdn.tailwindcss.com) 제거. 미리 빌드한 `images/tailwind.css`(약 12KB, minify)를 로드
- 빌드 명령: 저장소 루트에서 `npm run build:css` (Node.js 필요, 설정은 `tailwind.config.js` + `tailwind-input.css`)
- **skin.html/preview.html에서 Tailwind 클래스를 추가/변경하면 반드시 다시 빌드해야 함** (빌드된 CSS에는 스캔 시점에 쓰인 클래스만 포함됨)
- accent 색상은 config에서 `var(--color-accent)`로 연결되어 있어, 관리자 옵션 색상이 `focus:ring-accent` 같은 Tailwind 클래스에도 반영됨
- `node_modules/`는 .gitignore 처리 (절대 커밋 금지)

- 스킨 이름: **Code Editor Blog** — Cursor/VS Code 에디터 스타일의 **다크 전용** 스킨 (1.1.0에서 라이트 모드 코드/변수 완전 제거)
- 레이아웃: 고정 헤더(h-12, 데스크톱 검색창 포함) + 왼쪽 사이드바(검색(모바일)/프로필+구독버튼/About/최근공지/카테고리/태그) + 메인 콘텐츠 + 고정 푸터
- `src/1.1.0/preview.html`: 티스토리 업로드 없이 브라우저에서 확인하는 로컬 미리보기 겸 스타일 쇼케이스 (마크다운/특수 블록 샘플 포함). file:// 차단 시 `python -m http.server 8000`으로 열 것
- **1.1.0에서 추가된 것**:
  - 페이지 지원: 태그 클라우드(`s_tag`), 공지(`s_notice_rep` 목록+본문), 방명록(`s_guest`+`[##_guestbook_group_##]`), 보호글(`s_article_protected`), 리스트 헤더(`s_list`+`s_list_empty`)
  - 구독 버튼: `[##_subscription_button_##]` (`.btn_subscription`, 구독 중 `.following`)
  - 검색 복구: 엔터 시 `/search/{query}` 이동하는 단순 방식 (observer 절대 금지 — 과거 무한 루프 원인)
  - Prism.js 구문 강조: `Prism.manual = true` + script.js가 `data-ke-language`를 `language-*` 클래스로 변환 후 수동 하이라이트. 코드블록에 맥OS 신호등 장식 + 복사 버튼
  - 티스토리 에디터 특수 블록 다크 스타일: 인용 3종(`data-ke-style`), hr 8종, fileblock, moreless, imageblock/grid/slide, 오픈그래프 카드 (style.css 13~18번 섹션)
  - 페이지네이션 올바른 문법: `<s_paging>` + 속성 치환자 `<a [##_prev_page_##] class="[##_no_more_prev_##]">`
- **스킨 옵션(index.xml) 연결 방식**: `[##_var_##]`는 skin.html에서만 치환되므로, head의 인라인 `<style>`에서 CSS 변수(`--color-accent`, `--font-code`)와 사이드바 너비를 주입. style.css의 `:root` 값은 폴백. 유지 중인 변수: accentColor, codeFont, sidebarWidth, enableSearch
- **미구현/보류**: 이미지 지연 로딩(변수도 제거됨), 형광펜 방어 CSS(style.css 17번 섹션에 주석 상태 — 실제 글로 에디터 출력 HTML 확인 후 활성화)

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

`reference/` 디렉토리에 실제로 존재하는 참고 스킨은 2개입니다 (과거 문서에 있던 5개 목록은 폐기됨):

1. **Odyssey(2025-12-10)**: 티스토리 공식 계열 스킨. 특수 블록 CSS(4683줄 이후), 구독 버튼(`[##_subscription_button_##]`, skin.html:716), 공지/보호글/페이징의 표준 마크업 레퍼런스
2. **BookClub(2025-12-15)**: 심플한 구조의 스킨. `s_list` 헤더+빈 상태 패턴(skin.html:375), 테이블 `data-ke-style` 스타일(style.css:4066 이후) 참고에 유용

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
- [ ] 댓글 섹션 표시 (현재 스킨은 `<s_rp>` + `[##_comment_group_##]` 사용, 방명록 페이지는 `[##_guestbook_group_##]`)
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
3. **점진적 테스트** - 모든 것이 완료될 때까지 기다리지 말 것
4. **핵심 기능 우선순위** (index.xml, skin.html, style.css, script.js)를 개선보다 먼저
