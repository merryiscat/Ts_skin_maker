/**
 * 스킨 스펙 테스트
 *
 * 실행: node webapp/test/spec.test.mjs   (저장소 루트에서)
 *
 * 두 가지를 본다.
 *   1. 어떤 세부 조합이 와도 티스토리에 올릴 수 있는 스킨이 나오는가
 *      사용자가 P2 에서 아무거나 눌러도 깨지면 안 된다. 조합은 수천 가지지만
 *      항목끼리 독립이므로 각 항목의 각 값을 한 번씩 훑으면 대부분 잡힌다.
 *   2. 모델이 내놓은 4안이 실제로 서로 다른가
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DETAIL_FIELDS,
  defaultDetails,
  detailsToPreset,
  validateDetails,
  validateConceptSet,
  CONCEPT_SET_SCHEMA,
} from '../harness/spec.js';
import { buildSkinHtml, buildIndexXml } from '../presets/base/skeleton.js';
import { auditPlaceholders, auditGroupTags } from '../harness/contract.js';
import { checkPitfalls } from '../harness/pitfalls.js';

const baseDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../presets/base');
const SHARED = {
  'style.css': fs.readFileSync(path.join(baseDir, 'style.css'), 'utf8'),
  'images/script.js': fs.readFileSync(path.join(baseDir, 'script.js'), 'utf8'),
};

let failures = 0;
function ok(cond, label, extra = '') {
  if (!cond) {
    console.log(`FAIL  ${label}${extra ? '  :: ' + extra : ''}`);
    failures++;
  }
  return cond;
}
function section(t) {
  console.log(`\n--- ${t} ---`);
}

/** 세부 값 하나로 스킨을 만들어 하네스 전체를 통과하는지 본다. */
function buildAndAudit(details, label) {
  const preset = detailsToPreset(details);
  const html = buildSkinHtml(preset);
  const files = { 'skin.html': html, 'index.xml': buildIndexXml(preset), ...SHARED };

  const a = auditPlaceholders(html);
  const g = auditGroupTags(html);
  const traps = checkPitfalls(files);

  const problems = [
    ...a.unknown.map((x) => `미등록 치환자 ${x}`),
    ...a.blacklisted.map((x) => `블랙리스트 ${x.name}`),
    ...a.scopeErrors.map((x) => x.message),
    ...g.unknown.map((x) => `미등록 그룹 태그 ${x}`),
    ...g.unbalanced.map((x) => `여닫이 불균형 ${x.tag}`),
    ...g.parentErrors.map((x) => x.message),
    ...traps.map((x) => `${x.id}: ${x.message}`),
  ];

  return ok(problems.length === 0, label, problems.join(' | '));
}

section('기본값');
buildAndAudit(defaultDetails(), '기본 세부값으로 만든 스킨');

section('각 항목의 각 값');
let combos = 0;
for (const f of DETAIL_FIELDS) {
  if (f.type === 'color') {
    for (const v of ['#000000', '#ffffff', '#c2410c']) {
      combos++;
      buildAndAudit({ ...defaultDetails(), [f.id]: v }, `${f.label} = ${v}`);
    }
    continue;
  }
  for (const o of f.options) {
    combos++;
    const value = f.type === 'multi' ? [o.value] : o.value;
    buildAndAudit({ ...defaultDetails(), [f.id]: value }, `${f.label} = ${o.label}`);
  }
  if (f.type === 'multi') {
    combos += 2;
    buildAndAudit({ ...defaultDetails(), [f.id]: [] }, `${f.label} = 전부 끔`);
    buildAndAudit(
      { ...defaultDetails(), [f.id]: f.options.map((o) => o.value) },
      `${f.label} = 전부 켬`,
    );
  }
}
console.log(`${combos} 가지 확인`);

section('극단 조합');
buildAndAudit(
  {
    sidebar: 'none',
    sidebarBlocks: [],
    listStyle: 'grid',
    listItems: [],
    contentWidth: 'wide',
    background: 'dark',
    accent: '#ff0000',
    bodyFont: 'mono',
    features: [],
  },
  '전부 끄고 사이드바 없음 + 그리드',
);
buildAndAudit(
  {
    sidebar: 'right',
    sidebarBlocks: ['profile', 'categories', 'tags', 'notice', 'menu'],
    listStyle: 'dense',
    listItems: ['thumbnail', 'summary', 'tags', 'commentCount'],
    contentWidth: 'narrow',
    background: 'dark',
    accent: '#4a9eff',
    bodyFont: 'serif',
    features: ['toc', 'search', 'subscribe', 'syntax'],
  },
  '전부 켜고 오른쪽 사이드바 + 밀집',
);

section('menu 블록이 골격 플래그로 배선되는가');
{
  // sidebarBlocks 에 'menu' 옵션이 있는데 detailsToPreset 이 플래그로 안 옮겨
  // 골격이 켜고 끌 방법이 없던 회귀. skeleton 쪽 게이트는 p.showMenu 를 본다.
  ok(detailsToPreset({ ...defaultDetails(), sidebarBlocks: ['menu'] }).showMenu === true, 'menu 를 켜면 showMenu 가 true');
  ok(detailsToPreset({ ...defaultDetails(), sidebarBlocks: [] }).showMenu === false, 'menu 를 끄면 showMenu 가 false');
}

section('잘못된 세부 값을 잡는가');
ok(validateDetails({ ...defaultDetails(), sidebar: 'top' }).length > 0, '없는 사이드바 위치');
ok(validateDetails({ ...defaultDetails(), accent: 'red' }).length > 0, '색 형식 오류');
ok(validateDetails({ ...defaultDetails(), listItems: 'summary' }).length > 0, '목록이어야 하는데 문자열');
ok(validateDetails({ ...defaultDetails(), features: ['zoom'] }).length > 0, '없는 기능');
{
  const d = defaultDetails();
  delete d.listStyle;
  ok(validateDetails(d).length > 0, '항목 누락');
}
ok(validateDetails(defaultDetails()).length === 0, '정상 값은 통과');

section('4안이 서로 다른가');

/** 넷이 실제로 다른, 통과해야 하는 한 벌. */
const good = [
  {
    kind: '보편 A',
    name: '방해되는 걸 전부 뺀다',
    summary: '방문자가 할 일은 읽기 하나뿐이라고 본다.',
    differences: ['사이드바를 프로필과 목차만 남김', '본문 폭을 한 줄 45자로', '목록에서 썸네일과 태그를 뺌'],
    tradeoff: '글이 쌓였을 때 찾아 들어가기 불편해진다.',
    details: { ...defaultDetails(), sidebar: 'left', sidebarBlocks: ['profile'], listStyle: 'standard',
      listItems: ['summary'], contentWidth: 'narrow', background: 'dark', accent: '#4a9eff',
      bodyFont: 'sans', features: ['toc', 'search'] },
  },
  {
    kind: '보편 B',
    name: '찾아 들어가게 한다',
    summary: '쌓인 글이 많다는 전제.',
    differences: ['카테고리를 사이드바 맨 위에', '목록을 밀집형으로', '태그를 앞세움'],
    tradeoff: '한 글에 집중하기는 어려워진다.',
    details: { ...defaultDetails(), sidebar: 'left', sidebarBlocks: ['categories', 'tags', 'menu'],
      listStyle: 'dense', listItems: ['summary', 'tags'], contentWidth: 'normal', background: 'dark',
      accent: '#4a9eff', bodyFont: 'sans', features: ['search'] },
  },
  {
    kind: '실험 A',
    name: '작업 로그처럼',
    summary: '남에게 보여주는 매체가 아니라 자기 기록장으로 다룬다.',
    differences: ['전체를 고정폭 글꼴로', '목록을 한 줄짜리로', '프로필을 없앰'],
    tradeoff: '처음 온 사람에게 불친절하다.',
    details: { ...defaultDetails(), sidebar: 'none', sidebarBlocks: [], listStyle: 'plain',
      listItems: [], contentWidth: 'normal', background: 'dark', accent: '#6a9955',
      bodyFont: 'mono', features: ['syntax'] },
  },
  {
    kind: '실험 B',
    name: '첫 화면이 곧 최신 글',
    summary: '목록을 거치지 않고 바로 읽기 시작하게 한다.',
    differences: ['홈에 최신 글 본문을 노출', '지난 글은 아래 목록으로', '사이드바를 없앰'],
    tradeoff: '지난 글을 훑기 어렵다.',
    details: { ...defaultDetails(), sidebar: 'none', sidebarBlocks: [], listStyle: 'grid',
      listItems: ['thumbnail'], contentWidth: 'wide', background: 'light', accent: '#1f1f1f',
      bodyFont: 'serif', features: [] },
  },
];

ok(validateConceptSet(good).length === 0, '제대로 다른 4안은 통과', validateConceptSet(good).join(' | '));

// 넷 다 만들어져야 한다
for (const c of good) buildAndAudit(c.details, `4안 빌드: ${c.name}`);

// 겉모습이 겹치는 경우. 이름만 다르고 세부가 같으면 고를 근거가 없다.
{
  const dup = JSON.parse(JSON.stringify(good));
  dup[1].details = { ...dup[0].details };
  ok(
    validateConceptSet(dup).some((e) => e.includes('겉모습이 같은')),
    '겉모습이 같은 안을 잡는다',
  );
}

// 이름이 겹치는 경우
{
  const dup = JSON.parse(JSON.stringify(good));
  dup[2].name = dup[0].name;
  ok(validateConceptSet(dup).some((e) => e.includes('이름이 겹친다')), '이름 중복을 잡는다');
}

// 종류가 빠진 경우
{
  const bad = JSON.parse(JSON.stringify(good));
  bad[3].kind = '보편 A';
  ok(validateConceptSet(bad).some((e) => e.includes('실험 B')), '빠진 종류를 잡는다');
}

// 포기하는 것이 비면 고를 근거가 없다
{
  const bad = JSON.parse(JSON.stringify(good));
  bad[0].tradeoff = '  ';
  ok(validateConceptSet(bad).some((e) => e.includes('포기하는 것')), '빈 트레이드오프를 잡는다');
}

ok(validateConceptSet(good.slice(0, 3)).length > 0, '3안은 거부한다');

section('출력 스키마');
{
  const props = CONCEPT_SET_SCHEMA.properties.concepts.items.properties.details.properties;
  ok(
    DETAIL_FIELDS.every((f) => props[f.id]),
    '스키마가 모든 세부 항목을 담는다',
    DETAIL_FIELDS.filter((f) => !props[f.id]).map((f) => f.id).join(','),
  );
  ok(
    CONCEPT_SET_SCHEMA.properties.concepts.minItems === 4 &&
      CONCEPT_SET_SCHEMA.properties.concepts.maxItems === 4,
    '스키마가 4안을 강제한다',
  );
}

console.log(failures === 0 ? '\n전체 통과' : `\n실패 ${failures}건`);
process.exit(failures === 0 ? 0 : 1);
