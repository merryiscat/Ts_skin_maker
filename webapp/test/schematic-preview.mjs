/**
 * 도식 확인용 정적 페이지 생성기
 *
 * 실행: node webapp/test/schematic-preview.mjs [출력경로]
 *
 * 레이아웃 플래그만으로 도식이 서로 구분되게 그려지는지 눈으로 확인한다.
 * ES 모듈을 file:// 로 직접 열면 브라우저가 막으므로 Node 에서 HTML 을 만들어 둔다.
 */

import fs from 'node:fs';
import path from 'node:path';

import { schematic, schematicSignature } from '../ui/schematic.js';
import { PRESETS, PRESET_IDS } from '../presets/index.js';
import { LAYOUTS, LIST_STYLES } from '../presets/base/skeleton.js';

const out = process.argv[2] || path.resolve('schematic-preview.html');

/** 카드 하나. P1 4안 카드 크기와 E1 예시 크기를 같이 보여준다. */
function card(title, note, spec) {
  return `
  <div class="card">
    <div class="title">${title}</div>
    <div class="note">${note}</div>
    <div class="row">
      <div>
        <div class="lbl">P1 카드 160px</div>
        ${schematic(spec, { width: 160 })}
      </div>
      <div>
        <div class="lbl">E1 예시 108px</div>
        ${schematic(spec, { width: 108 })}
      </div>
    </div>
    <div class="sig">${schematicSignature(spec)}</div>
  </div>`;
}

const sections = [];

// 1. 기존 프리셋 4종. 보편안의 재료가 된다.
sections.push(`<h2>프리셋 4종 - 보편안 재료</h2><div class="grid">` +
  PRESET_IDS.map((id) => {
    const p = PRESETS[id];
    return card(p.name, p.bestFor, p);
  }).join('') + `</div>`);

// 2. 레이아웃 축만 바꾼 것. 사이드바 위치가 구분되는지.
sections.push(`<h2>레이아웃 축</h2><div class="grid">` +
  [
    ['왼쪽 사이드바', LAYOUTS.SIDEBAR_LEFT],
    ['오른쪽 사이드바', LAYOUTS.SIDEBAR_RIGHT],
    ['사이드바 없음', LAYOUTS.NO_SIDEBAR],
  ].map(([name, layout]) =>
    card(name, '목록 형태는 동일', {
      layout,
      listStyle: LIST_STYLES.LIST,
      showThumbnail: false,
      showSummary: true,
      tokens: PRESETS.column.tokens,
    }),
  ).join('') + `</div>`);

// 3. 목록 형태 축만 바꾼 것. 네 형태가 구분되는지.
sections.push(`<h2>목록 형태 축</h2><div class="grid">` +
  [
    ['표준', LIST_STYLES.LIST],
    ['단순', LIST_STYLES.PLAIN],
    ['그리드', LIST_STYLES.GRID],
    ['밀집', LIST_STYLES.DENSE],
  ].map(([name, listStyle]) =>
    card(name, '레이아웃은 사이드바 없음으로 고정', {
      layout: LAYOUTS.NO_SIDEBAR,
      listStyle,
      showThumbnail: true,
      showSummary: true,
      tokens: PRESETS.column.tokens,
    }),
  ).join('') + `</div>`);

// 4. 실제로 나올 법한 4안 한 벌. 이게 P1 에서 사용자가 보는 모습이다.
const FOUR = [
  ['보편 A · 읽기 우선', '본문 좁게, 왼쪽 사이드바', {
    layout: LAYOUTS.SIDEBAR_LEFT, listStyle: LIST_STYLES.LIST,
    showThumbnail: false, showSummary: true, showToc: true, tokens: PRESETS.code.tokens }],
  ['보편 B · 목록 우선', '사이드바 없이 목록을 가운데로', {
    layout: LAYOUTS.NO_SIDEBAR, listStyle: LIST_STYLES.PLAIN,
    showThumbnail: false, showSummary: true, tokens: PRESETS.code.tokens }],
  ['실험 A · 터미널', '밀집 목록, 날짜와 제목만', {
    layout: LAYOUTS.SIDEBAR_LEFT, listStyle: LIST_STYLES.DENSE,
    showThumbnail: false, showSummary: false, tokens: PRESETS.code.tokens }],
  ['실험 B · 연도별 묶음', '오른쪽 사이드바, 썸네일 있는 표준 목록', {
    layout: LAYOUTS.SIDEBAR_RIGHT, listStyle: LIST_STYLES.LIST,
    showThumbnail: true, showSummary: false, tokens: PRESETS.code.tokens }],
];
sections.push(`<h2>4안 한 벌 - 개발 / 담백하고 글에 집중되는</h2><div class="grid">` +
  FOUR.map(([n, d, s]) => card(n, d, s)).join('') + `</div>`);

// 서명이 겹치면 도식이 같아 보인다는 뜻이다.
const sigs = FOUR.map(([, , s]) => schematicSignature(s));
const dup = sigs.length !== new Set(sigs).size;

const html = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>도식 확인</title>
<style>
  body { margin:0; padding:24px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans KR',sans-serif;
         font-size:14px; color:#222; background:#fafafa; }
  h1 { font-size:18px; margin:0 0 4px; }
  h2 { font-size:14px; margin:32px 0 12px; padding-bottom:6px; border-bottom:1px solid #ddd; }
  .lead { margin:0 0 8px; color:#666; font-size:13px; }
  .grid { display:flex; flex-wrap:wrap; gap:16px; }
  .card { background:#fff; border:1px solid #e0e0e0; border-radius:4px; padding:12px; }
  .title { font-weight:600; font-size:13px; }
  .note { color:#777; font-size:11px; margin-bottom:10px; }
  .row { display:flex; gap:16px; align-items:flex-start; }
  .lbl { font-size:10px; color:#999; margin-bottom:4px; }
  .sig { margin-top:10px; font-family:Consolas,monospace; font-size:10px; color:#aaa; }
  .verdict { margin-top:8px; padding:8px 12px; border:1px solid #ccc; border-radius:4px;
             background:#fff; font-size:13px; display:inline-block; }
</style></head><body>
<h1>축소 도식 확인</h1>
<p class="lead">레이아웃 플래그만으로 그린다. 모델이 도식을 위해 따로 내놓는 값은 없다.</p>
<div class="verdict">4안 서명 중복: ${dup ? '있음 - 도식이 같아 보인다' : '없음 - 넷이 구분된다'}</div>
${sections.join('\n')}
</body></html>`;

fs.writeFileSync(out, html, 'utf8');
console.log(`생성: ${out}`);
console.log(`4안 서명 중복: ${dup ? '있음' : '없음'}`);
for (const s of sigs) console.log('  ' + s);
