/**
 * W1 대화 편집 (생성형 흐름, 2026-08-24)
 *
 * 이미 만들어진 스킨을 대화로 다듬는다. 한 번의 호출로 두 가지를 함께 고친다.
 *
 *   details  - 구조·글꼴 등 세부 값(노브). 사이드바/목록/폭/글자크기/글꼴 …
 *   themeCss - 색·질감·테두리·그림자·모서리·hover 등 "보이는 느낌"의 CSS 레이어
 *
 * 왜 한 호출인가: 한 지시에 구조와 느낌이 섞일 수 있다("사이드바 없애고 더 어둡게").
 * 나눠서 부르면 분류가 하나 더 생기고 비용도 두 배다. 한 번에 받아 양쪽을 함께 옮긴다.
 *
 * 옛 W1 편집(harness/system-prompt.js 의 buildEditPrompt)은 details 만 고쳤다 -
 * 생성형 이전, 모델이 CSS 를 안 쓰던 시절 것이다. 이 흐름에서는 이걸 쓴다.
 */

import { DETAIL_FIELDS } from './spec.js';
import { EDIT_SCHEMA, detailFieldsSummary, RECENT_TURNS } from './system-prompt.js';
import { themeGuide } from './theme-prompt.js';

const EFFORT_EDIT = 'low';

/**
 * 출력 스키마. details 는 옛 편집 스키마의 것을 그대로 재사용하고(단일 출처),
 * themeCss 를 하나 더 받는다. OpenAI strict 를 위해 전부 required.
 */
export const STYLE_EDIT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['details', 'themeCss', 'changes', 'reply'],
  properties: {
    details: EDIT_SCHEMA.properties.details,
    themeCss: {
      type: 'string',
      description:
        '지시를 반영한 뒤의 전체 테마 CSS. 색·질감 지시가 없으면 지금 테마 CSS 를 그대로 옮겨 적는다. ' +
        '<style> 태그로 감싸지 말 것.',
    },
    changes: {
      type: 'array',
      items: { type: 'string' },
      description: '바꾼 것을 사용자가 읽을 한 줄씩. 바꾼 게 없으면 빈 목록',
    },
    reply: { type: 'string', description: '한두 문장의 짧은 응답. 못 바꾼 요청이 있으면 여기서 이유를 말한다' },
  },
};

function editSystem() {
  return [
    '너는 이미 만들어진 티스토리 블로그 스킨을 대화로 다듬는 디자이너다.',
    '',
    '## 두 가지를 고칠 수 있다',
    '',
    '- 세부 값(details): 사이드바 위치, 목록 형태, 본문 폭, 글자 크기, 글꼴 등 구조·글꼴',
    '- 테마 CSS(themeCss): 색, 배경, 포인트색, 테두리, 그림자, 모서리 둥글기, 여백 느낌,',
    '  hover 등 "보이는 느낌"',
    '',
    '## 무엇을 어디로 보내나',
    '',
    '- 사이드바/목록/본문 폭/글자 크기/글꼴 변경 → details',
    '- 색·배경·포인트색·테두리·그림자·둥글기·여백감·hover 등 → themeCss (CSS 를 직접 고친다)',
    '- 한쪽만 건드리는 지시면 다른 쪽은 지금 값을 "그대로" 옮겨 적는다. 특히 색 지시가',
    '  없으면 themeCss 는 지금 것을 통째로 그대로 옮긴다(임의로 다시 쓰지 말 것).',
    '',
    '## 말한 것만 바꾼다',
    '',
    '사용자가 말하지 않은 것은 손대지 않는다. 보기 좋게 만들려고 요청하지 않은 값을',
    '같이 바꾸지 말 것. 사용자는 자기가 말한 것만 바뀌었다고 믿고 미리보기를 본다.',
    '',
    '## 표현할 수 없는 요청',
    '',
    '세부 값으로도 테마로도 안 되는 것(티스토리가 데이터를 주지 않는 것: 조회수로 정렬,',
    '글별 지도 좌표 등)은 하지 말고, details 와 themeCss 를 지금 값 그대로 두고 changes 를',
    '비운 뒤 reply 에서 왜 안 되는지 한 문장으로 말한다.',
    '',
    '한 지시에 되는 것과 안 되는 것이 섞여 있으면 되는 것만 바꾸고 나머지는 reply 에서 말한다.',
    '',
    themeGuide(),
    '',
    '## details 로 정할 수 있는 항목',
    '',
    detailFieldsSummary(),
    '',
    '## 말투',
    '',
    'changes 는 사용자가 그대로 읽을 문장이다. "sidebar: right" 가 아니라 "사이드바를',
    '오른쪽으로" 처럼. 바꾼 항목마다 한 줄씩. reply 는 짧게. 이모지 금지.',
  ].join('\n');
}

/** 현재 세부 값을 프롬프트에 적는다. 정의된 항목만, 정의된 순서대로. */
function formatDetails(details) {
  const d = details || {};
  return DETAIL_FIELDS.map((f) => {
    const v = d[f.id];
    if (Array.isArray(v)) return `- ${f.id}: [${v.join(', ')}]`;
    return `- ${f.id}: ${v === undefined ? '(없음)' : v}`;
  }).join('\n');
}

/** 최근 대화만 남긴다. 오래된 지시는 이미 현재 값에 녹아 있어 다시 보낼 이유가 없다. */
function trimTurns(recentTurns) {
  const list = Array.isArray(recentTurns) ? recentTurns : [];
  return list.slice(-RECENT_TURNS).map((t) => ({
    role: t?.role === 'assistant' ? 'assistant' : 'user',
    content: String(t?.content ?? t?.text ?? ''),
  }));
}

/**
 * W1 의 결합 편집 호출.
 *
 * @param {{currentDetails:object, currentThemeCss:string, recentTurns?:object[], userMessage:string}} input
 */
export function buildStyleEditPrompt({ currentDetails, currentThemeCss, recentTurns, userMessage } = {}) {
  const turns = trimTurns(recentTurns);
  return {
    system: editSystem(),
    messages: [
      ...turns,
      {
        role: 'user',
        content: [
          '지금 스킨의 세부 값:',
          '',
          formatDetails(currentDetails),
          '',
          '지금 테마 CSS:',
          String(currentThemeCss || '').trim() || '(아직 없음)',
          '',
          '이번 지시:',
          String(userMessage ?? '').trim(),
        ].join('\n'),
      },
    ],
    schema: STYLE_EDIT_SCHEMA,
    effort: EFFORT_EDIT,
  };
}
