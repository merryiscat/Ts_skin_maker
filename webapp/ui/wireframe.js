/**
 * 와이어프레임
 *
 * P1 의 4안을 흑백 와이어프레임으로 그린다 (2026-08-23 피드백: 추상 도식 대신
 * screen-plan 스킬 결의 와이어프레임으로 제시). 실제 렌더가 아니라, 각 안의
 * 골격 플래그에서 "헤더 / 사이드바 / 목록 / 이미지 자리"를 라벨 붙은 흑백 골조로
 * 그린 것이다. 추상 도식(schematic)보다 무엇이 어디 있는지 바로 읽힌다.
 *
 * 규칙(screen-plan): 흑백만, 1px 보더로 구조, 이미지 자리는 대각선 X + 레이블.
 * 색은 design.css 의 .wf 계열이 고정 회색으로 정한다 - 여기선 테마를 안 따른다
 * (의도). 배경 밝기·강조색을 살리는 "팔레트" 단계는 다음에 얹는다.
 *
 * schematic.js 는 P2·E1·D1 이 아직 쓰므로 그대로 둔다. P1 만 이 렌더러를 쓴다.
 */

import { LAYOUTS, LIST_STYLES } from '../presets/base/skeleton.js';

/** 이미지 자리. 1px 보더 + 대각선 X 는 CSS(.wf-ph)가 그리고, 여기선 레이블만. */
const ph = (label, extra = '') =>
  `<div class="wf-ph${extra ? ' ' + extra : ''}">${label ? `<span>${label}</span>` : ''}</div>`;

const lbl = (t) => `<div class="wf-lbl">${t}</div>`;
const lines = (n) => Array.from({ length: n }, () => '<div class="wf-line"></div>').join('');

/** 위쪽 고정 헤더. 로고 + (메뉴) + (검색). */
function header(s) {
  const bits = ['<span class="wf-logo">로고</span>'];
  if (s.showMenu) bits.push('<span class="wf-tab">메뉴</span>');
  bits.push('<span class="wf-sp"></span>');
  if (s.showSearch) bits.push('<span class="wf-tab">검색</span>');
  return `<div class="wf-top">${bits.join('')}</div>`;
}

/** 사이드바. 프로필 / 카테고리 / 태그 중 켜진 것만. */
function sidebar(s) {
  const bits = [];
  if (s.showProfile) bits.push(ph('프로필', 'wf-avatar'));
  if (s.showCategories) bits.push(lbl('카테고리') + lines(3));
  if (s.showTagCloud) bits.push(lbl('태그') + '<div class="wf-chips"><span></span><span></span><span></span></div>');
  if (s.showRecentNotice) bits.push(lbl('공지') + lines(1));
  // 사이드바가 있는데 켠 블록이 없으면 빈 골조라도 둔다
  if (!bits.length) bits.push(lbl('사이드바'));
  return `<div class="wf-side">${bits.join('')}</div>`;
}

/** 글 목록. listStyle 에 따라 사진 비중과 배치가 갈린다. */
function list(s) {
  if (s.listStyle === LIST_STYLES.GRID) {
    return `<div class="wf-grid">${Array.from({ length: 6 }, () => ph('사진')).join('')}</div>`;
  }

  if (s.listStyle === LIST_STYLES.DENSE) {
    const row = `<div class="wf-row wf-dense">${s.showThumbnail ? ph('', 'wf-thumb-sm') : ''}${lbl('제목')}</div>`;
    return `<div class="wf-list">${Array.from({ length: 5 }, () => row).join('')}</div>`;
  }

  if (s.listStyle === LIST_STYLES.PLAIN) {
    const item = `<div class="wf-item">${lbl('제목')}${s.showSummary ? lines(2) : ''}</div>`;
    return `<div class="wf-list">${Array.from({ length: 3 }, () => item).join('')}</div>`;
  }

  // 표준(list-standard): 썸네일 왼쪽, 제목·요약 오른쪽
  const item =
    `<div class="wf-item wf-row">${s.showThumbnail ? ph('사진', 'wf-thumb') : ''}` +
    `<div class="wf-txt">${lbl('제목')}${s.showSummary ? lines(2) : ''}</div></div>`;
  return `<div class="wf-list">${Array.from({ length: 3 }, () => item).join('')}</div>`;
}

function toc() {
  return `<div class="wf-toc">${lbl('목차')}${lines(3)}</div>`;
}

/**
 * 와이어프레임 HTML.
 *
 * @param {object} spec - 골격 플래그(preset). layout, listStyle, show* 들
 * @param {object} [opts]
 * @param {boolean} [opts.lg] - 큰 와이어프레임(16:10). 기본은 4:3
 */
export function wireframe(spec, opts = {}) {
  const s = {
    layout: LAYOUTS.SIDEBAR_LEFT,
    listStyle: LIST_STYLES.LIST,
    showThumbnail: true,
    showSummary: true,
    showToc: false,
    ...spec,
  };

  const inner = s.showToc ? `<div class="wf-mainrow">${list(s)}${toc()}</div>` : list(s);
  const main = `<div class="wf-main">${inner}</div>`;
  const side = s.layout === LAYOUTS.NO_SIDEBAR ? '' : sidebar(s);
  const body = s.layout === LAYOUTS.SIDEBAR_RIGHT ? `${main}${side}` : `${side}${main}`;

  return `<div class="wf${opts.lg ? ' lg' : ''}">${header(s)}<div class="wf-body">${body}</div></div>`;
}
