/**
 * 상담 앞단 (전반 컨셉 → 4안 파생, 2026-08-26 재개편)
 *
 * 흐름: E1 용도 → C1 전반 컨셉 1개 → P1 4안(그 컨셉에서 파생).
 *
 *   1. buildOverallConceptPrompt — 용도를 보고 "전반 디자인 컨셉" 1개를 자연어로 제안한다
 *      (무드·색감·타이포·레이아웃 성격). 사용자가 다시/note 로 손봐 확정한다. 이 컨셉이
 *      (a) 4안 전체의 앵커, (b) P2 CSS 실현의 look 재료 로 두 번 쓰인다.
 *   2. buildVariantPrompt — 확정 컨셉에서 와이어 1안을 파생한다. 넷은 역할이 갈린다:
 *      2개는 conventional(검증된 안전한 구성), 2개는 innovative(과감·실험적). 서로를
 *      avoid 로 배제하며 순차 생성해, 같은 컨셉을 공유하되 뚜렷이 다른 세트를 만든다(통합).
 *
 * 와이어는 모델이 자유롭게 짓는 흑백 HTML 이다. 소독(sanitizeWireHtml)과 티스토리
 * 실현가능성 린트(lintWireFeasibility)를 통과한 것만 보여 준다(harness/wire-feasibility.js).
 * 하류(P2/W1/D1)는 wireHtml 을 쓰지 않고 컨셉(look)과 고른 안의 hint(구조)만 받는다.
 *
 * 비용은 이 단계에서 따지지 않는다 — 최적 결과부터 만든다(메모리 build-max-then-trim).
 */

import { pitfallsSummary } from './pitfalls.js';
import { WIRE_CLASS_GUIDE } from '../ui/wire.js';

const EFFORT_CONCEPT = 'medium'; // 컨셉·와이어 품질 우선

/** 사이드바 위치. applySelectedConcept 의 초기 details 기본값으로 쓴다. */
export const SIDEBARS = ['left', 'right', 'none'];

/**
 * 4안. 한 컨셉(무드) 아래에서 "구조가 서로 확실히 다른" 레이아웃 4개를 뽑는다.
 * 값 판단(일반/혁신)이 아니라 A~D 로만 부른다(2026-08-26 피드백). 각 seed 는 출발 구조이고,
 * 모델이 컨셉에 맞게 자유롭게 완성한다. seed 가 서로 겹치지 않아 4안이 실제로 다양해진다.
 */
export const VARIANTS = [
  { key: 'A', seed: '사이드바(왼쪽 또는 오른쪽) + 세로 목록. 제목·요약 중심의 익숙한 표준 구조.' },
  { key: 'B', seed: '사이드바 없이 사진을 격자(그리드)로 채우는 갤러리 구조.' },
  { key: 'C', seed: '첫 화면을 큰 대표 이미지(히어로)로 열고, 그 아래로 목록이 이어지는 구조.' },
  { key: 'D', seed: '비대칭·매거진식 자유 배치. 열 너비와 사진 크기를 엇갈려 인상을 남기는 구조.' },
];

/* ============================================================ 전반 컨셉 (C1) */

/**
 * 전반 컨셉 스키마. "한 줄" 로만 받는다(2026-08-26 피드백: 장황한 6필드 카드는 과함).
 * 사용자가 이 한 줄을 보고 채팅으로 방향을 더 다듬는다. OpenAI strict 대응.
 */
export const OVERALL_CONCEPT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'summary'],
  properties: {
    name: { type: 'string', description: '이 컨셉의 짧은 이름' },
    summary: {
      type: 'string',
      description: '이 컨셉을 한 줄로. 무드·색감 느낌을 짧게 녹이되 장황하게 쓰지 말 것(한 문장)',
    },
  },
};

function overallConceptSystem() {
  return [
    '너는 티스토리 블로그 스킨 디자인 상담가다.',
    '',
    '## 이 단계에서 하는 일',
    '',
    '용도를 보고, 이 블로그에 어울리는 전반 디자인 방향을 "한 줄" 로 제안한다. 길게 설명하지',
    '않는다 - 이름과 한 문장이면 된다. 사용자가 그 한 줄을 보고 채팅으로 방향을 더 다듬는다.',
    '',
    '- name: 짧은 이름. summary: 무드·색감 느낌을 짧게 녹인 한 문장.',
    '- 티스토리가 데이터를 주지 않는 것(조회수 정렬, 글별 지도, 목록 태그 나열 등)을 전제하지 마라.',
    '',
    '## 말투',
    '',
    '한국어, 건조하고 짧게. 이모지 금지.',
  ].join('\n');
}

/**
 * 전반 컨셉 1개를 제안한다.
 * @param {{purpose?:string, note?:string, fix?:string[]}} input
 *   note 는 "이런 방향으로 다시"(선택). fix 는 직전 컨셉의 실현가능성 위반 사유(선택).
 */
export function buildOverallConceptPrompt({ purpose, note, fix } = {}) {
  const n = String(note || '').trim();
  const fixes = (Array.isArray(fix) ? fix : []).filter(Boolean);
  const fixBlock = fixes.length
    ? '\n직전 컨셉은 티스토리에서 안 되는 것을 전제했다. 다음을 고쳐 다시 잡아라:\n' +
      fixes.map((f) => `- ${f}`).join('\n')
    : '';
  return {
    system: overallConceptSystem(),
    messages: [
      {
        role: 'user',
        content: [
          `용도: ${String(purpose || '').trim() || '(자세히 안 정함)'}`,
          n ? `\n원하는 방향: ${n}` : '',
          fixBlock,
          '',
          '이 블로그의 전반 디자인 컨셉 1개를 제안하라.',
        ].join('\n'),
      },
    ],
    schema: OVERALL_CONCEPT_SCHEMA,
    effort: EFFORT_CONCEPT,
  };
}

/** 전반 컨셉을 프롬프트/하류에 넘길 한 줄로 편다. */
export function overallConceptToText(c = {}) {
  if (!c || typeof c !== 'object') return '';
  const name = String(c.name || '').trim();
  const summary = String(c.summary || '').trim();
  return [name && `컨셉: ${name}`, summary].filter(Boolean).join(' - ');
}

/* ============================================================ 와이어 4안 (P1) */

/**
 * 단일 와이어 안 스키마.
 * OpenAI strict 대응: additionalProperties:false, 모든 속성 required.
 */
export const CONCEPT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'desc', 'hint', 'sidebar', 'wireHtml'],
  properties: {
    name: { type: 'string', description: '이 안의 짧은 이름' },
    desc: { type: 'string', description: '이 안이 컨셉을 어떻게 살리는지 한두 문장' },
    hint: { type: 'string', description: '구조 한 줄 요약(예: "왼쪽 사이드바, 사진 격자 목록"). 실현 단계로 넘어감' },
    sidebar: { type: 'string', enum: SIDEBARS, description: '이 안의 사이드바 위치. wireHtml 과 일치' },
    wireHtml: { type: 'string', description: '흑백 와이어프레임 HTML. 아래 규약과 제공된 클래스만 써서 짓는다' },
  },
};

function variantSystem(conceptText, seed, refine) {
  const conceptBlock = conceptText
    ? ['### 전반 컨셉 (무드·색 방향은 이걸 반드시 따른다)', conceptText]
    : [
        '### 무드·색은 아직 정하지 않았다',
        '지금은 무드·색이 아니라 "용도에 맞는 레이아웃 구조" 에만 집중한다. 색·무드는 다음',
        '단계에서 정하므로, 흑백 골조로 구조만 뚜렷하게 보여 주면 된다.',
      ];
  // 수정(refine) 모드면 기존 안을 사용자 의견대로 고치는 데 집중하고, 새 안 모드면
  // 시드에서 출발해 형제 안과 다르게 만든다.
  const structBlock = refine
    ? [
        '### 이 안을 사용자 의견대로 고친다',
        '아래 user 메시지의 "기존 안" 을 바탕으로, 사용자 의견을 최우선으로 반영해 고친다.',
        '의견이 사이드바 위치·목록 형태 같은 구조를 바꾸라는 것이면 반드시 그대로 바꾼다.',
        '의견에 없는 부분만 기존 안을 유지한다. 완전히 새 구조를 지어내지는 마라.',
      ]
    : [
        '### 이 안의 출발 구조',
        seed || '',
        '이 구조에서 출발하되 자유롭게 완성한다. 아래 "이미 본 안" 과는 레이아웃(사이드바',
        '유무·위치, 목록 형태: 격자/히어로/세로/매거진)이 뚜렷이 달라야 한다.',
      ];
  return [
    '너는 티스토리 블로그 스킨 디자인 상담가다.',
    '',
    '## 이 단계에서 하는 일',
    '',
    '용도에 맞는 화면 레이아웃 하나를 흑백 와이어프레임으로 그린다.',
    '',
    ...conceptBlock,
    '',
    ...structBlock,
    '',
    '- name: 이 안의 짧은 이름. desc: 이 안이 어떤 구조인지 한두 문장.',
    '- hint: 구조 한 줄 요약(실현 단계로 넘어감). sidebar: left/right/none, wireHtml 과 일치.',
    '- desc·hint·wireHtml 은 서로 어긋나면 안 된다.',
    '',
    '## 와이어프레임 HTML 규약',
    '',
    '- 흑백 골조만. 색·그림자·그라데이션·배경이미지 금지. 실제 콘텐츠 문장 금지(자리 라벨만).',
    '- **아래 제공된 클래스만 그대로 조합해 짓는다. 인라인 style 로 크기·너비·비율을 바꾸지 마라**',
    '  (레이아웃은 클래스가 다 해결한다. width:38% 같은 인라인 크기는 렌더를 깨뜨린다).',
    '  position:fixed/absolute, 원격 URL, 외부 폰트, <script>, on* 핸들러, <style>, <link>,',
    '  <iframe> 은 절대 쓰지 마라.',
    '',
    WIRE_CLASS_GUIDE,
    '',
    '## 티스토리 안에서 되는 것만',
    '',
    '티스토리가 데이터를 주지 않는 것을 그리지 마라.',
    '- 조회수 / 조회순 / 인기순 정렬, 목록에서 글마다 태그 나열, 글별 지도 / 좌표,',
    '  재료·영양·평점 자동 집계, 고정 페이지(독립 문서) 메뉴: 데이터·치환자 없음.',
    '',
    pitfallsSummary(),
    '',
    '## 말투',
    '',
    '한국어, 건조하고 짧게. 이모지 금지.',
  ].join('\n');
}

/**
 * 확정 컨셉에서 와이어 1안을 파생한다.
 * @param {object} input
 * @param {string} [input.purpose]  블로그 용도
 * @param {object} [input.concept]  확정된 전반 컨셉(OVERALL_CONCEPT_SCHEMA 형태)
 * @param {string} [input.seed]     이 안의 출발 구조(VARIANTS[].seed)
 * @param {string[]} [input.avoid]  이미 본 안 요약. 겹치지 않게(새 안)
 * @param {string[]} [input.fix]    직전 시도의 실현가능성 위반 사유
 * @param {string} [input.note]     사용자 의견/추가 요청(선택)
 * @param {string} [input.base]     "지금 안 수정" 모드. 이 안을 바탕으로 구조는 유지하고 note 만 반영
 */
export function buildVariantPrompt({ purpose, concept, seed, avoid, fix, note, base } = {}) {
  const conceptText = overallConceptToText(concept);
  const seen = (Array.isArray(avoid) ? avoid : []).filter(Boolean);
  const fixes = (Array.isArray(fix) ? fix : []).filter(Boolean);
  const n = String(note || '').trim();
  const b = String(base || '').trim();

  // 수정 모드: 기존 안 + 의견(의견 최우선). 새 안 모드: avoid 로 겹침 방지.
  const baseBlock = b ? `\n기존 안: ${b}` : '';
  const avoidBlock = !b && seen.length
    ? '\n이미 본 안들이다. 이것들과 레이아웃 형태가 뚜렷이 다른 새 구조를 내라:\n' +
      seen.map((s, i) => `${i + 1}. ${s}`).join('\n')
    : '';
  const fixBlock = fixes.length
    ? '\n직전 시도는 티스토리에서 안 되는 것을 그렸다. 다음을 고쳐 다시 만들어라:\n' +
      fixes.map((f) => `- ${f}`).join('\n')
    : '';

  return {
    system: variantSystem(conceptText, seed, !!b),
    messages: [
      {
        role: 'user',
        content: [
          `용도: ${String(purpose || '').trim() || '(자세히 안 정함)'}`,
          n ? `\n사용자 의견(최우선 반영): ${n}` : '',
          baseBlock,
          avoidBlock,
          fixBlock,
          '',
          b ? '기존 안에 위 사용자 의견을 반드시 반영해 고쳐라.' : '위 출발 구조에 맞는 화면 레이아웃 1개를 만들어라.',
        ].join('\n'),
      },
    ],
    schema: CONCEPT_SCHEMA,
    effort: EFFORT_CONCEPT,
  };
}

/** 형제 안 배제(avoid)와 하류 전달에 쓸 요약 한 줄. */
export function conceptSummary(c = {}) {
  const name = String(c.name || '').trim();
  const hint = String(c.hint || '').trim();
  return [name, hint].filter(Boolean).join(' - ');
}
