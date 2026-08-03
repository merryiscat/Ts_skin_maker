# src/ 스킨 버전별 변경점

손으로 만든 티스토리 스킨 **Code Editor Blog** 의 이력입니다.
최신 두 버전은 `CLAUDE.md` 에 있고, 그보다 오래된 것이 여기로 옵니다.

`CLAUDE.md` 는 매 세션 통째로 읽히는 파일이라, 버전이 쌓일수록 정작 중요한 규칙이
변경 이력에 묻힙니다. 이력은 필요할 때만 찾아보면 되므로 갈라 두었습니다.

---

## 1.8.0 - 마크다운 글 문단 간격

**문단 간격 복원 보강**: 1.7.0 의 빈 줄(`p:empty`) 복원만으로는 마크다운 모드 글이 해결되지
않았습니다. 마크다운 글은 빈 `p` 없이 문단이 연속 `<p>` 로 출력되는데 티스토리가 여백을 0 으로
만들어 벽처럼 붙습니다. `.article-content p { margin-bottom: 0.875em !important }` 를 추가했습니다.

**`!important` 가 반드시 필요합니다.** 티스토리 콘텐츠 CSS 가 크로스 오리진 시트로 `p` 여백을
0 으로 강제하기 때문에 일반 규칙으로는 못 이깁니다. 라이브 주입 테스트로 검증했습니다.

## 1.7.0 - 문단 줄바꿈 복원

티스토리는 본문을 `.tt_article_useless_p_margin` 으로 감싸 `p` 여백을 0 으로 만들고, 에디터의
빈 줄을 빈 `<p></p>` 로 출력합니다. 빈 요소는 높이 0 으로 접혀 줄바꿈이 사라집니다.
`.article-content p:empty { min-height: 1.7em }` 으로 복원했습니다.
라이브 페이지에 CSS 를 임시 주입해 검증했습니다(0px → 27px).

## 1.6.0 - 구독 버튼 위치 조정

- **구독 버튼**: 프로필 카드 안에서 About 섹션 하단으로 이동. `$ ` 터미널 프롬프트 프리픽스는
  별로라는 피드백을 받아 제거하고 담백한 고스트 버튼으로. 구독 중 상태는 터미널 그린 텍스트 유지
- **참고 - 서식/페이지 기능**: 서식은 에디터용 글 템플릿이라 스킨 대응이 필요 없습니다.
  페이지(독립 고정 문서)는 `<s_page_rep>` 치환자가 필요한데 현재 미지원입니다.
  사용자가 페이지 기능을 쓰게 되면 추가해야 합니다

## 1.5.0 - 사이드바 메뉴, 인용문 색

- **사이드바 Menu 섹션 추가**: 방명록(`[##_guestbook_link_##]`) / 태그 클라우드
  (`[##_taglog_link_##]`) 바로가기. 페이지 마크업은 1.1.0 부터 있었지만 들어가는 링크가 없었습니다
- **인용문 좌측 바 색상**: 회색에서 accent(파랑)로 변경 (3곳 모두)
- **구독 버튼 재디자인**: 파란 단색 버튼이 튄다는 피드백 → 터미널 프롬프트 고스트 버튼
  (`$ 구독하기`, `em::before` 로 `$ ` 프리픽스, 코드 폰트, 투명 배경 + 회색 테두리).
  구독 중이면 터미널 그린(`#6a9955`) 텍스트
- **참고 - 조회수/통계**: 티스토리는 스킨 치환자로도, 외부 API 로도 통계를 제공하지 않습니다
  (티스토리 오픈 API 는 2024년 종료). 관리자 통계 화면에서만 확인할 수 있고, 자체 수집이
  필요하면 Google Analytics 삽입이 유일한 현실적 방법입니다

## 1.4.0 - 실사용 피드백 반영

- **본문 폭 원복**: `style.css` 의 `.prose { max-width: 65ch }` 가 Tailwind `max-w-none` 을
  덮어써 본문이 560px 로 좁아지던 버그 수정(`max-width: none`).
  원인은 빌드 전환 후 `tailwind.css` 가 `style.css` 보다 먼저 로드되면서, 같은 특이도의
  규칙은 나중에 온 `style.css` 가 이겼기 때문입니다
- **인용문 통일**: 기본 + 에디터 style1~3 전부 미니멀 좌측 바 디자인으로 통일.
  가운데 따옴표 장식과 박스형을 제거했습니다
- **조회수 표기 제거**: `[##_article_rep_log_cnt_##]` 는 존재하지 않는 치환자입니다.
  가이드에 조회수 치환자 자체가 없습니다
- **빈 공지 섹션 숨김**: 공지 글이 없어도 `s_rct_notice` 래퍼가 출력되는 문제를
  `script.js`(`initNoticeCleanup`)로 처리 (`#sidebar-notice` 에 `li` 가 없으면 숨김)
- **알아둘 것 - 구독 버튼**: `[##_subscription_button_##]` 은 비로그인/타계정 방문자에게만
  렌더링됩니다. 블로그 소유자가 로그인한 상태에서는 버튼이 안 나오는 것이 정상입니다

## 1.3.0 - 목차, 본문 제목, 코드블록

- **목차(TOC) 구현**: `script.js` 의 `initTOC()` 가 글 상세 페이지에서 본문 `h2`/`h3` 를 모아
  오른쪽 고정 목차를 만듭니다(1500px 이상 화면 전용). 스크롤 스파이는 observer 가 아니라
  scroll 이벤트 + `requestAnimationFrame` 을 씁니다(observer 금지 원칙 유지).
  `skin.html` 변경 없이 전부 JS 로 생성합니다
- **본문 제목 강화**: `.prose-invert .article-content h2`(28px + 하단 구분선)/`h3`/`h4` 재정의
- **코드블록 줄바꿈**: `pre` 를 가로 스크롤에서 `white-space: pre-wrap` 으로 변경
  (Prism 테마가 `code` 에 거는 `white-space: pre` 도 함께 덮어씀)
- `preview.html` 의 body id 를 `tt-body-page` 로 변경 (목차 로컬 테스트용)
- **업로드 주의**: `skin.html`/`style.css` 는 스킨 편집 화면에서 갱신되지만
  `images/script.js` 와 `images/tailwind.css` 는 파일업로드 탭에서 별도로 올려야 합니다
  (기존 파일 삭제 후 재업로드). 빠뜨리면 404 로 레이아웃 전체가 깨집니다

## 1.2.0 - Tailwind 빌드 전환

- CDN(`cdn.tailwindcss.com`) 제거. 미리 빌드한 `images/tailwind.css`(약 12KB, minify)를 로드합니다.
  CDN 방식은 방문자 브라우저가 매번 CSS 를 실시간 생성해 느리고, Tailwind 공식이 프로덕션
  사용을 금지하는 방식이었습니다
- 빌드 명령은 저장소 루트에서 `npm run build:css` (Node.js 필요,
  설정은 `tailwind.config.js` + `tailwind-input.css`)
- **`skin.html`/`preview.html` 에서 Tailwind 클래스를 추가하거나 바꾸면 반드시 다시 빌드해야
  합니다.** 빌드된 CSS 에는 스캔 시점에 쓰인 클래스만 들어갑니다
- accent 색상은 config 에서 `var(--color-accent)` 로 연결되어 있어, 관리자 옵션 색상이
  `focus:ring-accent` 같은 Tailwind 클래스에도 반영됩니다
- `node_modules/` 는 `.gitignore` 처리 (절대 커밋 금지)

## 1.1.0 - 페이지 지원과 에디터 블록

- **페이지 지원**: 태그 클라우드(`s_tag`), 공지(`s_notice_rep` 목록 + 본문),
  방명록(`s_guest` + `[##_guestbook_group_##]`), 보호글(`s_article_protected`),
  리스트 헤더(`s_list` + `s_list_empty`)
- **구독 버튼**: `[##_subscription_button_##]` (`.btn_subscription`, 구독 중 `.following`)
- **검색 복구**: 엔터 시 `/search/{query}` 로 이동하는 단순 방식.
  **observer 는 절대 쓰지 않습니다** - 과거 무한 루프의 원인이었습니다
- **Prism.js 구문 강조**: `Prism.manual = true` + `script.js` 가 `data-ke-language` 를
  `language-*` 클래스로 변환한 뒤 수동 하이라이트. 코드블록에 맥OS 신호등 장식과 복사 버튼
- **에디터 특수 블록 다크 스타일**: 인용 3종(`data-ke-style`), `hr` 8종, fileblock, moreless,
  imageblock/grid/slide, 오픈그래프 카드 (`style.css` 13~18번 섹션)
- **라이트 모드 완전 제거**: 다크 전용 스킨으로 확정
