/**
 * 상담 앞단 (전반 컨셉 → 4안 파생, 2026-08-26 재개편)
 *
 * 흐름: E1 용도 → P1 레이아웃(1안씩 순차 탐색) → C1 무드 후보 3개 중 택1 → 색 실현.
 *
 *   1. buildVariantPrompt — 용도만 재료로 레이아웃 와이어 1안을 만든다. 정해진 출발 틀(시드)은
 *      없다 - 모델이 용도를 읽고 구조를 스스로 구상한다(2026-08-31, 시드 제거). "새로운 안 보기"
 *      일 때만 이미 본 안을 avoid 로 실어 같은 걸 또 내지 않게 한다.
 *   2. buildMoodsPrompt — 용도를 보고 "무드 후보" 3개를 자연어로 제안한다(이름·한 줄·가변
 *      팔레트 4~10색). 사용자가 하나를 고르면 그 무드가 CSS 실현의 look 재료가 된다.
 *      팔레트는 고정 슬롯이 아니라 무드가 개수를 정한다(2026-08-29 피드백).
 *
 * 와이어는 모델이 자유롭게 짓는 흑백 HTML 이다. 소독(sanitizeWireHtml)과 티스토리
 * 실현가능성 린트(lintWireFeasibility)를 통과한 것만 보여 준다(harness/wire-feasibility.js).
 * 하류(P2/W1/D1)는 wireHtml 을 쓰지 않고 컨셉(look)과 고른 안의 hint(구조)만 받는다.
 *
 * 비용은 이 단계에서 따지지 않는다 — 최적 결과부터 만든다(메모리 build-max-then-trim).
 */

import { WIRE_CLASS_GUIDE } from '../ui/wire.js';

const EFFORT_CONCEPT = 'medium'; // 컨셉·와이어 품질 우선

/**
 * 탐색 호출의 샘플링 온도. 같은 용도라도 첫 안·무드 후보가 매번 조금씩 다르게 나오도록
 * 자유도를 높인다(2026-09-01 사용자 결정: 프롬프트 주입 대신 파라미터 조율).
 * OpenAI·Google 만 적용되고 Anthropic 은 이 호출(thinking 동반)에서 무시된다(providers.js).
 * 수정(refine/base) 모드는 정밀 작업이라 지정하지 않는다(제공자 기본값).
 */
export const EXPLORE_TEMPERATURE = 1.2;

/** 사이드바 위치. applySelectedConcept 의 초기 details 기본값으로 쓴다. */
export const SIDEBARS = ['left', 'right', 'none'];

/* ============================================================ 무드 후보 (C1) */

/**
 * 팔레트 한 칸. role 은 CSS 매핑용 토큰, label 은 사용자에게 보일 한국어 이름.
 * 팔레트는 이 칸들의 배열이고, 개수는 무드가 정한다(4~10). 고정 슬롯이 아니다
 * (2026-08-29 피드백: 핵심 색을 못 박지 말고 무드 컨셉에 따라 4~10색 가변으로).
 */
const PALETTE_ITEM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['role', 'label', 'hex'],
  properties: {
    role: {
      type: 'string',
      description:
        'CSS 역할 토큰. 필수 3: bg(배경) text(글자) accent(포인트). ' +
        '선택: surface(카드/구획) border(경계선) text-dim(보조글자) accent2 accent3(두세번째 포인트) tag(태그). ' +
        '무드가 필요로 하는 것만 쓴다.',
    },
    label: { type: 'string', description: '사용자에게 보일 한국어 짧은 이름(예: 배경, 카드, 글자, 포인트, 포인트2)' },
    hex: { type: 'string', description: '#rrggbb 형식 색값' },
  },
};

/** 무드 후보 하나: 이름 + 한 줄 + 가변 팔레트(4~10색). */
export const MOOD_CANDIDATE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'summary', 'palette'],
  properties: {
    name: { type: 'string', description: '이 무드의 짧은 이름' },
    summary: {
      type: 'string',
      description: '무드·색감 느낌을 짧게 녹인 한 문장(장황하게 쓰지 말 것)',
    },
    palette: {
      type: 'array',
      minItems: 4,
      maxItems: 10,
      items: PALETTE_ITEM_SCHEMA,
      description: '이 무드의 색 팔레트. 무드가 단순하면 4색, 화려하면 최대 10색까지.',
    },
  },
};

/**
 * C1 이 한 번에 받는 무드 후보 묶음(서로 뚜렷이 다른 3개) + 사용자 메시지 해석.
 *
 * 이 단계 입력창은 원래 무드를 다듬는 곳이다. 그런데 미리보기가 "최종 시안" 처럼 보여서
 * 사용자가 정렬·폰트 같은 요소 단위 세부를 여기서 고쳐 달라 하기도 한다. 그 판단(무드냐 세부냐)을
 * 낱말 목록이 아니라 모델이 하게 intent/reply 를 같은 응답에 담는다(2026-08-30 피드백).
 * OpenAI strict 대응: 전부 required + additionalProperties:false.
 */
export const MOODS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['intent', 'reply', 'moods'],
  properties: {
    intent: {
      type: 'string',
      enum: ['mood', 'detail'],
      description:
        '사용자 메시지 해석. 무드·색·분위기 방향이면 mood. 정렬·폰트·글자 크기·간격·특정 요소 위치 ' +
        '같은 요소 단위 세부 요청이면 detail. 메시지가 없으면 mood.',
    },
    reply: {
      type: 'string',
      description:
        'intent 가 detail 일 때만 채운다: 이 단계는 전체 무드·색만 정하고 그런 세부는 무드를 확정한 뒤 ' +
        '다음 단계에서 바꾼다고 짧고 친절하게 안내하는 한국어 한두 문장. mood 면 빈 문자열.',
    },
    moods: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: MOOD_CANDIDATE_SCHEMA,
      description: '서로 뚜렷이 다른 무드 후보 3개. intent 가 detail 이어도 형식상 3개를 채운다(앱이 안 쓴다).',
    },
  },
};

function moodsSystem() {
  return [
    '너는 티스토리 블로그 스킨 디자인 상담가다.',
    '',
    '## 이 단계에서 하는 일',
    '',
    '용도를 보고, 이 블로그에 어울리는 전반 디자인 무드를 서로 뚜렷이 다르게 3개 제안한다.',
    '각 무드는 이름 + 한 문장 + 색 팔레트로만 이뤄진다. 아직 화면은 그리지 않는다 - 사용자가',
    '이 중 하나를 고르면 그때 색을 입힌 실제 화면을 만든다.',
    '',
    '- name: 짧은 이름. summary: 무드·색감 느낌을 짧게 녹인 한 문장.',
    '- palette: 이 무드에 맞는 색을 HEX 로. **개수는 무드가 정한다(4~10색).**',
    '  - 반드시 있어야 하는 것: bg(배경) · text(글자) · accent(포인트). 대비가 충분해 글이 잘 읽혀야 한다.',
    '  - 무드가 필요로 하면 더한다: surface(카드/구획) · border(경계선) · text-dim(보조글자) ·',
    '    accent2 · accent3(두세 번째 포인트) · tag(태그색) 등.',
    '  - 담백·미니멀한 무드는 4~5색으로 절제하고, 네온·매거진처럼 화려한 무드만 포인트를 여러 개 둔다.',
    '  - 각 색에 role(위 토큰)과 label(한국어 표시명)을 함께 붙인다.',
    '- 세 무드는 색 계열·밝기·인상이 서로 확실히 달라야 한다(예: 밝은 담백 / 어두운 네온 / 따뜻한 필름).',
    '- 티스토리가 데이터를 주지 않는 것(조회수 정렬, 글별 지도, 목록 태그 나열 등)을 전제하지 마라.',
    '',
    '## 사용자 메시지 해석 (intent / reply)',
    '',
    '사용자가 방향을 적었으면, 그것이 무드·색 방향인지 아니면 요소 단위 세부 요청인지 판단한다.',
    '- 무드·색·분위기(예: "좀 더 어둡게", "따뜻하게", "미니멀하게", "글자색 밝게") → intent=mood.',
    '  그 방향을 반영해 무드 후보 3개를 새로 낸다. reply 는 빈 문자열.',
    '- 정렬·폰트·글자 크기·간격·줄바꿈·특정 요소(헤더/메뉴/검색창 등) 위치 같은 "요소 단위 세부"',
    '  (예: "제목 정렬 맞춰줘", "폰트 바꿔줘", "헤더 줄 안 맞아") → intent=detail. 이 단계에선 처리하지',
    '  않는다. reply 에 "지금은 전체 무드·색만 정하고, 그런 세부는 무드를 확정한 뒤 다음 단계에서 말로',
    '  바꿀 수 있다" 는 취지를 짧고 친절하게 적는다. (moods 는 형식상 3개를 채우되 앱이 쓰지 않는다.)',
    '- 메시지가 없으면 intent=mood, reply="".',
    '',
    '## 말투',
    '',
    '한국어, 건조하고 짧게. 이모지 금지.',
  ].join('\n');
}

/**
 * 무드 후보 3개를 제안한다.
 * @param {{purpose?:string, note?:string, avoid?:string[], fix?:string[]}} input
 *   note 는 "이런 방향으로"(선택). avoid 는 "더 보기" 에서 이미 본 무드 요약(겹침 방지).
 *   fix 는 직전 제안의 실현가능성 위반 사유(선택).
 */
export function buildMoodsPrompt({ purpose, note, avoid, fix } = {}) {
  const n = String(note || '').trim();
  const seen = (Array.isArray(avoid) ? avoid : []).filter(Boolean);
  const fixes = (Array.isArray(fix) ? fix : []).filter(Boolean);
  const avoidBlock = seen.length
    ? '\n이미 본 무드들이다. 이것들과 색·인상이 겹치지 않는 새 무드를 내라:\n' + seen.map((s) => `- ${s}`).join('\n')
    : '';
  const fixBlock = fixes.length
    ? '\n직전 제안은 티스토리에서 안 되는 것을 전제했다. 다음을 고쳐 다시 잡아라:\n' +
      fixes.map((f) => `- ${f}`).join('\n')
    : '';
  return {
    system: moodsSystem(),
    messages: [
      {
        role: 'user',
        content: [
          `용도: ${String(purpose || '').trim() || '(자세히 안 정함)'}`,
          n ? `\n원하는 방향: ${n}` : '',
          avoidBlock,
          fixBlock,
          '',
          '이 블로그에 어울리는 무드 후보 3개를 제안하라.',
        ].join('\n'),
      },
    ],
    schema: MOODS_SCHEMA,
    effort: EFFORT_CONCEPT,
    temperature: EXPLORE_TEMPERATURE, // 무드 탐색도 매번 다른 후보가 나오게
  };
}

/* ---------------------------------------------- 고른 무드 다듬기 (C1 실현 후) */

/**
 * 무드를 이미 골라 색까지 입힌 뒤, 사용자가 의견을 줄 때. 3후보 picker 로 되돌리지 않고
 * "현재 무드를 그 방향으로 다듬은" 무드 1개를 받아 그 자리에서 재실현한다(2026-08-30 피드백).
 * intent 로 무드/세부를 갈라, 세부(정렬·폰트 등)면 무드를 안 바꾸고 안내만 한다.
 */
export const MOOD_REFINE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['intent', 'reply', 'mood'],
  properties: {
    intent: {
      type: 'string',
      enum: ['mood', 'detail'],
      description:
        '사용자 의견 해석. 무드·색·분위기 방향이면 mood. 정렬·폰트·글자 크기·간격·특정 요소 위치 ' +
        '같은 요소 단위 세부 요청이면 detail.',
    },
    reply: {
      type: 'string',
      description:
        '사용자에게 보일 짧은 한국어 답. mood 면 무엇을 어떻게 바꿨는지 한 문장. detail 이면 이 단계는 ' +
        '전체 무드·색만 정하고 그런 세부는 다음 단계에서 바꾼다고 짧고 친절하게 한두 문장.',
    },
    mood: MOOD_CANDIDATE_SCHEMA,
  },
};

function moodRefineSystem() {
  return [
    '너는 티스토리 블로그 스킨 디자인 상담가다.',
    '',
    '## 이 단계에서 하는 일',
    '',
    '사용자가 이미 무드 하나를 골라 색까지 입힌 상태다. 사용자가 그 무드에 대한 의견을 준다.',
    '의견을 해석해 intent 로 가른다.',
    '',
    '- 무드·색·분위기 방향(예: "좀 더 어둡게", "포인트를 초록으로", "따뜻하게") → intent=mood.',
    '  현재 무드를 그 방향으로 "다듬는다"(완전히 다른 무드로 갈아엎지 말 것 - 현재를 출발점으로 조정만).',
    '  팔레트도 그 방향에 맞게 색을 조정해 mood 에 넣는다. reply 에 무엇을 바꿨는지 한 문장.',
    '- 정렬·폰트·글자 크기·간격·특정 요소(헤더/메뉴 등) 위치 같은 요소 단위 세부(예: "제목 정렬 맞춰줘")',
    '  → intent=detail. 무드는 바꾸지 않는다(mood 에 현재 무드를 그대로 넣는다). reply 에 "지금은 전체',
    '  무드·색만 정하고, 그런 세부는 다음 단계에서 말로 바꿀 수 있다" 는 취지를 짧고 친절하게.',
    '',
    '- 팔레트 개수는 무드가 정한다(4~10색). 각 색에 role/label/hex. bg·text·accent 는 반드시 포함.',
    '- 티스토리가 데이터를 주지 않는 것(조회수 정렬, 글별 지도 등)을 전제하지 마라.',
    '',
    '## 말투',
    '',
    '한국어, 건조하고 짧게. 이모지 금지.',
  ].join('\n');
}

/**
 * @param {{purpose?:string, current?:object, note?:string}} input
 *   current 는 지금 무드(name/summary/palette). note 는 사용자 의견.
 */
export function buildMoodRefinePrompt({ purpose, current, note } = {}) {
  const c = current || {};
  const pal = Array.isArray(c.palette)
    ? c.palette.map((x) => `${x.label || x.role || '색'}(${x.role || '?'}) ${x.hex}`).join(', ')
    : '';
  return {
    system: moodRefineSystem(),
    messages: [
      {
        role: 'user',
        content: [
          `용도: ${String(purpose || '').trim() || '(자세히 안 정함)'}`,
          `\n지금 무드: ${c.name || ''} - ${c.summary || ''}`,
          pal ? `현재 팔레트: ${pal}` : '',
          `\n사용자 의견: ${String(note || '').trim()}`,
          '',
          '위 의견을 해석해 intent 를 정하고 mood/reply 를 채워라.',
        ].join('\n'),
      },
    ],
    schema: MOOD_REFINE_SCHEMA,
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

function variantSystem(conceptText, refine) {
  const conceptBlock = conceptText
    ? ['### 전반 컨셉 (무드·색 방향은 이걸 반드시 따른다)', conceptText]
    : [
        '### 무드·색은 아직 정하지 않았다',
        '지금은 무드·색이 아니라 "용도에 맞는 레이아웃 구조" 에만 집중한다. 색·무드는 다음',
        '단계에서 정하므로, 흑백 골조로 구조만 뚜렷하게 보여 주면 된다.',
      ];
  // 수정(refine) 모드면 기존 안을 사용자 의견대로 고치는 데 집중하고, 새 안 모드면
  // 용도에서 구조를 스스로 구상한다(정해진 출발 틀 없음 - 2026-08-31, 시드 제거).
  const structBlock = refine
    ? [
        '### 이 안을 사용자 의견대로 고친다',
        '아래 user 메시지의 "기존 안" 을 바탕으로, 사용자 의견을 최우선으로 반영해 고친다.',
        '의견이 사이드바 위치·목록 형태 같은 구조를 바꾸라는 것이면 반드시 그대로 바꾼다.',
        '의견에 없는 부분만 기존 안을 유지한다. 완전히 새 구조를 지어내지는 마라.',
      ]
    : [
        '### 레이아웃은 용도에서 나온다',
        '정해진 출발 틀은 없다. 용도를 읽고, 이 블로그가 실제로 어떻게 쓰일지(무엇을 자주 올리고,',
        '방문자가 무엇을 먼저 찾을지)를 생각해서 그에 맞는 화면 구조를 네가 구상한다.',
        '사이드바 유무·위치, 목록 형태(격자/히어로/세로/교차, 그 조합 - 자유), 강조점 - 전부 네 판단이다.',
        '아래 "이미 본 안" 이 있으면 그것들과 레이아웃 형태가 뚜렷이 달라야 한다.',
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
    '## 쓸 수 있는 재료 (티스토리와 골격이 실제로 주는 것. 이 조합으로만 짓는다)',
    '',
    '- 헤더: 블로그 제목(로고), 메뉴, 검색창',
    '- 사이드바 블록: 프로필(이미지·이름·소개·구독 버튼), 공지 목록, 카테고리 목록(글 수 포함),',
    '  태그 모음, 방명록·태그 링크 메뉴, 검색',
    '- 글 목록(글마다): 대표 이미지, 카테고리, 날짜, 제목, 요약, 댓글 수',
    '- 글 상세: 본문, 글 태그, 이전·다음 글, 댓글',
    '- 목록 아래 페이지네이션, 푸터',
    '',
    '## 티스토리 안에서 되는 것만',
    '',
    '위 재료 밖의 위젯(최근 글/인기 글 목록, 배너, 프로모션 영역 등)은 데이터가 없거나 골격이',
    '렌더하지 못한다. 특히 다음은 그리지 마라(검사기가 걸러낸다).',
    '- 조회수 / 조회순 / 인기순 정렬, 목록에서 글마다 태그 나열, 글별 지도 / 좌표,',
    '  재료·영양·평점 자동 집계, 고정 페이지(독립 문서) 메뉴: 데이터·치환자 없음.',
    '',
    '## 말투',
    '',
    '한국어, 건조하고 짧게. 이모지 금지.',
  ].join('\n');
}

/**
 * 레이아웃 와이어 1안을 만든다. 용도가 유일한 재료다(시드 없음, 2026-08-31).
 * @param {object} input
 * @param {string} [input.purpose]  블로그 용도. 모델이 이걸 읽고 구조를 스스로 구상한다
 * @param {object} [input.concept]  확정된 전반 컨셉(있으면 무드 앵커로)
 * @param {string[]} [input.avoid]  "새로운 안 보기" 일 때만: 이미 본 안 요약(같은 걸 또 내지 않게)
 * @param {string[]} [input.fix]    직전 시도의 실현가능성 위반 사유
 * @param {string} [input.note]     사용자 의견/추가 요청(선택)
 * @param {string} [input.base]     "지금 안 수정" 모드. 이 안을 바탕으로 구조는 유지하고 note 만 반영
 */
export function buildVariantPrompt({ purpose, concept, avoid, fix, note, base } = {}) {
  const conceptText = overallConceptToText(concept);
  const seen = (Array.isArray(avoid) ? avoid : []).filter(Boolean);
  const fixes = (Array.isArray(fix) ? fix : []).filter(Boolean);
  const n = String(note || '').trim();
  const b = String(base || '').trim();

  // 수정 모드: 기존 안 + 의견(의견 최우선). 새 안 모드: 이미 본 안만 피한다.
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
    system: variantSystem(conceptText, !!b),
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
          b ? '기존 안에 위 사용자 의견을 반드시 반영해 고쳐라.' : '이 용도에 맞는 화면 레이아웃 1개를 구상해 만들어라.',
        ].join('\n'),
      },
    ],
    schema: CONCEPT_SCHEMA,
    effort: EFFORT_CONCEPT,
    // 새 안 탐색만 자유도를 높인다. 수정(base) 모드는 기존 안을 지켜야 하므로 기본값.
    ...(b ? {} : { temperature: EXPLORE_TEMPERATURE }),
  };
}

/** 형제 안 배제(avoid)와 하류 전달에 쓸 요약 한 줄. */
export function conceptSummary(c = {}) {
  const name = String(c.name || '').trim();
  const hint = String(c.hint || '').trim();
  return [name, hint].filter(Boolean).join(' - ');
}
