/**
 * 프리셋 4종이 만들어내는 skin.html 을 하네스로 검사한다.
 *
 * 실행: node webapp/test/presets.test.mjs   (저장소 루트에서)
 *
 * 프리셋은 늘어날 수 있으므로 목록을 하드코딩하지 않고 PRESET_IDS 를 돈다.
 * 새 프리셋을 추가하면 자동으로 여기에 걸린다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PRESET_IDS, PRESETS, buildPresetFiles, LAYOUTS } from '../presets/index.js';
import { buildSkinHtml } from '../presets/base/skeleton.js';
import { auditPlaceholders, auditGroupTags, PAGE_TYPES } from '../harness/contract.js';
import { checkPitfalls } from '../harness/pitfalls.js';

// 프리셋 전체가 공유하는 정적 자산. 실제 배포에서도 이 파일이 그대로 나간다.
const baseDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../presets/base');
const SHARED = {
  'style.css': fs.readFileSync(path.join(baseDir, 'style.css'), 'utf8'),
  'images/script.js': fs.readFileSync(path.join(baseDir, 'script.js'), 'utf8'),
};

let failures = 0;
function ok(cond, label, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? '  :: ' + extra : ''}`);
  if (!cond) failures++;
}

// 골격이 반드시 다뤄야 하는 페이지 타입별 블록.
// 하나라도 빠지면 그 페이지에서 스킨이 빈 화면으로 뜬다.
const REQUIRED_BLOCKS = [
  ['s_t3', '최상위 래퍼'],
  ['s_article_rep', '글 공통'],
  ['s_index_article_rep', '목록'],
  ['s_permalink_article_rep', '상세'],
  ['s_list', '목록 페이지 머리말'],
  ['s_list_empty', '결과 없음'],
  ['s_notice_rep', '공지'],
  ['s_guest', '방명록'],
  ['s_tag', '태그 클라우드 페이지'],
  ['s_article_protected', '보호글'],
  ['s_paging', '페이지네이션'],
  ['s_rp', '댓글'],
];

console.log(`프리셋 ${PRESET_IDS.length}종 검사\n`);

for (const id of PRESET_IDS) {
  const preset = PRESETS[id];
  console.log(`--- ${id} (${preset.name}) ---`);

  const files = buildPresetFiles(id);
  const html = files['skin.html'];

  const a = auditPlaceholders(html);
  ok(a.unknown.length === 0, `${id}: 미등록 치환자 없음`, a.unknown.join(', '));
  ok(
    a.blacklisted.length === 0,
    `${id}: 블랙리스트 위반 없음`,
    a.blacklisted.map((x) => x.name).join(', '),
  );
  ok(
    a.scopeErrors.length === 0,
    `${id}: 스코프 위반 없음`,
    a.scopeErrors.map((x) => x.message).join(' | '),
  );

  const missing = REQUIRED_BLOCKS.filter(([tag]) => !html.includes(`<${tag}>`));
  ok(missing.length === 0, `${id}: 필수 블록 전부 존재`, missing.map(([t, d]) => `${t}(${d})`).join(', '));

  const g = auditGroupTags(html);
  ok(g.unknown.length === 0, `${id}: 미등록 그룹 태그 없음`, g.unknown.join(', '));
  // 우리가 만드는 산출물에는 지어낸 태그가 하나도 없어야 한다.
  // 계약서만 고치고 골격을 안 고치면 여기서 걸린다.
  ok(
    g.blacklisted.length === 0,
    `${id}: 존재하지 않는 그룹 태그 없음`,
    g.blacklisted.map((x) => x.tag).join(', '),
  );
  ok(
    g.unbalanced.length === 0,
    `${id}: 그룹 태그 여닫이 균형`,
    g.unbalanced.map((x) => `${x.tag} ${x.open}/${x.close}`).join(', '),
  );
  ok(
    g.parentErrors.length === 0,
    `${id}: 그룹 태그 부모 관계`,
    g.parentErrors.map((x) => x.message).join(' | '),
  );

  // 실제로 사용자에게 나갈 파일 묶음 전체에 함정 검사를 건다.
  const full = { ...files, ...SHARED };
  const traps = checkPitfalls(full);
  ok(traps.length === 0, `${id}: 함정 검사 0건`, traps.map((f) => `${f.id}: ${f.message}`).join(' | '));

  // index.xml 이 파싱되는지 (브라우저 밖이라 정규식으로 최소 확인)
  const xml = files['index.xml'];
  ok(/<skin>[\s\S]*<\/skin>/.test(xml), `${id}: index.xml 루트 태그`);
  ok(/<name>.*<\/name>/.test(xml), `${id}: index.xml 스킨 이름`);

  console.log('');
}

// showMenu 게이트. spec 의 sidebarBlocks 'menu' 가 이 플래그로 넘어온다.
// 켜면 메뉴 블록(방명록/태그 클라우드 링크)이 있고 끄면 없어야 한다.
console.log('--- showMenu 게이트 ---');
{
  const on = buildSkinHtml({ ...PRESETS.code, showMenu: true });
  const off = buildSkinHtml({ ...PRESETS.code, showMenu: false });
  ok(on.includes('class="side-menu"'), 'showMenu 켜면 메뉴 블록이 나온다');
  ok(on.includes('[##_guestbook_link_##]'), 'showMenu 켜면 방명록 링크가 있다');
  ok(!off.includes('class="side-menu"'), 'showMenu 끄면 메뉴 블록이 사라진다');
  // 사이드바 레이아웃에서 방명록 링크는 메뉴 블록에만 있으므로 같이 사라져야 한다
  ok(!off.includes('[##_guestbook_link_##]'), 'showMenu 끄면 방명록 링크도 없다');

  // 게이트가 생기기 전 산출물에는 메뉴 블록이 항상 있었다. 사이드바 있는
  // 프리셋이 명시적으로 켜 두지 않으면 기존 사용자 산출물이 바뀐다.
  for (const id of PRESET_IDS) {
    if (PRESETS[id].layout !== LAYOUTS.NO_SIDEBAR) {
      ok(PRESETS[id].showMenu === true, `${id}: 사이드바 프리셋에 showMenu 명시`);
    }
  }
}
console.log('');

// 프리셋끼리 실제로 다른지. 색만 바꾼 프리셋은 있을 이유가 없다.
const shapes = PRESET_IDS.map((id) => {
  const p = PRESETS[id];
  return `${p.layout}|${p.listStyle}`;
});
ok(
  new Set(shapes).size === shapes.length,
  '프리셋마다 레이아웃/목록 조합이 다름',
  shapes.join(' , '),
);

ok(PAGE_TYPES.length >= 6, '페이지 타입 정의됨');

console.log(failures === 0 ? '\n전체 통과' : `\n실패 ${failures}건`);
process.exit(failures === 0 ? 0 : 1);
