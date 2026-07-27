/**
 * 축소 도식
 *
 * 스킨의 생김새를 아주 작은 그림으로 그린다. 실제 렌더가 아니다.
 *
 * P1 의 4안 카드와 E1 의 결과물 예시에 쓴다. 4안 중 셋은 어차피 버려지므로
 * iframe 을 넷 띄울 이유가 없고, 카드 크기에서는 실제 렌더를 축소해 봐야
 * 글자가 뭉개져 무엇이 다른지 오히려 안 보인다.
 *
 * 입력은 골격이 이미 쓰고 있는 플래그 그대로다. 모델이 도식을 위해 따로
 * 무언가를 내놓을 필요가 없다는 뜻이다.
 */

import { LAYOUTS, LIST_STYLES } from '../presets/base/skeleton.js';

/** 도식에서 쓰는 색. 스킨 토큰이 있으면 그걸 쓰고 없으면 무채색으로 그린다. */
function palette(tokens = {}) {
  return {
    bg: tokens['color-bg'] || '#ffffff',
    surface: tokens['color-surface'] || '#f0f0ee',
    border: tokens['color-border'] || '#d8d8d4',
    text: tokens['color-text'] || '#333333',
    dim: tokens['color-text-dim'] || '#9a9a94',
    accent: tokens['color-accent'] || '#666666',
  };
}

/** 글줄을 흉내 내는 가로 막대. */
function line(c, width, h = 3, mb = 3) {
  return `<div style="height:${h}px;width:${width};background:${c};border-radius:1px;margin-bottom:${mb}px"></div>`;
}

/** 썸네일 자리. */
function thumb(p, style) {
  return (
    `<div style="background:${p.surface};border:1px solid ${p.border};border-radius:2px;${style}"></div>`
  );
}

/** 글 목록 한 건. listStyle 에 따라 모양이 갈린다. */
function listItem(p, spec) {
  const { listStyle, showThumbnail, showSummary } = spec;

  if (listStyle === LIST_STYLES.GRID) {
    return (
      `<div style="display:flex;flex-direction:column;gap:3px">` +
      thumb(p, 'aspect-ratio:16/10') +
      line(p.text, '75%', 3, 0) +
      `</div>`
    );
  }

  if (listStyle === LIST_STYLES.DENSE) {
    return (
      `<div style="display:flex;gap:4px;padding-bottom:4px;margin-bottom:4px;border-bottom:1px solid ${p.border}">` +
      (showThumbnail ? thumb(p, 'flex:0 0 18px;height:14px') : '') +
      `<div style="flex:1;min-width:0">` +
      line(p.text, '80%', 3, 2) +
      (showSummary ? line(p.dim, '100%', 2, 0) : '') +
      `</div></div>`
    );
  }

  if (listStyle === LIST_STYLES.PLAIN) {
    return (
      `<div style="margin-bottom:9px">` +
      line(p.text, '85%', 4, 3) +
      (showSummary ? line(p.dim, '100%', 2, 2) + line(p.dim, '60%', 2, 0) : '') +
      `</div>`
    );
  }

  // LIST_STYLES.LIST - 기본
  return (
    `<div style="padding-bottom:6px;margin-bottom:6px;border-bottom:1px solid ${p.border}">` +
    (showThumbnail ? thumb(p, 'height:20px;margin-bottom:4px') : '') +
    line(p.accent, '30%', 2, 3) +
    line(p.text, '80%', 3, 3) +
    (showSummary ? line(p.dim, '100%', 2, 2) + line(p.dim, '55%', 2, 0) : '') +
    `</div>`
  );
}

/** 사이드바 자리. */
function sidebar(p, spec) {
  const blocks = [];
  if (spec.showProfile !== false) {
    blocks.push(
      `<div style="width:12px;height:12px;border-radius:50%;background:${p.surface};border:1px solid ${p.border};margin:0 auto 4px"></div>`,
    );
  }
  blocks.push(line(p.dim, '60%', 2, 3));
  blocks.push(line(p.dim, '85%', 2, 2));
  blocks.push(line(p.dim, '70%', 2, 2));
  blocks.push(line(p.dim, '80%', 2, 6));
  blocks.push(line(p.dim, '50%', 2, 3));
  blocks.push(
    `<div style="display:flex;flex-wrap:wrap;gap:2px">` +
      [28, 20, 24].map(
        (w) =>
          `<div style="width:${w}%;height:4px;background:${p.surface};border:1px solid ${p.border};border-radius:2px"></div>`,
      ).join('') +
      `</div>`,
  );
  return blocks.join('');
}

/**
 * 도식 HTML 을 만든다.
 *
 * @param {object} spec - 골격 플래그. layout, listStyle, showThumbnail, showSummary, showToc, tokens
 * @param {object} [opts]
 * @param {number} [opts.width]  - 그림 너비 px. 기본 160
 * @param {number} [opts.items]  - 목록 건수. 기본은 listStyle 에 맞춰 자동
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
  const p = palette(s.tokens);
  const width = opts.width || 160;

  const isGrid = s.listStyle === LIST_STYLES.GRID;
  const count = opts.items || (isGrid ? 6 : s.listStyle === LIST_STYLES.DENSE ? 5 : 3);

  const items = Array.from({ length: count }, () => listItem(p, s)).join('');

  const main = isGrid
    ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px">${items}</div>`
    : items;

  // 목차는 본문 오른쪽에 얇은 막대로만 표시한다
  const toc = s.showToc
    ? `<div style="flex:0 0 12px;display:flex;flex-direction:column;gap:2px;padding-top:2px">` +
      [70, 100, 85, 60].map(
        (w) => `<div style="height:2px;width:${w}%;background:${p.border}"></div>`,
      ).join('') +
      `</div>`
    : '';

  const side =
    s.layout === LAYOUTS.NO_SIDEBAR
      ? ''
      : `<div style="flex:0 0 26%;padding:4px;background:${p.surface};border-radius:2px">${sidebar(p, s)}</div>`;

  const mainCol = `<div style="flex:1;min-width:0;display:flex;gap:4px"><div style="flex:1;min-width:0">${main}</div>${toc}</div>`;

  const body =
    s.layout === LAYOUTS.SIDEBAR_RIGHT
      ? `${mainCol}${side}`
      : `${side}${mainCol}`;

  return (
    `<div style="width:${width}px;background:${p.bg};border:1px solid ${p.border};` +
    `border-radius:3px;padding:5px;overflow:hidden;box-sizing:border-box">` +
    // 헤더 바
    `<div style="display:flex;align-items:center;gap:3px;padding-bottom:4px;margin-bottom:5px;` +
    `border-bottom:1px solid ${p.border}">` +
    `<div style="height:4px;width:22%;background:${p.text};border-radius:1px"></div>` +
    `<div style="flex:1"></div>` +
    `<div style="height:4px;width:18%;background:${p.surface};border:1px solid ${p.border};border-radius:1px"></div>` +
    `</div>` +
    `<div style="display:flex;gap:5px;align-items:flex-start">${body}</div>` +
    `</div>`
  );
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
