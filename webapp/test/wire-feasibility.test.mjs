/**
 * 와이어 소독 + 실현가능성 린트 + 컨셉 스키마 테스트
 *
 * 실행: node webapp/test/wire-feasibility.test.mjs   (저장소 루트에서)
 *
 * P1 이 모델에게 자유 와이어 HTML 을 받으면서 새로 생긴 두 방어선을 검사한다.
 *   - sanitizeWireHtml: 위험한 조각(스크립트/원격 리소스 등)을 확실히 걷어내는가
 *   - lintWireFeasibility: 티스토리가 못 주는 화면(조회수 정렬 등)을 잡고, 정상은 통과시키는가
 * 그리고 전반 컨셉/변형(역할) 프롬프트와 스키마의 기본 형태를 확인한다.
 */

import { sanitizeWireHtml, lintWireFeasibility } from '../harness/wire-feasibility.js';
import {
  CONCEPT_SCHEMA,
  SIDEBARS,
  MOODS_SCHEMA,
  MOOD_CANDIDATE_SCHEMA,
  MOOD_REFINE_SCHEMA,
  buildMoodsPrompt,
  buildMoodRefinePrompt,
  buildVariantPrompt,
  overallConceptToText,
  conceptSummary,
} from '../harness/concept-prompt.js';

let failures = 0;
function ok(cond, label, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? '  :: ' + extra : ''}`);
  if (!cond) failures++;
}

/* --------------------------------------------------------- 소독 */

console.log('--- sanitizeWireHtml: 위험 조각 제거 ---');

{
  const dirty =
    '<div class="wf"><script>alert(1)</script>' +
    '<button class="wf-btn" onclick="steal()">메뉴</button>' +
    '<a href="https://evil.example/x">링크</a>' +
    '<img class="wf-img" src="http://evil.example/p.png">' +
    '<style>body{color:red}</style>' +
    '<iframe src="//evil"></iframe>' +
    '<div style="position:fixed;top:0">덮개</div></div>';
  const clean = sanitizeWireHtml(dirty);
  ok(!/<script/i.test(clean), '<script> 제거', clean.slice(0, 60));
  ok(!/onclick/i.test(clean), 'on* 핸들러 제거');
  ok(!/https?:\/\//i.test(clean), '원격 URL 무력화', clean.match(/https?:\/\/\S*/)?.[0] || '');
  ok(!/<style/i.test(clean), '<style> 제거');
  ok(!/<iframe/i.test(clean), '<iframe> 제거');
  ok(!/position\s*:\s*fixed/i.test(clean), 'position:fixed 제거');
  ok(/wf-btn/.test(clean) && /메뉴/.test(clean), '정상 골조/라벨은 남는다');
}

/* --------------------------------------------------------- 실현가능성 린트 */

console.log('\n--- lintWireFeasibility: 티스토리 미지원 기능 탐지 ---');

const cleanWire =
  '<div class="wf"><div class="wf-header"><span class="wf-logo">로고</span>' +
  '<div class="wf-nav"><span>메뉴</span></div><span class="wf-search">검색</span></div>' +
  '<div class="wf-body"><div class="wf-sidebar"><div class="wf-block"><b>카테고리</b></div></div>' +
  '<div class="wf-main"><div class="wf-grid"><div class="wf-card"><div class="wf-img"></div>' +
  '<div class="wf-title"></div></div></div></div></div></div>';

ok(lintWireFeasibility(cleanWire, { hint: '왼쪽 사이드바, 사진 격자' }).violations.length === 0, '정상 와이어는 통과');

ok(
  lintWireFeasibility(cleanWire, { desc: '인기순으로 조회수 높은 글을 앞에 보여준다' }).violations.some((v) => v.id === 'view-count'),
  '조회수/인기순 잡음',
);
ok(
  lintWireFeasibility('<div class="wf-item"><span>조회 1,234</span></div>', {}).violations.some((v) => v.id === 'view-count'),
  '와이어 안의 "조회 수" 라벨도 잡음',
);
ok(
  lintWireFeasibility(cleanWire, { desc: '목록에서 각 글의 태그를 나열해 보여준다' }).violations.some((v) => v.id === 'list-tags'),
  '목록 태그 나열 잡음',
);
ok(
  lintWireFeasibility(cleanWire, { desc: '여행지를 지도 위에 표시한다' }).violations.some((v) => v.id === 'geo'),
  '지도 잡음',
);
ok(
  lintWireFeasibility(cleanWire, { desc: '상단에 고정 페이지 메뉴를 둔다' }).violations.some((v) => v.id === 'fixed-page'),
  '고정 페이지 잡음',
);

/* --------------------------------------------------------- 스키마 / 프롬프트 */

console.log('\n--- 무드 후보 스키마 / buildMoodsPrompt ---');

{
  ok(MOODS_SCHEMA.additionalProperties === false, 'MOODS_SCHEMA additionalProperties:false');
  ok(
    ['intent', 'reply', 'moods'].every((k) => MOODS_SCHEMA.required.includes(k) && MOODS_SCHEMA.properties[k]),
    'MOODS_SCHEMA 필수 = intent/reply/moods',
  );
  ok(
    MOODS_SCHEMA.properties.intent.enum.join(',') === 'mood,detail',
    'intent enum = mood/detail (모델이 무드/세부를 가른다)',
  );
  const moods = MOODS_SCHEMA.properties.moods;
  ok(moods.type === 'array' && moods.minItems === 3 && moods.maxItems === 3, '무드 후보는 3개');
  ok(moods.items === MOOD_CANDIDATE_SCHEMA, 'moods.items 가 무드 후보 스키마');

  const cand = MOOD_CANDIDATE_SCHEMA;
  ok(cand.additionalProperties === false, '무드 후보 additionalProperties:false');
  ok(
    ['name', 'summary', 'palette'].every((k) => cand.required.includes(k) && cand.properties[k]),
    '무드 후보 = name/summary + palette',
  );
  const pal = cand.properties.palette;
  ok(pal.type === 'array' && pal.minItems === 4 && pal.maxItems === 10, '팔레트는 4~10색 가변 배열');
  ok(
    ['role', 'label', 'hex'].every((k) => pal.items.required.includes(k)),
    '팔레트 칸 = role/label/hex',
  );

  const p = buildMoodsPrompt({ purpose: '여행 사진 블로그', note: '따뜻하게' });
  ok(p.schema === MOODS_SCHEMA, '무드 프롬프트가 MOODS_SCHEMA 를 쓴다');
  ok(p.messages[0].content.includes('여행 사진 블로그') && p.messages[0].content.includes('따뜻하게'), '용도·방향 들어감');
  const more = buildMoodsPrompt({ purpose: '여행', avoid: ['고요한 여행 - 모래빛'] });
  ok(more.messages[0].content.includes('고요한 여행'), 'avoid 가 프롬프트에 들어감(더 보기)');
  const txt = overallConceptToText({ name: '고요한 여행', summary: '모래빛 필름 톤' });
  ok(/고요한 여행/.test(txt) && /모래빛 필름 톤/.test(txt), 'overallConceptToText 가 한 줄로 편다');
}

console.log('\n--- 무드 다듬기 스키마 / buildMoodRefinePrompt (실현 후 의견) ---');

{
  ok(MOOD_REFINE_SCHEMA.additionalProperties === false, 'MOOD_REFINE_SCHEMA additionalProperties:false');
  ok(
    ['intent', 'reply', 'mood'].every((k) => MOOD_REFINE_SCHEMA.required.includes(k) && MOOD_REFINE_SCHEMA.properties[k]),
    '무드 다듬기 = intent/reply/mood',
  );
  ok(MOOD_REFINE_SCHEMA.properties.mood === MOOD_CANDIDATE_SCHEMA, 'mood 는 무드 후보 스키마(단건)');
  const p = buildMoodRefinePrompt({
    purpose: '요리 블로그',
    current: { name: '소박한 부엌', summary: '따뜻한 톤', palette: [{ role: 'accent', label: '포인트', hex: '#A65335' }] },
    note: '좀 더 어둡게',
  });
  ok(p.schema === MOOD_REFINE_SCHEMA, '다듬기 프롬프트가 MOOD_REFINE_SCHEMA 를 쓴다');
  ok(
    p.messages[0].content.includes('소박한 부엌') && p.messages[0].content.includes('좀 더 어둡게'),
    '현재 무드와 의견이 프롬프트에 들어감',
  );
  ok(p.messages[0].content.includes('#A65335'), '현재 팔레트가 프롬프트에 들어감');
}

console.log('\n--- CONCEPT_SCHEMA / buildVariantPrompt (용도 주도, 시드 없음) ---');

{
  const props = CONCEPT_SCHEMA.properties;
  ok(CONCEPT_SCHEMA.additionalProperties === false, 'additionalProperties:false (OpenAI strict)');
  ok(
    ['name', 'desc', 'hint', 'sidebar', 'wireHtml'].every((k) => CONCEPT_SCHEMA.required.includes(k) && props[k]),
    '필수 5필드(name/desc/hint/sidebar/wireHtml)',
  );
  ok(JSON.stringify(props.sidebar.enum) === JSON.stringify(SIDEBARS), 'sidebar enum = SIDEBARS');
}

{
  // 새 안: 용도가 유일한 재료. 2안부터는 이미 본 안(avoid)이 실린다.
  const p = buildVariantPrompt({
    purpose: '여행 사진 블로그',
    avoid: ['포토 갤러리 - 왼쪽 사이드바, 사진 격자'],
    fix: ['조회수 요소를 빼라.'],
    note: '미니멀',
  });
  ok(p.schema === CONCEPT_SCHEMA, '변형 프롬프트가 와이어안 스키마를 쓴다');
  ok(/레이아웃은 용도에서 나온다/.test(p.system), '시스템: 용도에서 구조를 스스로 구상(시드 없음)');
  ok(!/출발 구조/.test(p.system), '시드(출발 구조) 프레임이 사라짐');
  ok(/무드·색은 아직 정하지 않았다/.test(p.system), '컨셉 없으면 "무드는 다음 단계" 로 안내');
  const user = p.messages[0].content;
  ok(user.includes('포토 갤러리'), 'avoid(이미 본 안)가 들어감');
  ok(user.includes('조회수 요소를 빼라'), 'fix(위반 사유)가 들어감');
  ok(user.includes('미니멀'), 'note(추가 요청)가 들어감');
  ok(/와이어프레임 HTML 규약/.test(p.system) && /wf-header/.test(p.system), '와이어 규약+클래스 안내');
  ok(
    /쓸 수 있는 재료/.test(p.system) && /구독 버튼/.test(p.system) && /페이지네이션/.test(p.system),
    '티스토리+골격이 주는 재료 목록이 들어감',
  );
  ok(/조회수/.test(p.system), '실현가능성 제약');
}

{
  // 첫 안: avoid 조차 없다. 용도만 실린다.
  const p = buildVariantPrompt({ purpose: '요리 블로그' });
  ok(!/이미 본 안들이다/.test(p.messages[0].content), '첫 안에는 avoid 블록이 없다');
  ok(p.messages[0].content.includes('요리 블로그'), '용도가 들어감');
}

{
  // 컨셉이 주어지면(있는 경우) 앵커로 들어간다
  const concept = { name: '고요한 여행', summary: '모래빛 필름 톤' };
  const p = buildVariantPrompt({ purpose: '여행', concept });
  ok(/고요한 여행/.test(p.system) && /모래빛 필름 톤/.test(p.system), '컨셉이 있으면 앵커로 들어감');
}

{
  // "이 안 수정" 모드: base 를 주면 구조 유지 + 의견 반영, avoid 는 안 씀
  const p = buildVariantPrompt({
    purpose: '요리',
    base: '레시피 카드 그리드 - 사이드바 없이 2열 카드',
    note: '사이드바를 오른쪽에 추가',
    avoid: ['다른 안 - 히어로'],
  });
  const user = p.messages[0].content;
  ok(user.includes('기존 안') && user.includes('레시피 카드 그리드'), 'base 모드는 기존 안을 넘긴다');
  ok(user.includes('사이드바를 오른쪽에 추가'), 'base 모드에 의견이 들어감');
  ok(/최우선/.test(user), '의견을 최우선으로 반영하라고 지시');
  ok(!/이미 본 안들이다/.test(user), 'base 모드에서는 avoid 를 쓰지 않는다(같은 안을 고치는 것)');
  ok(/사용자 의견대로 고친다|의견을 최우선/.test(p.system), 'refine 시스템 지시(의견 우선)');
}

ok(conceptSummary({ name: '포토 갤러리', hint: '왼쪽 사이드바, 사진 격자' }) === '포토 갤러리 - 왼쪽 사이드바, 사진 격자', 'conceptSummary 형태');

console.log(failures === 0 ? '\n전체 통과' : `\n실패 ${failures}건`);
process.exit(failures === 0 ? 0 : 1);
