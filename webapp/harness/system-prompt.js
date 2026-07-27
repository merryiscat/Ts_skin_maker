/**
 * 모델 호출 프롬프트
 *
 * 모델을 부르는 곳은 두 군데뿐이다.
 *
 *   P1 - 컨셉 4안을 한 번에 만든다. 실패한 안만 따로 다시 만든다.
 *   W1 - 자연어 지시를 현재 세부 값의 변경으로 옮긴다.
 *
 * 둘 다 모델이 내놓는 것은 세부 플래그뿐이다. skin.html 과 style.css 는
 * 검증된 골격(presets/base/skeleton.js)이 그 플래그를 받아 만든다. 모델이
 * 마크업을 쓰지 않는 것이 이 설계의 핵심이라서, 프롬프트도 그 점을 먼저 못 박는다.
 * 마크업을 쓰게 두면 1.4.0 의 [##_article_rep_log_cnt_##] 같은 환각이 매번 나오고,
 * 그것을 잡느라 검증기와 재시도에 사용자 돈이 계속 들어간다.
 *
 * 계약서와 함정 목록을 그래도 넣는 이유는 배경 지식이다. 티스토리가 조회수를
 * 주지 않는다는 것을 모르면 모델은 "조회수를 앞세우는 컨셉"을 태연히 내놓는다.
 *
 * 비용은 사용자 지갑에서 나간다. 그래서 보내는 것을 두 방향으로 줄인다.
 *   - 고정된 앞부분을 cacheableSystemPrefix() 로 떼어내 프롬프트 캐싱을 태운다
 *   - W1 은 대화 전량이 아니라 최근 RECENT_TURNS 개만 보낸다
 */

import { contractSummary } from './contract.js';
import { pitfallsSummary } from './pitfalls.js';
import { DETAIL_FIELDS, CONCEPT_SET_SCHEMA } from './spec.js';

/**
 * W1 에서 모델에게 보내는 최근 대화 개수. 사용자/응답을 각각 한 턴으로 센다.
 *
 * 6 = 세 왕복. 대화를 보내는 목적은 딱 하나, 방금 한 지시를 이어 다듬는 말
 * ("좀 더 좁게", "아니 그거 말고 목록 쪽")에서 지시 대상을 찾는 것이다.
 * 그보다 오래된 지시는 이미 현재 세부 값에 반영돼 있어서 다시 보내면 중복이고,
 * 사용자가 그 뒤에 마음을 바꿨다면 현재 값과 어긋나 오히려 모델을 헷갈리게 한다.
 * 누적 상태는 대화가 아니라 currentDetails 가 들고 있다.
 *
 * 세 왕복보다 짧으면 "아까 그거"가 범위 밖으로 밀려나는 경우가 생기고,
 * 길게 잡아도 얻는 것 없이 매 호출 토큰만 늘어난다.
 */
export const RECENT_TURNS = 6;

/**
 * 추론 강도.
 * 4안은 넷을 서로 다르게 갈라야 하는 발산형 작업이라 생각할 여지가 필요하다.
 * 편집은 자연어를 정해진 플래그로 옮기는 기계적인 일이라 낮게 둔다. 비용이
 * 사용자 부담이므로 올릴 이유가 없는 쪽은 올리지 않는다.
 */
const EFFORT_CONCEPT = 'medium';
const EFFORT_EDIT = 'low';

/**
 * 세부 항목 정의를 프롬프트용 텍스트로 만든다.
 *
 * id 와 고를 수 있는 값을 빠짐없이 적어야 한다. 하나라도 빠지면 모델은 그 항목을
 * 못 채우거나 없는 값을 지어내고, 그러면 validateDetails 에서 걸려 안 하나가 통째로
 * 버려진다. 라벨과 설명까지 같이 주는 것은 값의 뜻을 짐작하지 않게 하기 위해서다.
 */
export function detailFieldsSummary() {
  const lines = [];
  for (const f of DETAIL_FIELDS) {
    if (f.type === 'color') {
      lines.push(`- ${f.id} (${f.label}) : #rrggbb 형태의 색 하나. 기본값 ${f.default}`);
      if (f.note) lines.push(`    ${f.note}`);
      continue;
    }

    const how = f.type === 'multi' ? '여럿 고름. 빈 목록도 됨' : '하나만 고름';
    lines.push(`- ${f.id} (${f.label}) : ${how}`);
    for (const o of f.options) {
      lines.push(`    ${o.value} = ${o.label}${o.note ? ` (${o.note})` : ''}`);
    }
    const def = Array.isArray(f.default) ? `[${f.default.join(', ')}]` : f.default;
    lines.push(`    기본값 ${def}`);
    if (f.dependsOn) {
      const cond = Object.entries(f.dependsOn)
        .map(([k, vs]) => `${k} 가 ${vs.join(' 또는 ')}`)
        .join(', ');
      lines.push(`    ${cond} 일 때만 의미가 있다`);
    }
  }
  return lines.join('\n');
}

/**
 * 겉모습 판정 규칙을 모델에게 그대로 알려준다.
 * validateConceptSet 이 이 다섯 항목의 조합으로 중복을 잡으므로, 규칙을 감추면
 * 모델이 알 수 없는 이유로 계속 떨어진다. 재시도 한 번이 곧 사용자 돈이다.
 */
const SHAPE_KEYS = '사이드바(sidebar), 목록 형태(listStyle), 목록 항목(listItems), 본문 폭(contentWidth), 배경(background)';

/**
 * 모든 호출에 공통으로 들어가는 고정 앞부분.
 *
 * 입력에 따라 한 글자도 달라지면 안 된다. 프롬프트 캐싱은 바이트가 같은 접두사에만
 * 걸리고, 앞부분이 흔들리면 캐시가 매번 새로 써진다. P1 과 W1 이 같은 프리픽스를
 * 쓰는 것도 의도한 것이다. P1 에서 한 번 써 둔 캐시를 W1 의 반복 호출이 계속 재사용한다.
 *
 * 캐시는 512 토큰부터 걸린다. 계약서와 함정 목록만으로 그 몇 배가 되므로 문제없다.
 */
export function cacheableSystemPrefix() {
  return [
    '너는 티스토리 블로그 스킨의 컨셉과 세부 값을 정하는 역할이다.',
    '',
    '## 네가 하는 일',
    '',
    '아래 정의된 세부 항목의 값을 정하는 것. 그게 전부다.',
    '',
    '## 네가 하지 않는 일',
    '',
    'HTML, CSS, JavaScript 를 쓰지 않는다. skin.html, style.css, script.js 는',
    '실제 티스토리에서 검증된 골격이 네가 정한 값을 받아 만든다.',
    '치환자([##_..._##])나 그룹 태그(<s_...>)를 직접 쓸 일은 없다.',
    '마크업 조각을 답에 넣지 말 것. 답은 정해진 스키마의 값뿐이다.',
    '',
    '## 아래 계약서와 함정 목록의 용도',
    '',
    '네가 정한 값이 어떤 제약 안에서 렌더되는지 알라고 주는 배경 지식이다.',
    '티스토리가 주지 않는 것을 컨셉으로 삼지 않게 하는 것이 목적이다.',
    '예를 들어 티스토리는 스킨에 조회수를 주지 않으므로 "인기 글을 조회수로 줄 세우는"',
    '컨셉은 만들 수 없다. 계약서를 마크업을 쓰라는 지시로 읽지 말 것.',
    '',
    '## 정할 수 있는 세부 항목',
    '',
    '여기 없는 것은 바꿀 수 없다. 글자 크기, 모서리 둥글기, 줄 간격처럼 목록에 없는 것을',
    '요청받으면 비슷한 항목으로 대신 바꾸지 말고 할 수 없다고 말할 것.',
    '값은 반드시 아래 적힌 것 중에서 고른다.',
    '',
    detailFieldsSummary(),
    '',
    '## 티스토리 치환자 계약서 (배경 지식)',
    '',
    contractSummary(),
    '',
    '## 티스토리 실전 함정 (배경 지식)',
    '',
    '실제 스킨을 열네 번 고치며 걸렸던 것들이다. 대부분 문법은 멀쩡한데 티스토리에',
    '올려야만 드러난다. 골격이 이미 대응해 두었으므로 네가 고칠 것은 없고,',
    '없는 기능을 전제한 컨셉을 만들지 않기 위해 읽는다.',
    '',
    pitfallsSummary(),
    '',
    '## 말투',
    '',
    '사용자에게 보이는 문장은 한국어로, 건조하고 짧게 쓴다.',
    '스킨 용어나 CSS 속성 이름을 쓰지 말고 사용자가 아는 말로 쓴다.',
    '이모지를 쓰지 않는다.',
  ].join('\n');
}

/* ------------------------------------------------------------------ */
/* P1 - 컨셉 4안                                                       */
/* ------------------------------------------------------------------ */

/** 4안 생성에만 붙는 지시. 프리픽스 뒤에 이어 붙는다. */
function conceptTaskRules() {
  return [
    '## 이번 작업: 컨셉 4안',
    '',
    '사용자의 답을 보고 서로 다른 컨셉 네 개를 만든다.',
    '',
    '갈리는 것은 레이아웃이 아니라 컨셉이다. 사이드바 왼쪽과 오른쪽은 컨셉이 아니라',
    '결과다. 넷은 "이 블로그가 방문자에게 무엇을 하게 할 것인가" 라는 질문에 서로',
    '다르게 답해야 한다. 읽게 할 것인가, 찾게 할 것인가, 기록으로 남길 것인가,',
    '바로 읽기 시작하게 할 것인가. 세부 값은 그 답에서 따라 나온다.',
    '',
    '구성:',
    '- 보편 A, 보편 B : 안정적이되 서로 다른 관점. 강조점, 정보 위계, 방문자 동선이 달라야 한다',
    '- 실험 A, 실험 B : 틀을 벗어난 시도. 실험 둘도 서로 달라야 한다',
    '',
    '넷이 서로 다른 이유를 한 줄로 설명할 수 있어야 한다. 색만 다르거나 레이아웃만',
    '다른 넷은 실패다.',
    '',
    '각 안에 넣을 것:',
    `- kind : 보편 A / 보편 B / 실험 A / 실험 B 중 하나. 넷을 한 번씩 쓴다`,
    '- name : 컨셉 이름. 무엇을 하게 할 것인가를 짧게. 넷이 겹치면 안 된다',
    '- summary : 한두 문장. 이 컨셉이 무엇을 전제하는가',
    '- differences : 이 컨셉이 실제로 바꾸는 것 2~4개. 사용자가 그대로 읽을 문장',
    '- tradeoff : 이 컨셉이 포기하는 것. 다른 안을 가리켜도 좋다',
    '- details : 위에 정의된 세부 항목 전부',
    '',
    'tradeoff 를 대충 쓰지 말 것. 넷 다 장점만 적혀 있으면 사용자가 고를 근거가 없다.',
    '무엇을 잃는지 알아야 자기 블로그에 맞는지 판단한다.',
    '',
    `겉모습 조합(${SHAPE_KEYS})이 완전히 같은 안이 둘 있으면 그 한 벌은 버려진다.`,
    '넷의 겉모습 조합은 서로 달라야 한다.',
    '',
    'differences 는 details 와 어긋나면 안 된다. 사이드바를 없앴다고 적었으면',
    'sidebar 는 none 이어야 한다.',
  ].join('\n');
}

/** 사용자가 답한 용도와 컨셉을 사람이 읽는 문장으로 만든다. */
function askedFor(purpose, mood) {
  const p = String(purpose || '').trim();
  const m = String(mood || '').trim();
  const lines = [`용도: ${p || '말하지 않았다. 특정 분야를 가정하지 말 것.'}`];
  if (m) {
    lines.push(`원하는 느낌: ${m}`);
  } else {
    // 컨셉은 비워 둘 수 있는 칸이다. 빈칸을 못 채운 것으로 읽고 되묻게 하면 안 된다.
    lines.push('원하는 느낌: 말하지 않았다. 용도만 보고 만들 것. 되묻지 말 것.');
  }
  return lines.join('\n');
}

/**
 * P1 의 4안 생성 호출.
 *
 * 넷을 한 호출로 같이 만든다. 따로 만들면 서로를 모르는 채 생성되어 보편 A 와 B 가,
 * 실험 A 와 B 가 겹친다. 상호 차별화는 생성 시점에 보장돼야 한다.
 *
 * @param {{purpose?: string, mood?: string}} input
 * @returns {{system: string, messages: {role: string, content: string}[], schema: object, effort: string}}
 */
export function buildConceptPrompt({ purpose, mood } = {}) {
  return {
    system: `${cacheableSystemPrefix()}\n\n${conceptTaskRules()}`,
    messages: [
      {
        role: 'user',
        content: [
          '사용자가 이렇게 답했다.',
          '',
          askedFor(purpose, mood),
          '',
          '이 답에 맞는 컨셉 4안을 만들어라.',
        ].join('\n'),
      },
    ],
    schema: CONCEPT_SET_SCHEMA,
    effort: EFFORT_CONCEPT,
  };
}

/**
 * 한 안만 다시 만들 때 쓰는 스키마.
 * CONCEPT_SET_SCHEMA 의 항목 정의를 그대로 쓰되 kind 를 요청한 것으로 고정한다.
 * 원본을 건드리지 않도록 복사해서 만든다.
 */
export function conceptSchemaFor(kind) {
  const item = CONCEPT_SET_SCHEMA.properties.concepts.items;
  const schema = JSON.parse(JSON.stringify(item));
  if (kind) schema.properties.kind.enum = [kind];
  return schema;
}

/** 살아남은 안들을 재시도 프롬프트에 넣을 형태로 적는다. */
function othersSummary(others) {
  const list = Array.isArray(others) ? others : [];
  if (!list.length) return '(참고할 안이 없다)';

  return list
    .map((c) => {
      const d = c?.details || {};
      const shape = [
        `sidebar=${d.sidebar}`,
        `listStyle=${d.listStyle}`,
        `listItems=[${(d.listItems || []).join(', ')}]`,
        `contentWidth=${d.contentWidth}`,
        `background=${d.background}`,
      ].join(', ');
      return [
        `- [${c?.kind || '종류 없음'}] ${c?.name || '(이름 없음)'}`,
        `  전제: ${c?.summary || ''}`,
        `  포기한 것: ${c?.tradeoff || ''}`,
        `  겉모습: ${shape}`,
      ].join('\n');
    })
    .join('\n');
}

/**
 * 검증에 실패한 한 안만 다시 만드는 호출.
 *
 * 나머지 셋을 참고 자료로 준다. 안 주면 방금 떨어진 것과 비슷한 것을 다시 내놓거나,
 * 살아남은 안과 겹쳐서 또 떨어진다. 재시도 한 번이 사용자 돈이므로 두 번 떨어뜨리지 않는다.
 *
 * @param {{purpose?: string, mood?: string, kind: string, others?: object[]}} input
 */
export function buildRetryConceptPrompt({ purpose, mood, kind, others } = {}) {
  const rules = [
    '## 이번 작업: 한 안만 다시 만들기',
    '',
    `4안 중 "${kind}" 하나가 검증을 통과하지 못했다. 그 한 안만 다시 만든다.`,
    '나머지 셋은 이미 확정됐고 사용자에게 보이고 있다.',
    '',
    '지켜야 할 것:',
    `- kind 는 "${kind}" 로 낸다`,
    '- 아래 살아남은 안들과 겹치지 말 것. 이름, 전제, 방문자에게 시키는 일이 달라야 한다',
    `- 겉모습 조합(${SHAPE_KEYS})이 아래 셋 중 어느 하나와도 완전히 같으면 안 된다`,
    '- 이름을 살아남은 안들 중 어느 것과도 같게 짓지 말 것',
    '- tradeoff 를 비우지 말 것',
    '',
    kind?.startsWith('실험')
      ? '실험안이다. 보편안이 하지 않을 선택을 하되, 정의된 값의 범위는 벗어나지 말 것.'
      : '보편안이다. 안정적으로 만들되 살아남은 안과 관점이 달라야 한다.',
  ].join('\n');

  return {
    system: `${cacheableSystemPrefix()}\n\n${conceptTaskRules()}\n\n${rules}`,
    messages: [
      {
        role: 'user',
        content: [
          '사용자가 이렇게 답했다.',
          '',
          askedFor(purpose, mood),
          '',
          '이미 확정된 나머지 안들:',
          '',
          othersSummary(others),
          '',
          `이것들과 겹치지 않는 "${kind}" 한 안을 만들어라.`,
        ].join('\n'),
      },
    ],
    schema: conceptSchemaFor(kind),
    effort: EFFORT_CONCEPT,
  };
}

/* ------------------------------------------------------------------ */
/* W1 - 대화로 수정                                                    */
/* ------------------------------------------------------------------ */

/**
 * W1 의 출력 스키마.
 *
 * details 는 바뀌지 않은 항목까지 전부 받는다. 바뀐 것만 받으면 "값이 없다" 와
 * "바꾸지 않았다" 를 구별할 수 없고, 병합 규칙이 하나 더 생긴다. 실제로 무엇이
 * 바뀌었는지는 호출한 쪽이 이전 값과 비교하면 알 수 있으므로 모델에게 맡기지 않는다.
 *
 * changes 는 사용자에게 그대로 보여줄 문장이다. 비어 있으면 아무것도 바꾸지 않았다는
 * 뜻이고, 그 이유를 reply 가 말한다.
 */
export const EDIT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['details', 'changes', 'reply'],
  properties: {
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
      description: '지시를 반영한 뒤의 세부 값 전부. 바뀌지 않은 항목은 현재 값을 그대로 적는다',
    },
    changes: {
      type: 'array',
      items: { type: 'string' },
      description: '바꾼 것을 사용자가 읽을 한 줄씩. 바꾼 게 없으면 빈 목록',
    },
    reply: {
      type: 'string',
      description: '한두 문장의 짧은 응답. 못 바꾼 요청이 있으면 여기서 이유를 말한다',
    },
  },
};

/** 편집 지시에만 붙는 규칙. */
function editTaskRules() {
  return [
    '## 이번 작업: 지시대로 세부 값 고치기',
    '',
    '사용자가 말한 것만 바꾼다. 말하지 않은 항목은 현재 값을 그대로 옮겨 적는다.',
    '보기 좋게 만들려고 요청하지 않은 값을 같이 손대지 말 것. 사용자는 자기가 말한',
    '것만 바뀌었다고 믿고 미리보기를 본다.',
    '',
    '표현할 수 없는 요청:',
    '- 정할 수 있는 세부 항목에 없는 것 (글자 크기, 줄 간격, 모서리 둥글기 등)',
    '- 티스토리가 주지 않는 것 (조회수 등. 함정 목록 참고)',
    '이럴 때는 비슷한 항목으로 대신 바꾸지 말고, details 를 현재 값 그대로 두고',
    'changes 를 비운 뒤 reply 에서 할 수 없다고 말한다. 왜 안 되는지 한 문장 덧붙인다.',
    '',
    '한 지시에 되는 것과 안 되는 것이 섞여 있으면 되는 것만 바꾸고 나머지는 reply 에서 말한다.',
    '',
    'changes 는 사용자가 그대로 읽을 문장이다. "sidebar: right" 가 아니라',
    '"사이드바를 오른쪽으로" 처럼 쓴다. 바꾼 항목마다 한 줄씩.',
  ].join('\n');
}

/** 현재 세부 값을 프롬프트에 적는다. 정의된 항목만, 정의된 순서대로 적는다. */
function formatDetails(details) {
  const d = details || {};
  return DETAIL_FIELDS.map((f) => {
    const v = d[f.id];
    if (Array.isArray(v)) return `- ${f.id}: [${v.join(', ')}]`;
    return `- ${f.id}: ${v === undefined ? '(없음)' : v}`;
  }).join('\n');
}

/**
 * 대화 턴을 메시지로 바꾼다. 최근 RECENT_TURNS 개만 남긴다.
 * 오래된 지시는 이미 현재 세부 값에 녹아 있어서 다시 보낼 이유가 없다.
 */
function trimTurns(recentTurns) {
  const list = Array.isArray(recentTurns) ? recentTurns : [];
  return list.slice(-RECENT_TURNS).map((t) => ({
    role: t?.role === 'assistant' ? 'assistant' : 'user',
    content: String(t?.content ?? t?.text ?? ''),
  }));
}

/**
 * W1 의 수정 호출.
 *
 * 현재 세부 값은 대화가 아니라 마지막 사용자 메시지에 붙인다. 앞쪽에 두면 오래된
 * 대화가 뒤에 오면서 이미 지난 상태를 최신인 것처럼 읽게 된다.
 *
 * @param {{currentDetails: object, recentTurns?: object[], userMessage: string}} input
 */
export function buildEditPrompt({ currentDetails, recentTurns, userMessage } = {}) {
  const turns = trimTurns(recentTurns);

  return {
    system: `${cacheableSystemPrefix()}\n\n${editTaskRules()}`,
    messages: [
      ...turns,
      {
        role: 'user',
        content: [
          '지금 스킨의 세부 값:',
          '',
          formatDetails(currentDetails),
          '',
          '이번 지시:',
          String(userMessage ?? '').trim(),
        ].join('\n'),
      },
    ],
    schema: EDIT_SCHEMA,
    effort: EFFORT_EDIT,
  };
}
