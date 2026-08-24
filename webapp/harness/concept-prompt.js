/**
 * 상담 앞단 (생성형, 2026-08-25 개편)
 *
 * P1 에서 "값싼 4안 스케치" 를 만든다. 각 안은 이름·설명 + 거친 구조(wire)뿐이라
 * 출력이 작아 호출 한 번이 싸다. 이 wire 로 흑백 와이어프레임을 그려 4개를 나란히
 * 보여 주고, 사용자가 하나를 고른다. (buildConceptSetPrompt)
 *
 * 고른 하나만 실현 단계(harness/theme-prompt.js buildDesignPrompt)로 넘어가 "구조 +
 * 색" 을 CSS 로 풀 생성한다. 그래서 비용은 "값싼 스케치 1회 + 풀 디자인 1회" 다 -
 * 4개를 다 풀 생성하지 않는다(2026-08-25 피드백: "흑백 와이어프레임이면 싸지 않냐").
 *
 * 와이어의 거친 구조는 스케치를 그리기 위한 것일 뿐이고, 최종 구조는 CSS 로 열려
 * 있으므로(고정 5종 돌려쓰기가 아님) 스케치는 방향을 고르는 용도로만 쓴다.
 *
 * 안 되는 것(티스토리가 데이터를 안 주는 것)은 애초에 안에 넣지 않는다.
 */

import { pitfallsSummary } from './pitfalls.js';

const EFFORT_CONCEPT = 'low'; // 스케치 4개, 출력이 작다

/** 와이어 스케치에 쓰는 거친 구조 값. */
export const WIRE_LAYOUTS = ['sidebar-left', 'sidebar-right', 'no-sidebar'];
export const WIRE_LISTS = ['standard', 'grid', 'hero', 'dense', 'plain'];

/** 4안 스키마. 각 안은 이름·설명 + 거친 구조(wire) 뿐. OpenAI strict 대응. */
export const CONCEPT_SET_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['concepts'],
  properties: {
    concepts: {
      type: 'array',
      minItems: 4,
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'desc', 'wire'],
        properties: {
          name: { type: 'string', description: '이 컨셉의 짧은 이름. 넷이 겹치면 안 된다' },
          desc: { type: 'string', description: '어떤 전체적인 디자인 방향인지 자연어로 한두 문장' },
          wire: {
            type: 'object',
            additionalProperties: false,
            required: ['layout', 'listStyle'],
            properties: {
              layout: { type: 'string', enum: WIRE_LAYOUTS },
              listStyle: { type: 'string', enum: WIRE_LISTS },
            },
            description: '와이어프레임을 그릴 거친 구조. 넷의 (layout, listStyle) 조합은 서로 달라야 한다',
          },
        },
      },
    },
  },
};

function conceptSetSystem() {
  return [
    '너는 티스토리 블로그 스킨 디자인 상담가다.',
    '',
    '## 이 단계에서 하는 일',
    '',
    '용도를 보고, 이 블로그에 어울리는 디자인 방향을 4개 만든다. 사용자는 이 넷의',
    '와이어프레임을 나란히 보고 하나를 고른다.',
    '',
    '- 넷은 전체 방향이 뚜렷이 달라야 한다(무엇을 앞세우고, 어떻게 보게 할지).',
    '- 각 안: name(짧은 이름, 안 겹치게), desc(자연어 한두 문장), wire(거친 구조).',
    '- wire 의 (layout, listStyle) 조합은 넷이 서로 달라야 한다. 다 같으면 고를 의미가 없다.',
    '  layout: sidebar-left / sidebar-right / no-sidebar',
    '  listStyle: standard(제목+요약) / grid(사진 격자) / hero(대표 사진 크게) / dense(촘촘) / plain(제목 중심)',
    '- desc 와 wire 는 어긋나면 안 된다("사진 격자" 면 listStyle=grid).',
    '- 색·글꼴 같은 세부는 여기서 정하지 않는다(고른 뒤에 정한다).',
    '',
    '## 티스토리 안에서 되는 것만',
    '',
    '티스토리가 데이터를 주지 않는 것(조회수 정렬, 재료 인식, 글별 지도 좌표 등)을 전제한',
    '안은 만들지 마라. 아래는 무엇이 안 되는지 골라내는 판단용이다.',
    '',
    pitfallsSummary(),
    '',
    '## 말투',
    '',
    '한국어, 건조하고 짧게. 이모지 금지.',
  ].join('\n');
}

/**
 * 4안 스케치를 만든다. note 는 사용자가 "이런 느낌으로 다시" 적은 방향(선택).
 * @param {{purpose?: string, note?: string}} input
 */
export function buildConceptSetPrompt({ purpose, note } = {}) {
  const n = String(note || '').trim();
  return {
    system: conceptSetSystem(),
    messages: [
      {
        role: 'user',
        content: [
          `용도: ${String(purpose || '').trim() || '(자세히 안 정함)'}`,
          n ? `\n사용자가 원하는 방향: ${n}` : '',
          '',
          '서로 다른 디자인 방향 4개를 만들어라.',
        ].join('\n'),
      },
    ],
    schema: CONCEPT_SET_SCHEMA,
    effort: EFFORT_CONCEPT,
  };
}

/** wire(거친 구조)를 wireframe.js 가 받는 spec 으로 옮긴다(흑백 스케치용). */
export function wireToSketch(wire = {}) {
  const layoutMap = {
    'sidebar-left': 'layout-sidebar-left',
    'sidebar-right': 'layout-sidebar-right',
    'no-sidebar': 'layout-no-sidebar',
  };
  const listMap = {
    standard: 'list-standard',
    grid: 'list-grid',
    hero: 'list-hero',
    dense: 'list-dense',
    plain: 'list-plain',
  };
  const hasSide = wire.layout !== 'no-sidebar';
  return {
    layout: layoutMap[wire.layout] || 'layout-sidebar-left',
    listStyle: listMap[wire.listStyle] || 'list-standard',
    showThumbnail: wire.listStyle !== 'plain',
    showSummary: wire.listStyle !== 'dense',
    showMenu: true,
    showSearch: true,
    showProfile: hasSide,
    showCategories: hasSide,
    showTagCloud: hasSide,
    showRecentNotice: false,
  };
}

/** 고른 컨셉을 실현 단계에 넘길 때, 스케치 구조를 자연어 힌트로 적는다. */
export function wireHint(wire = {}) {
  const layout = { 'sidebar-left': '왼쪽 사이드바', 'sidebar-right': '오른쪽 사이드바', 'no-sidebar': '사이드바 없음' };
  const list = {
    standard: '제목+요약 목록',
    grid: '사진 격자',
    hero: '첫 글을 대표 사진으로 크게',
    dense: '촘촘한 목록',
    plain: '제목 중심 목록',
  };
  return `${layout[wire.layout] || ''}, ${list[wire.listStyle] || ''}`.replace(/^, |, $/g, '');
}
