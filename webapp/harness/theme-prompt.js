/**
 * ④ 테마 CSS 실현 (생성형 뒷단, 2026-08-24)
 *
 * 고른 안의 look(시각 성격 서술)을 받아, 고정 골격 위에 얹을 CSS 테마 레이어를
 * 만든다. 이 CSS 는 base style.css 와 골격의 :root 주입 "뒤에" 붙어(가장 마지막),
 * 색·질감·모서리·그림자·hover 를 덮어써 컨셉의 분위기를 실제로 입힌다.
 *
 * 안전: 모델은 골격의 티스토리 치환자·구조를 못 건드린다(이건 CSS다). base 가
 * 레이아웃·반응형·티스토리 특수 처리를 이미 책임지므로, 테마가 색을 덮어도 구조는
 * 안 깨진다. 글꼴은 이 도구의 폰트 시스템(폼·업로드)이 계속 맡도록, 테마는 --font-*
 * 를 건드리지 않고 대신 bodyFont/headingFont 를 카탈로그에서 골라 낸다.
 */

import { FONT_CATALOG } from '../presets/base/fonts.js';

const EFFORT_THEME = 'medium';

const FONT_IDS = FONT_CATALOG.map((f) => f.id);

/** 테마 출력 스키마. OpenAI strict 모드용으로 전부 required + additionalProperties:false. */
export const THEME_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['css', 'bodyFont', 'headingFont', 'notes'],
  properties: {
    css: {
      type: 'string',
      description:
        '고정 골격 위에 얹을 CSS 테마. :root 에 색·모서리 변수를 재정의하고, 아래 클래스들을 ' +
        '겨냥해 테두리·그림자·여백·hover 등을 손본다. CSS 만. <style> 태그로 감싸지 말 것.',
    },
    bodyFont: { type: 'string', enum: FONT_IDS, description: '본문 글꼴 id. look 에 맞게 카탈로그에서 고른다' },
    headingFont: {
      type: 'string',
      enum: ['same', ...FONT_IDS],
      description: "제목 글꼴 id. 본문과 같게 하려면 'same'. look 이 제목을 달리 하면 다른 것을 고른다",
    },
    notes: { type: 'string', description: '이 테마가 무엇을 했는지 한 문장. 사용자에게 보인다' },
  },
};

/** 골격이 내주는 CSS 사용자 정의 속성. 테마가 :root 에 재정의해 색을 바꾼다. */
const CSS_VARS = [
  '--color-bg        페이지 배경색',
  '--color-surface   카드·사이드바 등 표면색(배경보다 살짝 다른 톤)',
  '--color-border    실선·구분선 색',
  '--color-text      본문 글자색',
  '--color-text-dim  보조 글자색(날짜·요약 등)',
  '--color-accent    링크·강조색',
  '--radius          모서리 둥글기(예: 0, 4px, 10px, 999px)',
];

/**
 * 테마가 겨냥할 만한 클래스 손잡이. 전부 나열하지 않고 자주 손보는 것만.
 * 이름이 곧 계약이라, 여기 적힌 대로 써야 실제로 걸린다.
 */
const CLASS_HOOKS = [
  '.site-header      상단 고정 헤더',
  '.site-title       헤더의 블로그 제목',
  '.top-nav a        헤더 메뉴 링크',
  '.sidebar          사이드바',
  '.side-title       사이드바 섹션 제목(카테고리/태그 등)',
  '.card             글 목록의 한 글',
  '.card-thumb img   목록 썸네일 이미지',
  '.card-title       목록 글 제목',
  '.card-summary     목록 글 요약',
  '.card-meta        목록 글의 날짜·카테고리 줄',
  '.card-cat         카테고리 라벨',
  '.post-title       글 상세의 제목',
  '.article-content  글 본문 영역(그 안 h2/h3/p/blockquote/pre/code/table/a)',
  '.tag              태그 칩',
  '.paging a         페이지 번호',
  '.site-footer      하단 푸터',
  'a:hover           링크에 마우스 올렸을 때',
];

/** 카탈로그를 프롬프트용으로 압축한다. id = 라벨 (갈래). */
function fontCatalogSummary() {
  return FONT_CATALOG.map((f) => `- ${f.id} = ${f.label} (${f.cat})`).join('\n');
}

/**
 * 테마 CSS 를 쓸 때의 공통 가이드(규칙·변수·클래스·글꼴). 생성(buildThemePrompt)과
 * 편집(W1 의 buildStyleEditPrompt)이 같은 규약을 봐야 어긋나지 않으므로 한 곳에 둔다.
 */
export function themeGuide() {
  return [
    '## 고정 골격 위의 테마 CSS',
    '',
    '스킨은 검증된 고정 골격(HTML) 위에 CSS 로 옷을 입힌 것이다. 골격의 구조와',
    '클래스 이름은 정해져 있고, 테마는 그 위에 "가장 마지막에 얹히는" CSS 레이어다.',
    '이 레이어는 base 스타일과 골격의 :root 주입을 덮어쓰므로, 여기서 :root 에 색을',
    '다시 정의하면 그 색이 이긴다.',
    '',
    '## 규칙',
    '',
    '- 순수 CSS 만. <style> 태그로 감싸지 말 것. JavaScript 금지.',
    '- @import 금지. url() 로 외부 파일(폰트·이미지)을 불러오지 말 것.',
    '- 레이아웃을 부수지 말 것: 구조 컨테이너(.site-body/.main/.sidebar/.card 등)에',
    '  display 를 none 으로 두거나 내용을 가리는 position 을 걸지 말 것.',
    '- 글꼴은 CSS 로 정하지 말 것(--font-* 를 건드리지 말 것). 대신 bodyFont/headingFont',
    '  필드로 카탈로그에서 골라 낸다. 도구의 폰트 시스템이 그 값을 적용한다.',
    '- --title-scale, --sidebar-width, --content-max 도 건드리지 말 것(따로 정해진다).',
    '- 색약·저대비를 피한다. 글자와 배경의 대비를 충분히 둔다.',
    '- hover 효과에만 의존하지 말 것(모바일에는 hover 가 없다).',
    '',
    '## :root 에 재정의할 수 있는 색·모서리 변수',
    '',
    CSS_VARS.join('\n'),
    '',
    '## 손볼 수 있는 클래스(이름 그대로 써야 걸린다)',
    '',
    CLASS_HOOKS.join('\n'),
    '',
    '## 고를 수 있는 글꼴 (bodyFont / headingFont)',
    '',
    fontCatalogSummary(),
  ].join('\n');
}

export function buildThemePrompt({ purpose, concept } = {}) {
  const c = concept || {};
  const system = [
    '너는 티스토리 블로그 스킨의 "테마 CSS"를 쓰는 디자이너다.',
    '',
    themeGuide(),
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
        `고른 방향: ${c.name || ''}`,
        `무엇을 하게 하나: ${c.pitch || ''}`,
        '',
        '이 방향의 시각 성격(look):',
        c.look || '(없음)',
        c.note ? `\n사용자가 덧붙인 의견: ${c.note}` : '',
        '',
        '이 look 을 실제로 입히는 테마 CSS 를 쓰고, 어울리는 글꼴을 골라라.',
      ].join('\n'),
    },
  ];

  return { system, messages, schema: THEME_SCHEMA, effort: EFFORT_THEME };
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
