/**
 * 프롬프트 테스트
 *
 * 실행: node webapp/test/system-prompt.test.mjs   (저장소 루트에서)
 *
 * 네트워크를 타지 않는다. 모델이 좋은 답을 내는지는 여기서 알 수 없고,
 * 알 수 있는 것은 "모델이 좋은 답을 낼 재료를 빠짐없이 받았는가" 뿐이다.
 * 항목 하나가 프롬프트에서 빠지면 모델은 그 항목을 못 채우고, 그 안은 검증에서
 * 통째로 버려진다. 재시도 비용은 사용자 지갑에서 나간다.
 */

import {
  RECENT_TURNS,
  EDIT_SCHEMA,
  cacheableSystemPrefix,
  detailFieldsSummary,
  buildConceptPrompt,
  buildRetryConceptPrompt,
  buildEditPrompt,
} from '../harness/system-prompt.js';
import { DETAIL_FIELDS, CONCEPT_SET_SCHEMA, defaultDetails } from '../harness/spec.js';
import { BLACKLIST } from '../harness/contract.js';

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

/** 프롬프트 한 벌을 통째로 문자열로 만든다. 어디에 들었든 걸리게 하기 위해서다. */
function allText(prompt) {
  return prompt.system + '\n' + prompt.messages.map((m) => m.content).join('\n');
}

section('컨셉 프롬프트가 사용자의 답을 담는가');
{
  const p = buildConceptPrompt({ purpose: '개발', mood: '담백하고 글에 집중되는' });
  const text = allText(p);
  ok(text.includes('개발'), '용도가 프롬프트에 들어간다');
  ok(text.includes('담백하고 글에 집중되는'), '컨셉이 프롬프트에 들어간다');
  ok(p.messages.length >= 1 && p.messages[0].role === 'user', '사용자 메시지가 있다');
  ok(typeof p.effort === 'string' && p.effort.length > 0, '추론 강도가 지정된다');
}
{
  // 컨셉은 비워 둘 수 있는 칸이다. 빈칸이 와도 깨지지 않아야 한다.
  const empty = buildConceptPrompt({ purpose: '에세이', mood: '' });
  ok(allText(empty).includes('에세이'), '컨셉이 비어도 용도는 들어간다');
  ok(
    /말하지 않았다/.test(allText(empty)),
    '컨셉이 비면 그렇게 적어 되묻지 않게 한다',
  );

  ok(buildConceptPrompt({}).messages.length > 0, '둘 다 비어도 깨지지 않는다');
  ok(buildConceptPrompt().messages.length > 0, '인자가 없어도 깨지지 않는다');
}

section('세부 항목이 빠짐없이 들어가는가');
{
  const sys = buildConceptPrompt({ purpose: '개발', mood: '' }).system;

  const missingIds = DETAIL_FIELDS.filter((f) => !sys.includes(f.id)).map((f) => f.id);
  ok(missingIds.length === 0, '모든 항목 id 가 들어 있다', missingIds.join(','));

  const missingValues = [];
  for (const f of DETAIL_FIELDS) {
    for (const o of f.options || []) {
      if (!sys.includes(o.value)) missingValues.push(`${f.id}.${o.value}`);
    }
  }
  ok(missingValues.length === 0, '모든 선택 가능한 값이 들어 있다', missingValues.join(','));

  const missingLabels = DETAIL_FIELDS.filter((f) => !sys.includes(f.label)).map((f) => f.id);
  ok(missingLabels.length === 0, '항목 라벨이 들어 있다', missingLabels.join(','));

  // 색 항목은 형식을 알려주지 않으면 모델이 이름 색(red)을 낸다
  ok(/#rrggbb/i.test(sys), '색 형식을 알려준다');

  // 편집 프롬프트도 같은 프리픽스를 쓰므로 같이 확인한다
  const editSys = buildEditPrompt({
    currentDetails: defaultDetails(),
    recentTurns: [],
    userMessage: '아무거나',
  }).system;
  ok(
    DETAIL_FIELDS.every((f) => editSys.includes(f.id)),
    '편집 프롬프트에도 모든 항목이 들어 있다',
  );
}

section('없는 치환자 경고가 들어가는가');
{
  const sys = buildConceptPrompt({ purpose: '개발' }).system;
  ok(sys.includes('존재하지 않는 치환자'), '블랙리스트 머리말이 있다');

  const missing = Object.keys(BLACKLIST).filter((n) => !sys.includes(n));
  ok(missing.length === 0, '블랙리스트 항목이 전부 들어 있다', missing.join(','));

  // 1.4.0 에서 실제로 나온 환각. 이것만은 반드시 경고돼야 한다.
  ok(sys.includes('article_rep_log_cnt'), '조회수 환각이 경고된다');
  ok(/조회수/.test(sys), '조회수를 줄 수 없다는 사실이 들어 있다');
}

section('모델이 마크업을 쓰지 않는다는 것이 명시되는가');
{
  const sys = buildConceptPrompt({ purpose: '개발' }).system;
  ok(/골격/.test(sys), '파일은 골격이 만든다고 적혀 있다');
  ok(/직접 쓸 일은 없다|쓰지 않는다/.test(sys), '직접 쓰지 말라고 적혀 있다');
  ok(/배경 지식/.test(sys), '계약서가 배경 지식임을 밝힌다');
}

section('출력 스키마');
{
  const p = buildConceptPrompt({ purpose: '개발' });
  ok(p.schema === CONCEPT_SET_SCHEMA, '4안 스키마를 그대로 쓴다');

  const props = EDIT_SCHEMA.properties.details.properties;
  const missing = DETAIL_FIELDS.filter((f) => !props[f.id]).map((f) => f.id);
  ok(missing.length === 0, '편집 스키마가 모든 세부 항목을 담는다', missing.join(','));
  ok(
    DETAIL_FIELDS.every((f) => EDIT_SCHEMA.properties.details.required.includes(f.id)),
    '편집 스키마가 모든 항목을 필수로 받는다',
  );
  ok(!!EDIT_SCHEMA.properties.changes, '바뀐 것 목록을 받는다');
  ok(!!EDIT_SCHEMA.properties.reply, '사람이 읽을 응답을 받는다');

  // 값 범위를 스키마에서도 막아야 검증 전에 걸러진다
  ok(
    EDIT_SCHEMA.properties.details.properties.sidebar.enum.join(',') ===
      DETAIL_FIELDS.find((f) => f.id === 'sidebar').options.map((o) => o.value).join(','),
    '단일 선택 항목이 enum 으로 묶여 있다',
  );
}

section('부분 재시도');
{
  const others = [
    { kind: '보편 A', name: '방해되는 걸 전부 뺀다', summary: '읽기 하나뿐', tradeoff: '찾기 불편',
      details: { ...defaultDetails(), sidebar: 'left', listStyle: 'standard' } },
    { kind: '보편 B', name: '찾아 들어가게 한다', summary: '글이 많다', tradeoff: '집중 어려움',
      details: { ...defaultDetails(), sidebar: 'left', listStyle: 'dense' } },
    { kind: '실험 A', name: '작업 로그처럼', summary: '기록장', tradeoff: '불친절',
      details: { ...defaultDetails(), sidebar: 'none', listStyle: 'plain' } },
  ];
  const p = buildRetryConceptPrompt({ purpose: '개발', mood: '담백한', kind: '실험 B', others });
  const text = allText(p);

  for (const o of others) {
    ok(text.includes(o.name), `살아남은 안의 이름이 들어간다: ${o.name}`);
  }
  ok(text.includes('실험 B'), '다시 만들 종류가 들어간다');
  ok(/겹치/.test(text), '겹치지 말라고 지시한다');
  ok(/겉모습/.test(text), '겉모습 중복 판정 규칙을 알려준다');
  ok(text.includes('개발') && text.includes('담백한'), '원래 조건이 유지된다');

  ok(
    p.schema.properties.kind.enum.length === 1 && p.schema.properties.kind.enum[0] === '실험 B',
    '재시도 스키마가 종류를 고정한다',
  );
  ok(
    CONCEPT_SET_SCHEMA.properties.concepts.items.properties.kind.enum.length === 4,
    '원본 스키마를 건드리지 않는다',
  );

  ok(buildRetryConceptPrompt({ kind: '보편 A' }).messages.length > 0, 'others 가 없어도 깨지지 않는다');
}

section('편집 프롬프트가 최근 대화만 보내는가');
{
  const turns = [];
  for (let i = 0; i < RECENT_TURNS + 6; i++) {
    // 닫는 괄호까지 넣어야 [턴1] 이 [턴10] 의 일부로 잡히지 않는다
    turns.push({ role: i % 2 === 0 ? 'user' : 'assistant', content: `[턴${i}]` });
  }
  const p = buildEditPrompt({
    currentDetails: defaultDetails(),
    recentTurns: turns,
    userMessage: '사이드바를 오른쪽으로',
  });

  // 마지막 사용자 메시지가 하나 더 붙는다
  ok(p.messages.length === RECENT_TURNS + 1, `대화를 ${RECENT_TURNS} 개로 자른다`, `${p.messages.length}`);

  const text = allText(p);
  const dropped = turns.slice(0, turns.length - RECENT_TURNS);
  const leaked = dropped.filter((t) => text.includes(t.content)).map((t) => t.content);
  ok(leaked.length === 0, '잘린 옛 대화가 새어 나가지 않는다', leaked.join(','));

  const kept = turns.slice(-RECENT_TURNS);
  ok(kept.every((t) => text.includes(t.content)), '남긴 대화는 전부 들어간다');

  ok(text.includes('사이드바를 오른쪽으로'), '이번 지시가 들어간다');
  ok(
    p.messages[p.messages.length - 1].role === 'user',
    '마지막 메시지는 사용자 것이다',
  );

  ok(buildEditPrompt({ currentDetails: defaultDetails(), userMessage: '어' }).messages.length === 1,
    '대화가 없어도 깨지지 않는다');
}

section('편집 프롬프트가 현재 상태를 담는가');
{
  const cur = {
    ...defaultDetails(),
    sidebar: 'right',
    listStyle: 'grid',
    bodyFont: 'mono',
    accent: '#c2410c',
    features: ['toc', 'syntax'],
  };
  const text = allText(buildEditPrompt({ currentDetails: cur, userMessage: '더 좁게' }));

  ok(text.includes('sidebar: right'), '단일 값이 들어간다');
  ok(text.includes('listStyle: grid'), '목록 형태가 들어간다');
  ok(text.includes('#c2410c'), '색 값이 들어간다');
  ok(/features: \[toc, syntax\]/.test(text), '여럿 고른 값이 들어간다');

  // 현재 값은 대화보다 뒤에 와야 한다. 앞에 두면 지난 상태가 최신처럼 읽힌다.
  const p = buildEditPrompt({
    currentDetails: cur,
    recentTurns: [{ role: 'user', content: '예전지시' }],
    userMessage: '더 좁게',
  });
  const last = p.messages[p.messages.length - 1].content;
  ok(last.includes('sidebar: right') && last.includes('더 좁게'), '현재 값이 마지막 메시지에 붙는다');

  ok(/할 수 없다/.test(p.system), '표현 못 하는 요청은 거절하라고 지시한다');
}

section('캐시 프리픽스');
{
  const a = cacheableSystemPrefix();
  const b = cacheableSystemPrefix();
  ok(a === b, '두 번 불러도 같은 문자열이다');

  // 캐시는 바이트가 같은 접두사에만 걸린다. 호출 종류가 달라도 앞부분은 같아야 한다.
  const concept = buildConceptPrompt({ purpose: '개발', mood: '따뜻한' }).system;
  const concept2 = buildConceptPrompt({ purpose: '사진', mood: '' }).system;
  const retry = buildRetryConceptPrompt({ purpose: '리뷰', kind: '실험 A', others: [] }).system;
  const edit = buildEditPrompt({ currentDetails: defaultDetails(), userMessage: 'x' }).system;

  for (const [label, sys] of [
    ['4안', concept],
    ['4안 (다른 입력)', concept2],
    ['재시도', retry],
    ['편집', edit],
  ]) {
    ok(sys.startsWith(a), `${label} 프롬프트가 같은 프리픽스로 시작한다`);
  }
  ok(concept.slice(0, a.length) === concept2.slice(0, a.length), '입력이 달라도 앞부분이 같다');

  // 한국어는 대략 문자 수의 절반이 토큰 수다. 512 토큰이면 1024 자.
  const approxTokens = Math.round(a.length / 2);
  ok(approxTokens >= 512, '캐시가 걸릴 만큼 길다', `${a.length} 자, 약 ${approxTokens} 토큰`);
  console.log(`캐시 프리픽스 ${a.length} 자, 약 ${approxTokens} 토큰`);
}

section('이모지가 없는가');
{
  // 코드, 주석, 프롬프트 어디에도 이모지를 쓰지 않는다는 프로젝트 규칙.
  const EMOJI =
    /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2460}-\u{24FF}\u{25A0}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{FE0E}]/u;

  const samples = [
    ['캐시 프리픽스', cacheableSystemPrefix()],
    ['세부 항목 요약', detailFieldsSummary()],
    ['4안', allText(buildConceptPrompt({ purpose: '개발', mood: '터미널 느낌' }))],
    [
      '재시도',
      allText(
        buildRetryConceptPrompt({
          purpose: '개발',
          kind: '실험 B',
          others: [{ kind: '보편 A', name: '이름', summary: '요약', tradeoff: '포기', details: defaultDetails() }],
        }),
      ),
    ],
    [
      '편집',
      allText(
        buildEditPrompt({
          currentDetails: defaultDetails(),
          recentTurns: [{ role: 'user', content: '앞선 지시' }],
          userMessage: '사이드바를 오른쪽으로',
        }),
      ),
    ],
    ['편집 스키마', JSON.stringify(EDIT_SCHEMA)],
  ];

  for (const [label, text] of samples) {
    const m = text.match(EMOJI);
    ok(!m, `${label} 에 이모지가 없다`, m ? `${m[0]} (U+${m[0].codePointAt(0).toString(16)})` : '');
  }
}

console.log(failures === 0 ? '\n전체 통과' : `\n실패 ${failures}건`);
process.exit(failures === 0 ? 0 : 1);
