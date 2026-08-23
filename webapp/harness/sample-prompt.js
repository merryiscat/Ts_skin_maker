/**
 * 미리보기 샘플 콘텐츠 프롬프트
 *
 * 오른쪽 미리보기에 채울 "그럴듯한 글"을 용도에 맞춰 LLM 으로 만든다. 용도가
 * 무엇이든(개발/여행/요리, 그 밖의 자유 텍스트) 그에 맞는 제목·요약·카테고리·
 * 태그를 뽑는다. 이건 스킨을 생성하는 게 아니라 미리보기 채움이라, LLM 이
 * 잘하는 일(자유 텍스트 생성)이고 값이 조금 어긋나도 위험이 없다.
 *
 * P1(컨셉 4안 생성)과 달리 고정 스키마로 옮기는 문제가 없어, 여기서는 LLM 을
 * 그대로 쓴다.
 */

/** LLM 이 내놓아야 하는 샘플 콘텐츠의 모양. */
export const SAMPLE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['blogTitle', 'blogDesc', 'blogger', 'categories', 'tags', 'posts', 'bodyParagraphs'],
  properties: {
    blogTitle: { type: 'string', description: '블로그 이름. 짧게' },
    blogDesc: { type: 'string', description: '블로그 한 줄 소개' },
    blogger: { type: 'string', description: '글쓴이 한국어 필명' },
    categories: {
      type: 'array',
      minItems: 3,
      maxItems: 4,
      items: { type: 'string' },
      description: '카테고리 이름들',
    },
    tags: {
      type: 'array',
      minItems: 8,
      maxItems: 10,
      items: { type: 'string' },
      description: '태그 이름들',
    },
    posts: {
      type: 'array',
      minItems: 6,
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'summary', 'category', 'tags'],
        properties: {
          title: { type: 'string', description: '글 제목. 길이를 제각각으로' },
          summary: { type: 'string', description: '한두 문장 요약' },
          category: { type: 'string', description: 'categories 중 하나' },
          tags: { type: 'array', minItems: 1, maxItems: 3, items: { type: 'string' } },
        },
      },
    },
    bodyParagraphs: {
      type: 'array',
      minItems: 4,
      maxItems: 6,
      items: { type: 'string' },
      description: '글 상세 미리보기에 쓸 본문 문단들. 각 문단은 두세 문장',
    },
  },
};

/**
 * @param {string} purpose - 사용자가 말한 블로그 용도
 * @returns {{system: string, messages: {role:string,content:string}[], schema: object, effort: string}}
 */
export function buildSampleContentPrompt(purpose) {
  const system = [
    '너는 블로그 미리보기에 채울 그럴듯한 한국어 샘플 콘텐츠를 만든다.',
    '',
    '규칙:',
    '- 주어진 용도에 어울리는 실제 블로그처럼 구체적으로 쓴다.',
    '- 제목과 요약은 길이를 제각각으로 (짧은 것, 긴 것 섞어서). 다 비슷한 길이면 레이아웃 확인이 안 된다.',
    '- 광고 문구, 과장, 이모지, 느낌표 남발 금지. 담백하게.',
    '- category 는 반드시 네가 만든 categories 목록 안의 값으로.',
    '- 실제 인물·상표·저작물의 실명을 지어내 붙이지 말 것.',
  ].join('\n');

  return {
    system,
    messages: [
      {
        role: 'user',
        content: `이 블로그의 용도: ${String(purpose || '').trim() || '개인 기록 블로그'}\n\n이 용도에 맞는 샘플 콘텐츠를 만들어라.`,
      },
    ],
    schema: SAMPLE_SCHEMA,
    effort: 'low',
  };
}
