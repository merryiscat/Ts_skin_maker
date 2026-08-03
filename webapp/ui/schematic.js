/**
 * 축소 도식
 *
 * 스킨의 생김새를 아주 작은 그림으로 그린다. 실제 렌더가 아니다.
 *
 * P1 의 4안 카드, P2 의 세부 미리보기, E1 의 결과물 예시, D1 의 설치 안내에 쓴다.
 * 4안 중 셋은 어차피 버려지므로 iframe 을 넷 띄울 이유가 없고, 카드 크기에서는
 * 실제 렌더를 축소해 봐야 글자가 뭉개져 무엇이 다른지 오히려 안 보인다.
 *
 * 입력은 골격이 이미 쓰고 있는 플래그 그대로다. 모델이 도식을 위해 따로
 * 무언가를 내놓을 필요가 없다는 뜻이다.
 *
 *
 * 왜 인라인 style 을 걷어내고 클래스로 바꿨나
 *
 * 예전에는 색과 크기를 전부 이 파일에서 계산해 style 속성으로 박았다. 그러면
 * 도식만 테마를 안 따라간다 - 앱이 어두운 테마로 바뀌어도 도식은 혼자 흰색으로
 * 남는다. 지금은 design.css 17절의 .shot 계열 클래스를 쓰고, 색은 테마 변수가
 * 정한다. 인라인 style 은 두 곳에만 남겼다.
 *
 *   1) 사용자가 고른 강조색 - 테마가 아니라 "만들고 있는 스킨"의 색이라 테마
 *      변수로 대신할 수 없다
 *   2) 어두운 스킨을 그릴 때의 .dark - 클래스로 처리한다
 *
 * 마크업을 바꿀 때는 design-handoff/result/E1.html 의 .shot 부분을 원본으로 삼는다.
 */

import { LAYOUTS, LIST_STYLES } from '../presets/base/skeleton.js';

/** 목록 한 건. listStyle 에 따라 모양이 갈린다. */
function listItem(s, accent) {
  const summary = s.showSummary ? '<l></l>' : '';
  const accentBar = accent
    ? `<l class="xs" style="background:${accent}"></l>`
    : '';

  if (s.listStyle === LIST_STYLES.DENSE) {
    // 날짜 + 제목만 있는 한 줄짜리. 작업 로그처럼 보인다
    return '<div class="rowline"><i></i><l class="t"></l></div>';
  }

  if (s.listStyle === LIST_STYLES.PLAIN) {
    // 구분선 없이 제목과 요약만. 읽기 중심
    return `<div class="item">${accentBar}<l class="t"></l>${summary}<l class="s"></l></div>`;
  }

  // LIST_STYLES.LIST - 표준. 썸네일이 켜져 있으면 왼쪽에 자리를 준다
  const text = `<div class="shot-col">${accentBar}<l class="t"></l>${summary}<l class="s"></l></div>`;
  return s.showThumbnail
    ? `<div class="item"><div class="shot-row"><div class="thumb"></div>${text}</div></div>`
    : `<div class="item">${text}</div>`;
}

/** 사이드바. 프로필 사진, 메뉴 몇 줄, 태그 칩. */
function sidebar(s) {
  return (
    '<div class="shot-side">' +
    (s.showProfile === false ? '' : '<div class="avatar"></div>') +
    '<l class="xs"></l><l class="s"></l><l class="s"></l>' +
    '<div class="chips"><s></s><s></s><s></s></div>' +
    '</div>'
  );
}

/**
 * 목차 자리.
 *
 * design.css 에 목차 전용 클래스가 없다. 본문 오른쪽에 붙는 얇은 줄 몇 개일
 * 뿐이라 클래스를 새로 만들 값어치가 없어서, 폭만 인라인으로 주고 안쪽은
 * 도식의 공용 글줄(l)을 쓴다.
 */
function toc() {
  return '<div style="flex:0 0 11%"><l class="s"></l><l></l><l class="s"></l><l class="xs"></l></div>';
}

/**
 * 도식 HTML 을 만든다.
 *
 * @param {object} spec - 골격 플래그. layout, listStyle, showThumbnail, showSummary, showToc, tokens
 * @param {object} [opts]
 * @param {boolean} [opts.lg]    - 큰 도식(16:10). 기본은 4:3
 * @param {number}  [opts.items] - 목록 건수. 기본은 listStyle 에 맞춰 자동
 * @returns {string} HTML
 */
export function schematic(spec, opts = {}) {
  const s = {
    layout: LAYOUTS.SIDEBAR_LEFT,
    listStyle: LIST_STYLES.LIST,
    showThumbnail: true,
    showSummary: true,
    showToc: false,
    tokens: {},
    ...spec,
  };

  const accent = s.tokens['color-accent'] || '';
  // 어두운 스킨인지. 바탕색이 어두우면 도식도 어두워야 무엇을 만드는지 보인다
  const dark = isDark(s.tokens['color-bg']);

  const isGrid = s.listStyle === LIST_STYLES.GRID;
  const count =
    opts.items || (isGrid ? 6 : s.listStyle === LIST_STYLES.DENSE ? 5 : 3);

  const main = isGrid
    ? `<div class="cells">${'<u></u>'.repeat(count)}</div>`
    : `<div class="shot-col">${Array.from({ length: count }, () => listItem(s, accent)).join('')}</div>`;

  const mainArea = s.showToc
    ? `<div class="shot-row">${main}${toc()}</div>`
    : main;

  const side = s.layout === LAYOUTS.NO_SIDEBAR ? '' : sidebar(s);
  const body =
    s.layout === LAYOUTS.SIDEBAR_RIGHT ? `${mainArea}${side}` : `${side}${mainArea}`;

  return (
    `<div class="shot${opts.lg ? ' lg' : ''}${dark ? ' dark' : ''}">` +
    '<div class="shot-bar"><i class="w"></i><u></u><b></b></div>' +
    `<div class="shot-row">${body}</div>` +
    '</div>'
  );
}

/**
 * 바탕색이 어두운지 판정한다.
 *
 * 사람이 느끼는 밝기는 R·G·B 를 같은 비중으로 더한 값이 아니다. 눈은 초록에
 * 가장 민감하고 파랑에 가장 둔해서, 흔히 쓰는 가중치(0.299 / 0.587 / 0.114)로
 * 더한 것을 휘도(luminance)라고 부른다. 절반보다 어두우면 어두운 스킨으로 본다.
 */
function isDark(hex) {
  if (!hex) return false;
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

/** 도식이 실제로 서로 달라 보이는지 판정할 때 쓰는 요약 문자열. */
export function schematicSignature(spec) {
  return [
    spec.layout,
    spec.listStyle,
    spec.showThumbnail ? 'thumb' : 'nothumb',
    spec.showSummary ? 'sum' : 'nosum',
    spec.showToc ? 'toc' : 'notoc',
  ].join('|');
}
