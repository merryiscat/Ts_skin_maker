/**
 * 와이어프레임 CSS 어휘 kit
 *
 * P1 은 이제 모델이 매번 자유롭게 "흑백 와이어프레임 HTML" 을 짓는다(고정 15칸 팔레트
 * 폐기, 2026-08-25). 그 HTML 이 일관된 흑백 골조로 보이도록, 여기 정의한 클래스만
 * 쓰게 한다. 두 곳이 이 파일 하나를 단일 출처로 쓴다.
 *
 *   1. 프롬프트 - concept-prompt.js 가 WIRE_CLASS_GUIDE 를 모델에게 보여 준다.
 *   2. 렌더 - loop/wire-render.js 가 WIRE_CSS 를 iframe 문서에 넣어 그린다.
 *
 * 색·간격은 여기서만 고정값으로 둔다. design.css 의 테마 변수 규칙과 별개다 -
 * 와이어는 테마와 무관한 흑백 도식이고, iframe 안(앱 DOM 밖)에서만 쓰인다.
 * screen-plan 스킬의 wireframe.css 어휘를 참고해 webapp 용으로 축약한 것이다.
 */

/** iframe 문서에 넣는 흑백 와이어 스타일. */
export const WIRE_CSS = `
*{box-sizing:border-box}
html,body{margin:0}
body{font:12px/1.45 system-ui,-apple-system,'Segoe UI',sans-serif;color:#111;background:#fff;padding:10px}
.wf{border:1px solid #111;background:#fff}
.wf-header{display:flex;align-items:center;gap:10px;padding:8px 10px;border-bottom:1px solid #111}
.wf-logo{font-weight:700;border:1px solid #111;padding:2px 8px}
.wf-nav{display:flex;gap:12px;flex:1;color:#444}
.wf-nav span{border-bottom:1px solid #bbb;padding-bottom:1px}
.wf-search{border:1px solid #111;padding:2px 12px;color:#777}
.wf-body{display:flex;gap:10px;padding:10px}
.wf-sidebar{flex:0 0 116px;display:flex;flex-direction:column;gap:8px;order:1}
.wf-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px;order:2}
/* 사이드바 좌/우/없음은 .wf 루트의 side-* 클래스로 앱이 강제한다(모델의 wireHtml 을 안 믿는다). */
.wf.side-right .wf-sidebar{order:3}
.wf.side-none .wf-sidebar{display:none}
.wf-block{border:1px solid #111;padding:6px;min-height:44px}
.wf-block b{display:block;font-size:10px;color:#666;margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em}
.wf-list{display:flex;flex-direction:column;gap:8px}
.wf-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.wf-grid.g2{grid-template-columns:repeat(2,1fr)}
.wf-card{border:1px solid #111;padding:6px;display:flex;flex-direction:column;gap:6px}
.wf-card.wide{grid-column:1/-1}
.wf-item{border:1px solid #111;padding:6px;display:flex;gap:8px;align-items:flex-start}
.wf-item.col{flex-direction:column}
.wf-item.rev{flex-direction:row-reverse}
.wf-img{border:1px solid #111;min-height:44px;
  background:
    linear-gradient(to top right,transparent calc(50% - .5px),#111 calc(50%),transparent calc(50% + .5px)),
    linear-gradient(to top left,transparent calc(50% - .5px),#111 calc(50%),transparent calc(50% + .5px))}
.wf-thumb{flex:0 0 60px;height:44px}
.wf-hero{height:130px}
.wf-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}
.wf-title{height:11px;background:#111;width:70%;border-radius:1px}
.wf-line{height:8px;background:#ccc;width:100%;border-radius:1px}
.wf-line.short{width:45%}
/* wf-img/title/line 은 글자 없는 자리 표시다. 모델이 안에 텍스트를 넣어도 깨지지 않게 숨긴다. */
.wf-img,.wf-title,.wf-line{font-size:0;overflow:hidden}
.wf-tag{display:inline-block;border:1px solid #999;padding:1px 7px;margin:2px 3px 0 0;color:#666;font-size:10px}
.wf-btn{display:inline-block;border:1px solid #111;padding:2px 10px}
.wf-paging{display:flex;gap:6px;justify-content:center;padding-top:4px}
.wf-paging span{border:1px solid #111;width:20px;height:18px;display:inline-flex;align-items:center;justify-content:center;color:#666}
.wf-cap{font-size:10px;color:#777}
`.trim();

/** 프롬프트에 넣는 클래스 사용 안내(모델용). WIRE_CSS 와 짝을 이룬다. */
export const WIRE_CLASS_GUIDE = [
  '### 쓸 수 있는 클래스 (이것만 조합해서 골조를 짓는다)',
  '- 뼈대: .wf(전체 테두리) > .wf-header + .wf-body',
  '- 머리: .wf-header 안에 .wf-logo(로고), .wf-nav(<span>메뉴</span> 여러 개), .wf-search',
  '- 본문: .wf-body 안에 .wf-sidebar 와 .wf-main. **사이드바를 왼쪽/오른쪽/없음 중 어디에 둘지는',
  '  네가 sidebar 필드로 정한다(컨셉에 맞게).** 다만 wireHtml 마크업 순서로 표현하지는 마라 -',
  '  앱이 sidebar 필드값대로 배치한다. 사이드바가 없으면(none) .wf-main 만 둔다.',
  '- 사이드바 블록: .wf-block 에 <b>프로필</b>/<b>카테고리</b>/<b>태그</b> 식 라벨.',
  '- 목록: 정해진 형태 목록은 없다. 아래 조각을 조합해 네가 설계한다.',
  '  - .wf-grid(3열 격자) / .wf-grid.g2(2열 격자), 그 안의 칸은 .wf-card( .wf-img + .wf-title )',
  '  - .wf-card.wide 는 격자에서 가로 전체를 차지한다(첫 글 강조 등)',
  '  - .wf-item(가로 항목: .wf-img.wf-thumb + .wf-text). .wf-item.rev 는 썸네일이 오른쪽,',
  '    .wf-item.col 은 세로 쌓기. 썸네일·요약 없이 .wf-title 만 두면 촘촘한 제목 줄',
  '  - .wf-img.wf-hero 는 큰 대표사진 한 장',
  '  이 클래스 밖의 배치(인라인 style, 새 클래스)는 렌더러가 그리지 못한다 - 조합만 자유다.',
  '- 조각: .wf-img(이미지 자리, 자동 X 표시), .wf-title(제목 줄), .wf-line/.wf-line.short(본문 줄),',
  '  .wf-tag(태그 칩), .wf-btn(버튼), .wf-paging(<span>1</span>... 페이지네이션), .wf-cap(작은 캡션 텍스트)',
  '- 라벨 텍스트는 "로고/메뉴/검색/프로필/카테고리/태그/댓글" 처럼 자리 이름만. 실제 글 문장은 쓰지 않는다.',
  '- .wf-img / .wf-title / .wf-line 안에는 글자를 절대 넣지 마라(빈 막대·이미지 자리 표시다). 이것들은 비워 둔다.',
].join('\n');
