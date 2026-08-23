/**
 * 상담 + 4 와이어 컨셉 생성 (생성형 앞단)
 *
 * 새 흐름의 ①상담 · ②4 와이어 컨셉을 한 번의 호출로 만든다.
 *
 *   ① 상담 - 용도·느낌을 보고 무엇이 되고, 무엇이 손이 가고, 무엇이 티스토리
 *            한계로 안 되는지를 짚는다. 다만 화면에는 가능/어려움/불가 3분류를
 *            나열하지 않고, 시안 요청자에게 디자이너가 건네듯 대화체 한 덩이로 쓴다.
 *   ② 컨셉 - 서로 다른 방향 넷(내부 kind: 보편 A·B / 도전 A·B, 사용자에겐 A~D안).
 *            각 안은 와이어를 그릴 거친 구조(wire)와, CSS 로 실현할 자유 서술(look).
 *
 * 왜 이렇게 나누나: 와이어는 빠르게 비교하라고 거칠게(구조만) 두고, 진짜 리치함은
 * look(자유 텍스트)에 담아 ④실현 단계에서 고정 골격 위에 CSS 로 푼다. 그래서 이
 * 단계의 모델은 아직 CSS·HTML 을 쓰지 않는다 - look 은 마크업이 아니라 서술이다.
 *
 * 계약서·함정 목록을 배경으로 주는 이유는 상담의 정확성 때문이다. 티스토리가
 * 조회수를 안 준다는 걸 모르면 "인기글을 조회수로" 를 되는 것처럼 상담한다.
 */

import { contractSummary } from './contract.js';
import { pitfallsSummary } from './pitfalls.js';
import { defaultDetails } from './spec.js';

/** 발산형 작업이라 생각할 여지를 준다. 편집(low)보다 높게. */
const EFFORT_CONCEPT = 'medium';

/** 와이어에 쓰는 거친 구조 값. 골격이 실제로 그릴 수 있는 것만 연다. */
export const WIRE_LAYOUTS = ['sidebar-left', 'sidebar-right', 'no-sidebar'];
export const WIRE_LISTS = ['standard', 'plain', 'grid', 'dense', 'hero'];
export const WIRE_HEADERS = ['minimal', 'centered', 'split'];
export const WIRE_DENSITIES = ['airy', 'normal', 'compact'];

export const CONCEPT_KINDS = ['보편 A', '보편 B', '도전 A', '도전 B'];

/**
 * 사용자에게 보이는 컨셉 이름. 내부 kind(보편/도전)는 생성 품질용이고, 화면에는
 * 순서대로 A안·B안·C안·D안 으로만 낸다 (2026-08-24 피드백). 표시 이름의 단일 출처.
 */
export function conceptLabel(index) {
  return `${['A', 'B', 'C', 'D'][index] || String(index + 1)}안`;
}

/**
 * 출력 스키마. OpenAI strict 모드를 위해 모든 객체가
 * additionalProperties:false 이고 properties 를 전부 required 에 적는다.
 */
export const CONSULT_CONCEPT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['consultation', 'concepts'],
  properties: {
    consultation: {
      type: 'string',
      description:
        '시안 요청자에게 디자이너가 건네는 상담 말. 무엇이 되고, 무엇이 손이 가고, ' +
        '무엇이 티스토리 한계로 안 되는지를 "가능/어려움/불가" 같은 분류 나열이 아니라 ' +
        '자연스러운 대화체로 녹여 3~5문장. 안 되는 것은 얼버무리지 말고 왜 안 되는지 ' +
        '한 마디로 짚되 부드럽게. 끝은 "방향을 네 가지로 잡아봤다"는 식으로 4안에 넘긴다.',
    },
    concepts: {
      type: 'array',
      minItems: 4,
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'name', 'pitch', 'wire', 'look', 'tradeoff'],
        properties: {
          kind: { type: 'string', enum: CONCEPT_KINDS },
          name: { type: 'string', description: '컨셉 이름. 무엇을 하게 할지 짧게. 넷이 겹치면 안 된다' },
          pitch: { type: 'string', description: '한두 문장. 이 컨셉이 방문자에게 무엇을 하게 하나' },
          wire: {
            type: 'object',
            additionalProperties: false,
            required: ['layout', 'listStyle', 'header', 'density'],
            properties: {
              layout: { type: 'string', enum: WIRE_LAYOUTS },
              listStyle: { type: 'string', enum: WIRE_LISTS },
              header: { type: 'string', enum: WIRE_HEADERS },
              density: { type: 'string', enum: WIRE_DENSITIES },
            },
            description: '와이어를 그리기 위한 거친 구조. 정밀한 값이 아니라 방향',
          },
          look: {
            type: 'string',
            description:
              '색·타이포·여백·질감·모션 등 이 컨셉의 시각 성격을 자유롭게 서술. ' +
              '나중에 CSS 로 실현할 재료다. 마크업이나 CSS 코드가 아니라 서술로 쓴다',
          },
          tradeoff: { type: 'string', description: '이 컨셉이 포기하는 것. 다른 안을 가리켜도 좋다' },
        },
      },
    },
  },
};

/** 모든 호출에 공통으로 들어가는 고정 앞부분. 프롬프트 캐싱을 위해 입력에 안 흔들린다. */
export function consultSystemPrefix() {
  return [
    '너는 티스토리 블로그 스킨을 함께 설계하는 디자인 상담가다.',
    '',
    '## 무엇을 만드는가 - 고정 골격 위의 스킨',
    '',
    '스킨은 검증된 "고정 골격"(skin.html) 위에 CSS 로 옷을 입힌 것이다.',
    '골격은 티스토리 치환자(어디에 제목·목록·본문이 오는지)와 클래스 이름을 정해',
    '두었고, 이건 바꾸지 않는다 - 바꾸면 티스토리가 조용히 아무것도 안 뿌린다.',
    '대신 "어떻게 보이는가"(색·타이포·여백·배치 강조·모션)는 CSS 로 거의 무엇이든',
    '만들 수 있다. 그래서 컨셉의 자유는 look(시각 성격)에 있고, 구조는 골격이',
    '그릴 수 있는 거친 선택(wire)으로 잡는다.',
    '',
    '## 이번 단계에서 네가 하는 일',
    '',
    '1) 상담: 사용자의 용도·느낌이 스킨으로 얼마나 되는지 정직하게 가른다.',
    '   먼저 속으로 세 가지를 판단한다 -',
    '   - 되는 것: CSS 로 무리 없이 되는 것',
    '   - 손이 가는 것: 되지만 골격에 자리를 하나 더 만들어야 하는 것',
    '   - 안 되는 것: 티스토리에 데이터가 없어 진짜 안 되는 것(예: 글별 지도 좌표로',
    '     핀을 찍기, 조회수로 인기글 줄 세우기). 억지로 되는 척하지 말 것.',
    '   그런 다음 이 판단을 세 분류 목록으로 나열하지 말고, 시안 요청자와 마주 앉은',
    '   디자이너처럼 자연스러운 대화체 한 덩이로 건넨다. 안 되는 것은 왜 안 되는지',
    '   부드럽게 한 마디 짚는다.',
    '2) 컨셉 4안: 서로 다른 방향 넷.',
    '',
    '## 이 단계에서 하지 않는 일',
    '',
    'HTML·CSS·JavaScript 코드를 쓰지 않는다. look 은 코드가 아니라 사람 말로 쓴 서술이다.',
    '치환자([##_..._##])나 그룹 태그(<s_...>)를 답에 넣지 말 것.',
    '',
    '## 배경 지식 (상담을 정확히 하라고 준다)',
    '',
    '아래 계약서와 함정 목록은 티스토리가 스킨에 무엇을 주고 안 주는지다.',
    '이것으로 impossible 을 정직하게 판단한다. 코드를 쓰라는 지시가 아니다.',
    '',
    '### 티스토리 치환자 계약서',
    '',
    contractSummary(),
    '',
    '### 티스토리 실전 함정',
    '',
    pitfallsSummary(),
    '',
    '## 말투',
    '',
    '사용자에게 보이는 문장은 한국어로, 건조하고 짧게. 스킨 용어나 CSS 속성 이름 대신',
    '사용자가 아는 말로. 이모지를 쓰지 않는다.',
  ].join('\n');
}

/** 컨셉 4안 생성에만 붙는 규칙. */
function conceptTaskRules() {
  return [
    '## 이번 작업: 상담 + 컨셉 4안',
    '',
    '갈리는 것은 레이아웃이 아니라 컨셉이다. 사이드바 왼쪽/오른쪽은 컨셉이 아니라',
    '결과다. 넷은 "이 블로그가 방문자에게 무엇을 하게 할 것인가"에 서로 다르게 답한다.',
    '읽게 할지, 찾게 할지, 기록으로 남길지, 바로 읽기 시작하게 할지.',
    '',
    '구성:',
    '- 보편 A, 보편 B : 안정적이되 서로 다른 관점. 강조점·정보 위계·동선이 달라야 한다',
    '- 도전 A, 도전 B : 틀을 벗어난 시도. 둘도 서로 달라야 한다',
    '',
    '## 느낌은 제약이다',
    '',
    '사용자가 느낌을 구체적으로 말했으면(배경 밝기, 사진 비중, 글꼴 계열, 여백 등)',
    '그건 네 안 모두가 지켜야 하는 제약이다. 도전안도 예외가 아니다. 못박은 것을',
    '뒤집어 "다르게" 만들지 말고, 정하지 않은 부분에서만 차별화한다.',
    '',
    'look 과 wire 는 서로, 그리고 사용자의 느낌과 어긋나면 안 된다. 큰 사진을',
    '앞세운다면서 listStyle 을 사진 안 보이는 plain 으로 고르는 식이면 실패다.',
    '',
    '각 안에 넣을 것:',
    '- kind : 보편 A / 보편 B / 도전 A / 도전 B 중 하나. 넷을 한 번씩',
    '- name : 컨셉 이름. 넷이 겹치면 안 된다',
    '- pitch : 한두 문장. 방문자에게 무엇을 하게 하나',
    '- wire : 와이어용 거친 구조 (layout, listStyle, header, density)',
    '- look : 색·타이포·여백·질감·모션 등 시각 성격을 사람 말로 서술 (CSS 재료)',
    '- tradeoff : 포기하는 것. 대충 쓰지 말 것 - 넷 다 장점만 있으면 고를 근거가 없다',
    '',
    'wire 의 네 방향(layout, listStyle 조합)이 완전히 같은 안이 둘 있으면 안 된다.',
    '넷의 거친 구조는 서로 달라야 한다.',
    '',
    '## 내보내기 전 자기검증',
    '',
    '확정 전에 하나씩 다시 본다: 이 안의 wire·look 이 사용자의 느낌과, 내가 쓴',
    'pitch 와 어긋나는 곳이 없는가? 한 곳이라도 어긋나면 고쳐서 맞춘 뒤 내보낸다.',
  ].join('\n');
}

/** 사용자가 답한 용도·느낌을 사람이 읽는 문장으로 만든다. */
function askedFor(purpose) {
  const p = String(purpose || '').trim();
  return p
    ? `용도·느낌: ${p}`
    : '용도·느낌: 말하지 않았다. 특정 분야를 가정하지 말고, 되묻지도 말 것.';
}

/**
 * 상담 + 4 와이어 컨셉 생성 호출.
 *
 * @param {{purpose?: string}} input
 * @returns {{system:string, systemParts:[string,string], messages:object[], schema:object, effort:string}}
 */
export function buildConsultConceptPrompt({ purpose } = {}) {
  const systemParts = [consultSystemPrefix(), conceptTaskRules()];
  return {
    system: systemParts.join('\n\n'),
    systemParts,
    messages: [
      {
        role: 'user',
        content: [
          '사용자가 이렇게 말했다.',
          '',
          askedFor(purpose),
          '',
          '먼저 상담을 대화체로 건네고, 이어서 컨셉 4안을 만들어라.',
        ].join('\n'),
      },
    ],
    schema: CONSULT_CONCEPT_SCHEMA,
    effort: EFFORT_CONCEPT,
  };
}

/** wire(거친 구조)를 wireframe.js 가 받는 spec 으로 옮긴다. */
export function wireToSpec(wire = {}) {
  const layoutMap = {
    'sidebar-left': 'layout-sidebar-left',
    'sidebar-right': 'layout-sidebar-right',
    'no-sidebar': 'layout-no-sidebar',
  };
  const listMap = {
    standard: 'list-standard',
    plain: 'list-plain',
    grid: 'list-grid',
    dense: 'list-dense',
    hero: 'list-hero',
  };
  const hasSide = wire.layout !== 'no-sidebar';
  return {
    layout: layoutMap[wire.layout] || 'layout-sidebar-left',
    listStyle: listMap[wire.listStyle] || 'list-standard',
    showThumbnail: wire.listStyle !== 'plain',
    showSummary: wire.density !== 'compact',
    showMenu: true,
    showSearch: wire.header !== 'minimal',
    showProfile: hasSide,
    showCategories: hasSide,
    showTagCloud: hasSide && wire.density !== 'compact',
    showRecentNotice: hasSide && wire.density === 'airy',
  };
}

/**
 * wire(거친 구조)를 세부 값(details, 골격 노브)으로 옮긴다.
 *
 * ④(look 을 CSS 로 실현)를 붙이기 전까지의 다리다. 이걸로 고른 안의 "구조"는
 * 지금 바로 골격이 렌더하고, "시각 성격(look)"은 selectedConcept 에 남겨 두었다가
 * 뒤에 CSS 로 입힌다. density 는 사이드바 구성·목록 항목·본문 폭으로 옮긴다.
 */
export function wireToDetails(wire = {}) {
  const sidebar = wire.layout === 'no-sidebar' ? 'none' : wire.layout === 'sidebar-right' ? 'right' : 'left';
  const density = wire.density || 'normal';
  const hasSide = sidebar !== 'none';
  const listStyle = WIRE_LISTS.includes(wire.listStyle) ? wire.listStyle : 'standard';
  return {
    ...defaultDetails(),
    sidebar,
    listStyle,
    sidebarBlocks: !hasSide
      ? []
      : density === 'compact'
        ? ['profile', 'categories']
        : ['profile', 'categories', 'tags', 'menu'],
    sidebarWidth: density === 'airy' ? 'wide' : density === 'compact' ? 'narrow' : 'normal',
    listItems: listStyle === 'plain' ? ['summary'] : density === 'compact' ? ['thumbnail'] : ['thumbnail', 'summary'],
    contentWidth: density === 'airy' ? 'wide' : density === 'compact' ? 'narrow' : 'normal',
  };
}

/** 컨셉 4안의 기본 검증. 넷의 종류가 다 있고 거친 구조가 안 겹치는지만 본다. */
export function validateConceptSet(concepts) {
  const errors = [];
  if (!Array.isArray(concepts) || concepts.length !== 4) return ['4안이 아니다'];

  const kinds = concepts.map((c) => c?.kind);
  for (const want of CONCEPT_KINDS) if (!kinds.includes(want)) errors.push(`${want} 가 없다`);

  const names = concepts.map((c) => (c?.name || '').trim());
  if (new Set(names).size !== names.length) errors.push('컨셉 이름이 겹친다');

  const shapes = concepts.map((c) => `${c?.wire?.layout}|${c?.wire?.listStyle}`);
  const dup = shapes.filter((s, i) => shapes.indexOf(s) !== i);
  if (dup.length) errors.push(`거친 구조가 같은 안이 있다: ${[...new Set(dup)].join(' / ')}`);

  concepts.forEach((c, i) => {
    if (!c?.name?.trim()) errors.push(`${c?.kind || i + 1}: 이름이 비었다`);
    if (!c?.tradeoff?.trim()) errors.push(`${c?.kind || i + 1}: 포기하는 것이 비었다`);
    if (!c?.look?.trim()) errors.push(`${c?.kind || i + 1}: look 이 비었다`);
  });

  return errors;
}
