/**
 * 디자인 CSS 생성 (구조 + 색, 2026-08-25 개편)
 *
 * 고른 컨셉과 상담을 받아, 고정 골격 위에 얹을 CSS 한 레이어를 만든다. 이 CSS 는
 * base style.css 와 골격의 :root 주입 "뒤에" 붙어(가장 마지막) 이긴다. 예전엔 색만
 * 입혔지만(테마), 이제는 **목록·본문의 배치(구조)까지 CSS 로 만든다** - 격자/히어로/
 * 매거진/여백/열수 등. 컨셉마다 구조가 달라지도록 하려는 것이다.
 *
 * 왜 CSS 로 구조를? 목록 마크업(.card 반복)은 고정이고, 배치는 전부 CSS 로 갈린다
 * (grid/hero 도 CSS 다). 그래서 고정 스켈레톤을 안 건드리고도 구조를 열 수 있다.
 *
 * 안전: 티스토리 치환자·마크업은 못 건드린다(이건 CSS다). base 가 안전 폴백이라,
 * 생성이 비어도 중립 목록으로 렌더된다. 글꼴만 폰트 시스템이 맡도록 --font-* 대신
 * bodyFont/headingFont 필드로 고른다.
 */

import { FONT_CATALOG } from '../presets/base/fonts.js';

const EFFORT_DESIGN = 'medium';

const FONT_IDS = FONT_CATALOG.map((f) => f.id);

/** 디자인 출력 스키마. OpenAI strict 모드용으로 전부 required + additionalProperties:false. */
export const DESIGN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['css', 'sidebar', 'bodyFont', 'headingFont', 'notes'],
  properties: {
    css: {
      type: 'string',
      description:
        '고정 골격 위에 얹을 CSS. 목록·본문의 배치(구조)와 색·타이포를 함께 만든다. ' +
        'CSS 만. <style> 태그로 감싸지 말 것.',
    },
    sidebar: {
      type: 'string',
      enum: ['left', 'right', 'none'],
      description: '사이드바 위치. none 이면 골격이 사이드바 마크업을 아예 뺀다. 컨셉에 맞게 고른다',
    },
    bodyFont: { type: 'string', enum: FONT_IDS, description: '본문 글꼴 id. 컨셉에 맞게 카탈로그에서 고른다' },
    headingFont: {
      type: 'string',
      enum: ['same', ...FONT_IDS],
      description: "제목 글꼴 id. 본문과 같게 하려면 'same'",
    },
    notes: { type: 'string', description: '이 디자인이 무엇을 했는지 한 문장. 사용자에게 보인다' },
  },
};

/** :root 에 재정의할 수 있는 변수(색·모서리·폭). 글꼴 변수는 뺀다(폰트 시스템 담당). */
const CSS_VARS = [
  '--color-bg        페이지 배경색',
  '--color-surface   카드·사이드바 등 표면색(배경보다 살짝 다른 톤)',
  '--color-border    실선·구분선 색',
  '--color-text      본문 글자색',
  '--color-text-dim  보조 글자색(날짜·요약 등)',
  '--color-accent    링크·강조색',
  '--radius          모서리 둥글기(예: 0, 4px, 10px, 999px)',
  '--content-max     본문·목록의 최대 폭(예: 40rem, 60rem, none)',
  '--sidebar-width   사이드바 폭(예: 13rem, 18rem)',
  '--grid-min        격자 한 칸 최소 폭(예: 15rem, 20rem)',
];

/**
 * 겨냥할 만한 클래스 손잡이. 배치를 바꾸는 "구조 훅"과 꾸미는 "요소 훅"을 함께 준다.
 * 이름이 곧 계약이라, 여기 적힌 대로 써야 실제로 걸린다.
 */
const CLASS_HOOKS = [
  '# 구조 (배치를 바꾼다)',
  '.site-body        사이드바+본문을 나란히 두는 가로 컨테이너',
  '.main-inner       글 목록이 담기는 컨테이너. 여기에 display:grid 등으로 목록 배치를 바꾼다',
  '.card             글 하나(목록에서 여러 번 반복된다). 크기·방향·강조',
  '.card:first-of-type  첫 글. 히어로처럼 크게 강조할 수 있다',
  '.card-thumb       썸네일 감싸개   /   .card-thumb img  썸네일 이미지',
  '.card-body        카드 안 텍스트 묶음(제목·요약·메타)',
  '# 요소 (꾸민다)',
  '.site-header      상단 고정 헤더   /   .site-title  블로그 제목   /   .top-nav a  헤더 메뉴',
  '.sidebar          사이드바   /   .side-title  사이드바 섹션 제목',
  '.card-title       목록 글 제목   /   .card-summary  요약   /   .card-meta  날짜·카테고리 줄   /   .card-cat  카테고리 라벨',
  '.post-title       글 상세 제목   /   .article-content  본문(그 안 h2/h3/p/blockquote/pre/code/table/a)',
  '.tag              태그 칩   /   .paging a  페이지 번호   /   .site-footer  푸터   /   a:hover  링크 hover',
];

function fontCatalogSummary() {
  return FONT_CATALOG.map((f) => `- ${f.id} = ${f.label} (${f.cat})`).join('\n');
}

/**
 * 디자인 CSS 를 쓸 때의 공통 가이드(규칙·변수·클래스·글꼴). 생성(buildDesignPrompt)과
 * 편집(W1 의 buildStyleEditPrompt)이 같은 규약을 봐야 어긋나지 않으므로 한 곳에 둔다.
 */
export function designGuide() {
  return [
    '## 고정 골격 위의 디자인 CSS',
    '',
    '스킨은 검증된 고정 골격(HTML) 위에 CSS 로 옷을 입힌 것이다. 클래스 이름은 정해져',
    '있고, 이 CSS 는 "가장 마지막에 얹히는" 레이어라 base 를 덮어쓴다. 글 목록은',
    '`.main-inner` 안에서 `.card`(글 하나)가 여러 개 반복되는 마크업이며, 그 배치는',
    '전부 CSS 로 정해진다. 그래서 마크업을 안 건드리고도 구조를 바꿀 수 있다.',
    '',
    '## 배치는 아래 세 갈래 중 하나를 골라 그대로 쓴다 (직접 격자를 발명하지 말 것)',
    '',
    '목록 배치는 반드시 아래 검증된 패턴 하나를 base 로 쓰고, 값(여백·색)만 컨셉에 맞게',
    '조절한다. 직접 grid-template 을 지어내면 칸이 너무 좁아져 글자가 세로로 쪼개진다.',
    '',
    'A) 세로 목록 (기본, 가장 안전):',
    '   .main-inner { display: block; }',
    '   .card { display: flex; gap: 1.25rem; align-items: flex-start; margin-bottom: 2rem; }',
    '   .card-thumb { flex: 0 0 34%; }        /* 사진 없는 컨셉이면 .card-thumb{display:none} 가능 */',
    '   .card-body { flex: 1 1 auto; min-width: 0; }',
    '',
    'B) 사진 격자 (매거진·갤러리). 격자를 쓰려면 사이드바는 none 으로:',
    '   .main-inner { display: grid; grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr)); gap: 1.5rem; }',
    '   .card { display: block; }',
    '   .card-thumb img { aspect-ratio: 4/3; object-fit: cover; }',
    '   @media (max-width: 768px) { .main-inner { grid-template-columns: 1fr; } }',
    '',
    'C) 히어로 (첫 글 크게 + 아래 세로 목록). 격자와 절대 섞지 말 것:',
    '   .card:first-of-type { position: relative; min-height: 60vh; margin-bottom: 2.5rem; }',
    '   .card:first-of-type .card-thumb { position: absolute; inset: 0; }',
    '   .card:first-of-type .card-thumb img { width: 100%; height: 100%; object-fit: cover; }',
    '   .card:first-of-type .card-body { position: absolute; inset: auto 0 0 0; padding: 1.5rem; background: linear-gradient(to top, rgba(0,0,0,.65), transparent); color: #fff; }',
    '   .card:not(:first-of-type) { display: flex; gap: 1rem; margin-bottom: 1.5rem; }',
    '   .card:not(:first-of-type) .card-thumb { flex: 0 0 30%; }',
    '',
    '## 절대 하지 말 것 (화면이 깨진다)',
    '',
    '- minmax 최소값을 17rem 보다 작게 두지 말 것. auto-fit/auto-fill 로 열을 만들 때 칸이',
    '  좁아지면 글자가 세로로 쪼개진다.',
    '- .card 에 width:100vw / 고정 px 폭을 주지 말 것. 히어로와 격자를 한 화면에 섞지 말 것.',
    '- 구조 컨테이너(.site-body/.main/.main-inner/.sidebar/.card)나 글 목록 전체를 display:none 하지 말 것.',
    '- 본문 칸은 사이드바가 있으면 좁다(600~900px). 그 폭에서도 제목이 한 줄에 여러 글자로',
    '  보이는지 스스로 점검하라.',
    '',
    '## 그 밖의 규칙',
    '',
    '- 순수 CSS 만. <style> 금지. JavaScript·@import·외부 url() 금지. 이미지 max-width:100%.',
    '- 위 배치 base 에 색(:root 변수)·타이포(크기/굵기/간격)·테두리·여백을 얹어 컨셉을 완성한다.',
    '  컨셉이 다르면 어느 배치를 고르는지, 색·여백·강조가 달라야 한다.',
    '- 글자와 배경 대비 충분히. hover 에만 의존 말 것(모바일). 가로 스크롤 금지.',
    '- 글꼴은 --font-* 로 정하지 말고 bodyFont/headingFont 필드로 고른다.',
    '',
    '## :root 에 재정의할 수 있는 변수',
    '',
    CSS_VARS.join('\n'),
    '',
    '## 겨냥할 수 있는 클래스',
    '',
    CLASS_HOOKS.join('\n'),
    '',
    '## 고를 수 있는 글꼴 (bodyFont / headingFont)',
    '',
    fontCatalogSummary(),
  ].join('\n');
}

export function buildDesignPrompt({ purpose, concept } = {}) {
  const c = concept || {};
  const system = [
    '너는 티스토리 블로그 스킨을 CSS 로 실현하는 디자이너다.',
    '',
    designGuide(),
    '',
    '## 말투',
    '',
    'notes 는 한국어 한 문장. 이모지 금지.',
  ].join('\n');

  const messages = [
    {
      role: 'user',
      content: [
        `블로그 용도: ${String(purpose || '').trim() || '(말하지 않음)'}`,
        '',
        `고른 컨셉: ${c.name || ''}`,
        '컨셉 설명:',
        c.look || c.pitch || '(없음)',
        c.hint ? `\n고른 화면 구성(이 방향을 따른다): ${c.hint}` : '',
        c.note ? `\n사용자가 덧붙인 의견: ${c.note}` : '',
        '',
        '이 컨셉을 실제 화면으로 실현하는 CSS 를 써라. 고른 화면 구성을 살려 목록·본문의',
        '배치(구조)와 색·타이포를 함께 만들고, 사이드바 위치와 어울리는 글꼴을 고른다.',
      ].join('\n'),
    },
  ];

  return { system, messages, schema: DESIGN_SCHEMA, effort: EFFORT_DESIGN };
}

/**
 * 생성된 CSS 를 가볍게 소독한다. 위험하거나 규칙을 어긴 조각을 걷어낸다.
 * 문법이 조금 틀려도 브라우저가 그 규칙만 무시하므로, 여기서는 위험한 것만 막는다.
 */
export function sanitizeThemeCss(css) {
  let s = String(css || '');
  // <style>/</style> 로 문서를 깨거나, @import·remote url·JS 를 넣는 것을 막는다
  s = s.replace(/<\/?\s*style[^>]*>/gi, '');
  s = s.replace(/@import[^;]*;?/gi, '');
  s = s.replace(/expression\s*\(/gi, '(');
  s = s.replace(/javascript:/gi, '');
  // url(...) 중 data: 가 아닌 원격 참조 제거(폰트·이미지 외부 로드 차단)
  s = s.replace(/url\(\s*['"]?\s*(https?:)?\/\/[^)]*\)/gi, 'none');
  return s.trim();
}
