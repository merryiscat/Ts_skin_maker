/**
 * 스킨 스펙
 *
 * P2 가 사용자에게 보여주는 항목, 골격이 받는 플래그, 모델이 내놓아야 하는 출력이
 * 전부 이 파일 하나에서 나온다. 세 곳에 같은 목록을 따로 두면 반드시 어긋난다.
 *
 * 구조는 두 층이다.
 *
 *   컨셉 (P1) - 이 블로그가 방문자에게 무엇을 하게 할 것인가. 모델이 만든다.
 *   세부 (P2) - 그 컨셉을 이루는 구체적인 값. 컨셉이 기본값을 정하고 사용자가 고친다.
 *
 * 세부는 전부 플래그라서 바꾸는 데 API 가 들지 않는다. P2 가 마음껏 눌러 볼 수 있는
 * 화면인 이유이고, W1 의 대화와 갈리는 지점이다.
 */

import { LAYOUTS, LIST_STYLES } from '../presets/base/skeleton.js';
import { FONT_CATALOG, fontById } from '../presets/base/fonts.js';

/** 밝은 배경 색 묶음. */
const LIGHT = {
  'color-bg': '#ffffff',
  'color-surface': '#f7f7f5',
  'color-border': '#e2e2df',
  'color-text': '#24211d',
  'color-text-dim': '#6b665f',
};

/** 어두운 배경 색 묶음. */
const DARK = {
  'color-bg': '#1e1e1e',
  'color-surface': '#252526',
  'color-border': '#3c3c3c',
  'color-text': '#d4d4d4',
  'color-text-dim': '#9d9d9d',
};

/**
 * P2 의 세부 항목.
 *
 * id      - 스펙 키
 * label   - 화면에 보이는 이름
 * type    - single 은 하나만, multi 는 여럿
 * options - 고를 수 있는 값
 * default - 아무 컨셉도 없을 때의 값
 * note    - 화면에 같이 보여줄 짧은 설명
 */
export const DETAIL_FIELDS = [
  {
    id: 'sidebar',
    label: '사이드바',
    type: 'single',
    default: 'left',
    options: [
      { value: 'left', label: '왼쪽' },
      { value: 'right', label: '오른쪽' },
      { value: 'none', label: '없음' },
    ],
  },
  {
    id: 'sidebarBlocks',
    label: '사이드바 메뉴',
    type: 'multi',
    default: ['profile', 'categories', 'tags', 'menu'],
    dependsOn: { sidebar: ['left', 'right'] },
    options: [
      { value: 'profile', label: '프로필' },
      { value: 'categories', label: '카테고리' },
      { value: 'tags', label: '태그' },
      { value: 'notice', label: '공지' },
      { value: 'menu', label: '메뉴' },
    ],
  },
  {
    id: 'sidebarWidth',
    label: '사이드바 너비',
    type: 'single',
    default: 'normal',
    dependsOn: { sidebar: ['left', 'right'] },
    options: [
      { value: 'narrow', label: '좁게', note: '13rem' },
      { value: 'normal', label: '보통', note: '16rem' },
      { value: 'wide', label: '넓게', note: '20rem' },
    ],
  },
  {
    id: 'listStyle',
    label: '글 목록',
    type: 'single',
    default: 'standard',
    options: [
      { value: 'standard', label: '표준', note: '제목과 요약' },
      { value: 'plain', label: '단순', note: '제목만 크게' },
      { value: 'grid', label: '그리드', note: '썸네일 격자' },
      { value: 'dense', label: '밀집', note: '한 화면에 많이' },
      { value: 'hero', label: '히어로', note: '첫 글을 사진으로 크게' },
    ],
  },
  {
    id: 'listItems',
    label: '목록에 넣을 것',
    type: 'multi',
    default: ['summary'],
    options: [
      { value: 'thumbnail', label: '썸네일' },
      { value: 'summary', label: '요약' },
      // 태그 옵션은 뺐다. 티스토리가 목록 안에서 태그를 반복 출력하는 방법을
      // 제공하지 않아 켜도 아무것도 나오지 않는다. 골격 주석 참조.
      { value: 'commentCount', label: '댓글 수' },
    ],
  },
  {
    id: 'contentWidth',
    label: '본문 폭',
    type: 'single',
    default: 'normal',
    options: [
      { value: 'narrow', label: '좁게', note: '한 줄 45자' },
      { value: 'normal', label: '보통', note: '한 줄 55자' },
      { value: 'wide', label: '넓게', note: '한 줄 70자' },
    ],
  },
  {
    id: 'fontSize',
    label: '본문 글자 크기',
    type: 'single',
    default: 'normal',
    options: [
      { value: 'small', label: '작게', note: '14px' },
      { value: 'normal', label: '보통', note: '15px' },
      { value: 'large', label: '크게', note: '17px' },
    ],
  },
  {
    id: 'titleScale',
    label: '제목 글자 크기',
    // 본문과 별개로 글 제목·목록 제목의 크기를 키우거나 줄인다. 본문 크기에
    // 곱해지는 배율이라, 본문 크기를 바꿔도 제목과의 비율은 유지된다.
    type: 'single',
    default: 'normal',
    options: [
      { value: 'small', label: '작게' },
      { value: 'normal', label: '보통' },
      { value: 'large', label: '크게' },
    ],
  },
  {
    id: 'background',
    label: '배경',
    type: 'single',
    default: 'light',
    // palette: 배경 밝기·강조색은 "팔레트" 단계로 따로 뺀다 (2026-08-23 피드백).
    // 지금은 폼에서 감추고 색 없이(중립) 만든다. 값은 기본값(밝게)이 그대로 쓰인다.
    palette: true,
    options: [
      { value: 'light', label: '밝게' },
      { value: 'dark', label: '어둡게' },
    ],
  },
  {
    id: 'accent',
    label: '강조색',
    type: 'color',
    // 색 없이 만드는 동안은 강조색을 본문 글자색과 같은 중립으로 둔다. 팔레트
    // 단계에서 실제 색을 고른다.
    default: '#24211d',
    palette: true,
    note: '링크와 강조에만 쓰입니다',
  },
  {
    id: 'bodyFont',
    label: '본문 글꼴',
    // 검색형 입력칸(콤보박스)으로 낸다. 무료 웹폰트가 많아 칩으로는 안 된다.
    type: 'font',
    default: 'sans',
    options: FONT_CATALOG.map((f) => ({ value: f.id, label: f.label, cat: f.cat })),
  },
  {
    id: 'headingFont',
    label: '제목 글꼴',
    // 제목을 본문과 다른 글꼴로 쓸 수 있게 스펙에는 열어 두되, P2 폼에는 내지
    // 않는다(chatOnly). 대다수는 분리하지 않으므로 기본 화면을 어지럽히지 않고,
    // 원하는 사용자는 W1 대화에서 "제목만 명조로" 처럼 말하면 이 값이 바뀐다.
    // 기본값 'same' 은 본문 글꼴을 그대로 쓴다(= 분리 안 함).
    type: 'font',
    default: 'same',
    chatOnly: true,
    options: [{ value: 'same', label: '본문과 같게' }].concat(
      FONT_CATALOG.map((f) => ({ value: f.id, label: f.label, cat: f.cat })),
    ),
  },
  {
    id: 'features',
    label: '기능',
    type: 'multi',
    default: ['search'],
    options: [
      { value: 'toc', label: '목차', note: '넓은 화면에서만 나옵니다' },
      { value: 'search', label: '검색' },
      { value: 'subscribe', label: '구독 버튼', note: '비로그인 방문자에게만 보입니다' },
      { value: 'syntax', label: '구문 강조', note: '코드가 많은 글에 씁니다' },
    ],
  },
];

/** 항목 id 로 정의를 찾는다. */
export const FIELD_BY_ID = Object.fromEntries(DETAIL_FIELDS.map((f) => [f.id, f]));

/** 아무것도 안 정했을 때의 세부 값. */
export function defaultDetails() {
  const out = {};
  for (const f of DETAIL_FIELDS) {
    out[f.id] = Array.isArray(f.default) ? [...f.default] : f.default;
  }
  return out;
}

const WIDTHS = { narrow: '38rem', normal: '46rem', wide: '58rem' };

/** 사이드바 너비. 사이드바가 있을 때만 쓴다. */
const SIDEBAR_WIDTHS = { narrow: '13rem', normal: '16rem', wide: '20rem' };

/** 제목 크기 배율. 본문 크기에 곱해져 글 제목·목록 제목에 적용된다. */
const TITLE_SCALES = { small: '0.85', normal: '1', large: '1.2' };

/**
 * 본문 글자 크기.
 *
 * 크게 잡을수록 줄 간격을 살짝 줄인다. 같은 배수를 유지하면 큰 글자에서
 * 줄 사이가 지나치게 벌어져 문단이 흩어져 보인다.
 */
const SIZES = {
  small: { size: '14px', line: '1.75' },
  normal: { size: '15px', line: '1.7' },
  large: { size: '17px', line: '1.65' },
};

const FONTS = {
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif",
  serif: "'Noto Serif KR', Georgia, 'Times New Roman', serif",
  mono: "'JetBrains Mono', 'D2Coding', Consolas, monospace",
};

const LAYOUT_BY_SIDEBAR = {
  left: LAYOUTS.SIDEBAR_LEFT,
  right: LAYOUTS.SIDEBAR_RIGHT,
  none: LAYOUTS.NO_SIDEBAR,
};

const LIST_BY_STYLE = {
  standard: LIST_STYLES.LIST,
  plain: LIST_STYLES.PLAIN,
  grid: LIST_STYLES.GRID,
  dense: LIST_STYLES.DENSE,
  hero: LIST_STYLES.HERO,
};

/**
 * 세부 값을 골격이 받는 플래그로 바꾼다.
 * 도식(ui/schematic.js)과 skin.html(presets/base/skeleton.js)이 같은 결과를 쓴다.
 */
export function detailsToPreset(details, meta = {}) {
  const d = { ...defaultDetails(), ...details };
  const blocks = new Set(d.sidebarBlocks || []);
  const items = new Set(d.listItems || []);
  const feats = new Set(d.features || []);
  const palette = d.background === 'dark' ? DARK : LIGHT;
  const useUploaded = d.bodyFont === 'uploaded' && meta.uploadedFont && meta.uploadedFont.css;
  // 제목 글꼴. 'same'(기본)이면 분리하지 않고 본문 글꼴을 그대로 쓴다.
  const headSame = !d.headingFont || d.headingFont === 'same';
  const head = headSame ? null : fontById(d.headingFont);

  return {
    id: meta.id || 'custom',
    name: meta.name || '내 스킨',
    desc: meta.desc || '',

    layout: LAYOUT_BY_SIDEBAR[d.sidebar] || LAYOUTS.SIDEBAR_LEFT,
    listStyle: LIST_BY_STYLE[d.listStyle] || LIST_STYLES.LIST,

    showThumbnail: items.has('thumbnail'),
    showSummary: items.has('summary'),
    // showTags 는 더 이상 켜지지 않는다. 골격이 목록 태그 마크업을 내지 않으므로
    // 남겨 두면 켤 수 있는 것처럼 보인다.
    showCommentCount: items.has('commentCount'),

    showProfile: blocks.has('profile'),
    showCategories: blocks.has('categories'),
    showTagCloud: blocks.has('tags'),
    showRecentNotice: blocks.has('notice'),
    // 사이드바 Menu 섹션(방명록/태그 바로가기). sidebarBlocks 에 'menu' 옵션이
    // 있는데도 플래그로 안 옮겨 골격이 켜고 끌 방법이 없었다. skeleton 쪽 게이트는
    // p.showMenu 를 보기로 합의됐다.
    showMenu: blocks.has('menu'),

    showToc: feats.has('toc'),
    showSearch: feats.has('search'),
    showSubscribe: feats.has('subscribe'),
    syntaxHighlight: feats.has('syntax'),

    // 'uploaded' 면 사용자가 올린 글꼴(meta.uploadedFont)을 임베드해 쓴다.
    bodyFont: useUploaded ? meta.uploadedFont.family : fontById(d.bodyFont).family,
    // 고른 글꼴이 웹폰트면 스킨 <head> 에 넣을 링크. 시스템/업로드면 null.
    bodyFontUrl: useUploaded ? null : fontById(d.bodyFont).url,
    // 올린 글꼴이면 @font-face 를 <head> 에 직접 임베드한다.
    fontFaceCss: useUploaded ? meta.uploadedFont.css : null,
    // 제목 글꼴을 분리했을 때만 값이 있다. null 이면 골격이 본문 글꼴로 폴백한다.
    headFont: headSame ? null : head.family,
    headFontUrl: headSame ? null : head.url,
    codeFont: FONTS.mono,
    // ④ 생성된 테마 CSS. 골격이 가장 마지막에 얹어 look 을 입힌다.
    themeCss: meta.themeCss || null,

    tokens: {
      ...palette,
      'color-accent': d.accent || '#2f6f4f',
      'content-max': WIDTHS[d.contentWidth] || WIDTHS.normal,
      'sidebar-width':
        d.sidebar === 'none' ? '0' : SIDEBAR_WIDTHS[d.sidebarWidth] || SIDEBAR_WIDTHS.normal,
      radius: '4px',
      'font-size-base': (SIZES[d.fontSize] || SIZES.normal).size,
      'line-height-base': (SIZES[d.fontSize] || SIZES.normal).line,
      'title-scale': TITLE_SCALES[d.titleScale] || '1',
      'grid-min': '17rem',
    },
  };
}

/**
 * 모델이 P1 에서 내놓아야 하는 4안의 모양.
 * 세 제공자 모두 구조화 출력을 지원하므로 이 스키마를 그대로 넘긴다.
 */
export const CONCEPT_SET_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['concepts'],
  properties: {
    concepts: {
      type: 'array',
      minItems: 4,
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'name', 'summary', 'differences', 'tradeoff', 'details'],
        properties: {
          kind: { type: 'string', enum: ['보편 A', '보편 B', '실험 A', '실험 B'] },
          name: { type: 'string', description: '컨셉 이름. 무엇을 하게 할 것인가를 짧게' },
          summary: { type: 'string', description: '한두 문장. 이 컨셉이 무엇을 전제하는가' },
          differences: {
            type: 'array',
            minItems: 2,
            maxItems: 4,
            items: { type: 'string' },
            description: '이 컨셉이 실제로 바꾸는 것. 사용자가 읽을 문장',
          },
          tradeoff: { type: 'string', description: '이 컨셉이 포기하는 것. 다른 안을 가리켜도 좋다' },
          details: {
            type: 'object',
            additionalProperties: false,
            required: DETAIL_FIELDS.map((f) => f.id),
            properties: Object.fromEntries(
              DETAIL_FIELDS.map((f) => [
                f.id,
                f.type === 'multi'
                  ? { type: 'array', items: { type: 'string', enum: f.options.map((o) => o.value) } }
                  : f.type === 'color'
                    ? { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' }
                    : { type: 'string', enum: f.options.map((o) => o.value) },
              ]),
            ),
          },
        },
      },
    },
  },
};

/** 세부 값 하나가 정의된 범위 안에 있는지 본다. */
export function validateDetails(details) {
  const errors = [];
  for (const f of DETAIL_FIELDS) {
    const v = details?.[f.id];
    if (v === undefined) {
      errors.push(`${f.label} 값이 없다`);
      continue;
    }
    if (f.type === 'multi') {
      if (!Array.isArray(v)) {
        errors.push(`${f.label} 은 목록이어야 한다`);
        continue;
      }
      const allowed = new Set(f.options.map((o) => o.value));
      for (const x of v) if (!allowed.has(x)) errors.push(`${f.label} 에 모르는 값: ${x}`);
    } else if (f.type === 'color') {
      if (typeof v !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(v)) {
        errors.push(`${f.label} 은 #rrggbb 형태여야 한다: ${v}`);
      }
    } else {
      const allowed = f.options.map((o) => o.value);
      if (!allowed.includes(v)) errors.push(`${f.label} 에 모르는 값: ${v}`);
    }
  }
  return errors;
}

/**
 * 4안이 서로 다른지 본다.
 *
 * 넷이 서로 다르다는 것이 4안의 존재 이유다. 모델이 이름만 바꾸고 세부는 같은
 * 네 개를 내놓으면 사용자는 고를 근거가 없다. 화면 기획 스킬이 말하는
 * "레이아웃만 다른 4안은 나쁜 4안"을 기계로 잡는다.
 */
export function validateConceptSet(concepts) {
  const errors = [];

  if (!Array.isArray(concepts) || concepts.length !== 4) {
    return ['4안이 아니다'];
  }

  const kinds = concepts.map((c) => c.kind);
  for (const want of ['보편 A', '보편 B', '실험 A', '실험 B']) {
    if (!kinds.includes(want)) errors.push(`${want} 가 없다`);
  }

  concepts.forEach((c, i) => {
    for (const e of validateDetails(c.details)) errors.push(`${c.kind || i + 1}: ${e}`);
    if (!c.name?.trim()) errors.push(`${c.kind || i + 1}: 컨셉 이름이 비었다`);
    if (!c.tradeoff?.trim()) errors.push(`${c.kind || i + 1}: 포기하는 것이 비었다`);
  });

  // 겉모습이 겹치는지. 사용자가 도식으로 보게 되는 차이다.
  const shapes = concepts.map((c) =>
    [
      c.details?.sidebar,
      c.details?.listStyle,
      [...(c.details?.listItems || [])].sort().join(','),
      c.details?.contentWidth,
      c.details?.background,
    ].join('|'),
  );
  const dupShape = shapes.filter((s, i) => shapes.indexOf(s) !== i);
  if (dupShape.length) {
    errors.push(`겉모습이 같은 안이 있다. 넷은 서로 달라야 한다: ${[...new Set(dupShape)].join(' / ')}`);
  }

  // 이름이 겹치는지
  const names = concepts.map((c) => (c.name || '').trim());
  if (new Set(names).size !== names.length) errors.push('컨셉 이름이 겹친다');

  return errors;
}

export { LIGHT, DARK, WIDTHS, SIZES, FONTS };
