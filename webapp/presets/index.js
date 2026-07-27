/**
 * 프리셋 4종
 *
 * 색만 다른 네 개는 의미가 없다. 읽는 경험을 실제로 가르는 세 축으로 갈랐다.
 *   - 글 목록을 어떤 형태로 보여주는가
 *   - 사이드바가 있는가, 어느 쪽인가
 *   - 본문 폭을 어떻게 잡는가
 *
 * 치환자 골격은 presets/base/skeleton.js 하나를 공유한다. 그래서 프리셋을 늘리는
 * 비용은 아래 정의를 하나 더 쓰는 것뿐이고, 치환자 검증을 다시 할 필요가 없다.
 */

import { LAYOUTS, LIST_STYLES, buildSkinHtml, buildIndexXml } from './base/skeleton.js';

/** 어두운 계열 공통 토큰. */
const DARK = {
  'color-bg': '#1e1e1e',
  'color-surface': '#252526',
  'color-border': '#3c3c3c',
  'color-text': '#d4d4d4',
  'color-text-dim': '#9d9d9d',
  'color-accent': '#4a9eff',
};

/** 밝은 계열 공통 토큰. */
const LIGHT = {
  'color-bg': '#ffffff',
  'color-surface': '#f7f7f5',
  'color-border': '#e2e2df',
  'color-text': '#24211d',
  'color-text-dim': '#6b665f',
  'color-accent': '#2f6f4f',
};

export const PRESETS = {
  code: {
    id: 'code',
    name: '코드',
    desc: '개발 글에 맞춘 어두운 스킨. 왼쪽 사이드바와 본문 목차.',
    bestFor: '개발, 기술 정리, 튜토리얼',
    layout: LAYOUTS.SIDEBAR_LEFT,
    listStyle: LIST_STYLES.LIST,
    showThumbnail: false,
    showToc: true,
    showTags: true,
    showCommentCount: false,
    syntaxHighlight: true,
    tokens: {
      ...DARK,
      'content-max': '46rem',
      'sidebar-width': '16rem',
      'radius': '4px',
      'font-size-base': '15px',
      'line-height-base': '1.75',
    },
    codeFont: "'JetBrains Mono', 'D2Coding', Consolas, monospace",
  },

  column: {
    id: 'column',
    name: '칼럼',
    desc: '글 자체에 집중하는 스킨. 사이드바 없이 넓은 본문과 큰 타이포.',
    bestFor: '에세이, 긴 글, 서평',
    layout: LAYOUTS.NO_SIDEBAR,
    listStyle: LIST_STYLES.PLAIN,
    showThumbnail: false,
    showSummary: true,
    showTags: false,
    showCommentCount: false,
    showToc: false,
    tokens: {
      ...LIGHT,
      'content-max': '38rem',
      'sidebar-width': '0',
      'radius': '2px',
      'font-size-base': '17px',
      'line-height-base': '1.85',
    },
    bodyFont: "'Noto Serif KR', Georgia, 'Times New Roman', serif",
  },

  grid: {
    id: 'grid',
    name: '그리드',
    desc: '썸네일을 앞세운 카드 그리드. 이미지가 주인공인 블로그용.',
    bestFor: '사진, 여행, 포트폴리오',
    layout: LAYOUTS.NO_SIDEBAR,
    listStyle: LIST_STYLES.GRID,
    showThumbnail: true,
    showSummary: false,
    showTags: false,
    showCommentCount: false,
    showToc: false,
    tokens: {
      ...LIGHT,
      'color-bg': '#fbfbfa',
      'color-accent': '#1f1f1f',
      'content-max': '68rem',
      'sidebar-width': '0',
      'radius': '8px',
      'font-size-base': '15px',
      'line-height-base': '1.7',
      'grid-min': '17rem',
    },
  },

  digest: {
    id: 'digest',
    name: '다이제스트',
    desc: '한 화면에 많이 담는 밀집 목록. 오른쪽 사이드바에서 카테고리를 강조.',
    bestFor: '정보 정리, 리뷰, 생활 팁',
    layout: LAYOUTS.SIDEBAR_RIGHT,
    listStyle: LIST_STYLES.DENSE,
    showThumbnail: true,
    showSummary: true,
    showTags: false,
    showCommentCount: true,
    showToc: true,
    tokens: {
      ...LIGHT,
      'color-accent': '#c2410c',
      'content-max': '44rem',
      'sidebar-width': '15rem',
      'radius': '6px',
      'font-size-base': '15px',
      'line-height-base': '1.7',
    },
  },
};

export const PRESET_IDS = Object.keys(PRESETS);

/** 선택 화면에 뿌릴 요약. */
export function presetChoices() {
  return PRESET_IDS.map((id) => {
    const p = PRESETS[id];
    return { id, name: p.name, desc: p.desc, bestFor: p.bestFor };
  });
}

/**
 * 프리셋 하나로 스킨 파일 묶음을 만든다.
 * style.css 와 script.js 는 프리셋 전체가 공유하므로 호출부에서 붙인다.
 */
export function buildPresetFiles(id, meta = {}) {
  const preset = PRESETS[id];
  if (!preset) throw new Error(`알 수 없는 프리셋: ${id}`);
  return {
    'skin.html': buildSkinHtml(preset),
    'index.xml': buildIndexXml(preset, { name: `${preset.name} 스킨`, ...meta }),
  };
}

export { LAYOUTS, LIST_STYLES };
