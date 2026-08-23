/**
 * 왼쪽 대화 로그
 *
 * 왼쪽 대화는 화면이 바뀌어도 이어진다 (2026-08-23 피드백: 전체 흐름을 하나의
 * 연속 대화로). 여기서는 지금까지 "끝난" 단계의 말풍선을 상태에서 그대로
 * 계산해 낸다.
 *
 * 중요한 규칙(2026-08-23 피드백): 답을 골라도 그 블록을 텍스트로 접지 않는다.
 * 질문과 버튼을 그대로 남기고, 고른 버튼에만 색(.on)을 칠한 채로 남긴다. 그래서
 * 답한 단계도 "정적 버전"의 같은 버튼 블록으로 그린다 - 지금 답하는 자리(E1)의
 * 블록과 생김새가 같고, 답한 뒤에는 리스너만 빠져 색만 남는다.
 *
 * 로그는 가변 배열이 아니라 상태의 순수 함수다. 뒤로 가기(용도 다시, 조건
 * 바꾸기)를 해도 상태가 그만큼 뒤로 가면 로그도 저절로 줄어든다.
 *
 * 지금 답하는 중인 단계는 각 화면이 자기 자리(#screen-root)에 그리고, 이 로그
 * (#conv-log)에는 넣지 않는다 - 그래야 같은 블록이 두 번 나오지 않는다.
 */

export const PURPOSE_Q = '어떤 용도의 블로그를 만들려고 하시나요?';
export const MOOD_Q = '어떤 느낌이면 좋겠어요?';

export const PURPOSE_SAMPLES = [
  '개발 공부한 내용을 정리하는 기술 블로그예요. 코드 예제가 많이 들어갑니다',
  '여행 다녀온 곳을 사진 위주로 기록하려고 해요',
  '요리 레시피와 생활 팁을 모아 두는 블로그입니다',
];

// 느낌 예시는 고른 용도에 맞춰 다르게 낸다 (2026-08-23 피드백). 각 세트는 짧은
// 것과 내용이 많은 시안형을 섞는다 - 실제 디자인 시안이 그렇게 오간다.
// 용도 예시(PURPOSE_SAMPLES)를 키로 쓰고, 직접 적은 용도는 일반 세트로 받는다.
const MOOD_SAMPLES_BY_PURPOSE = {
  // 개발/코드 블로그
  [PURPOSE_SAMPLES[0]]: [
    '터미널 같은 다크 톤',
    '담백하고 글에 집중되는',
    '흑백 대비가 뚜렷한 미니멀',
    '짙은 코드 에디터 배경에 모노스페이스 글꼴, 형광 포인트 색으로 코드 블록이 도드라지는 개발자 감성',
    '흰 배경에 넉넉한 여백과 큰 제목·목차로, 긴 글도 술술 읽히는 문서형 레이아웃',
  ],
  // 여행/사진 기록
  [PURPOSE_SAMPLES[1]]: [
    '화사하고 사진이 돋보이는',
    '잡지처럼 여백이 넓은',
    '따뜻한 필름 톤의',
    '흰 배경에 큼직한 사진을 앞세우고, 제목은 큰 세리프로, 본문은 여백을 넉넉히 둔 잡지 같은 레이아웃',
    '화면 끝까지 꽉 채운 사진과 지도 포인트로, 여행 기록이 앨범처럼 넘어가는 감성',
  ],
  // 요리 레시피/생활 팁
  [PURPOSE_SAMPLES[2]]: [
    '화사하고 먹음직스러운',
    '파스텔 톤의 아기자기한',
    '레시피 카드처럼 재료·순서가 또렷하게 정리된',
    '파스텔 톤에 손글씨 느낌 제목, 둥근 모서리와 부드러운 그림자로 아기자기하고 따뜻하게',
    '따뜻한 베이지 배경에 큼직한 음식 사진과 넉넉한 줄간격으로 편안하게',
  ],
};

const MOOD_SAMPLES_DEFAULT = [
  '담백하고 글에 집중되는',
  '터미널 같은 다크 톤',
  '잡지처럼 여백이 넓은',
  '화사하고 사진이 돋보이는',
  '흰 배경에 큼직한 사진과 큰 제목으로 시원하게',
  '따뜻한 파스텔 톤에 손글씨 느낌으로 아기자기하게',
];

/** 고른 용도에 맞는 느낌 예시. 아는 용도면 맞춤 세트, 아니면 일반 세트. */
export function moodSamplesFor(purpose) {
  return MOOD_SAMPLES_BY_PURPOSE[String(purpose || '').trim()] || MOOD_SAMPLES_DEFAULT;
}

/**
 * 용도 블록.
 *   active=true  - 지금 답하는 자리(E1). markup 에 id 를 달아 E1 이 리스너를 건다.
 *   active=false - 이미 답한 것을 로그에 남기는 정적 버전. 고른 버튼만 색으로 남고,
 *                  직접 적은 답이면 그 값을 읽기 전용으로 보여 준다.
 */
export function purposeBlockHtml(state, active) {
  const chosen = (state.purpose || '').trim();
  const isCustom = chosen && !PURPOSE_SAMPLES.includes(chosen);

  const buttons = PURPOSE_SAMPLES.map(
    (s) =>
      `<button type="button" class="opt${s === chosen ? ' on' : ''}" style="text-align:left">${esc(s)}</button>`,
  ).join('');

  const inputRow = active
    ? `<div class="row" id="purpose-row" style="margin-top:10px">` +
      `<input type="text" id="purpose-input" class="chip-input" style="flex:1 1 150px;min-width:0" placeholder="블로그 용도를 자유롭게 적어 주세요">` +
      `<button class="sm primary" id="purpose-send" style="align-self:stretch">전송</button>` +
      `</div>`
    : isCustom
      ? `<div class="row" style="margin-top:10px"><input type="text" class="chip-input" style="flex:1 1 auto;min-width:0" value="${esc(chosen)}" readonly></div>`
      : '';

  return (
    `<div class="msg"><div class="msg-body"${active ? '' : ' style="pointer-events:none"'}>` +
    esc(PURPOSE_Q) +
    `<div class="col"${active ? ' id="samples"' : ''} style="margin-top:10px">${buttons}</div>` +
    inputRow +
    `</div></div>`
  );
}

/**
 * 느낌 블록. 규약은 용도 블록과 같다.
 *
 * 용도처럼 예시를 고르면 곧장 대화로 전달(커밋)돼 위 로그로 넘어간다(2026-08-23
 * 피드백). 그래서 여기엔 "4안 만들기" 가 없다 - 생성은 다음 "추가 의견" 단계가
 * 맡는다. 예시 버튼은 긴 시안형도 있으므로 왼쪽 정렬로 읽는다.
 */
export function moodBlockHtml(state, active) {
  const chosen = (state.mood || '').trim();
  const samples = moodSamplesFor(state.purpose);
  const isCustom = chosen && !samples.includes(chosen);

  const buttons = samples
    .map(
      (m) => `<button type="button" class="opt${m === chosen ? ' on' : ''}" style="text-align:left">${esc(m)}</button>`,
    )
    .join('');

  if (active) {
    return (
      `<div class="msg"><div class="msg-body">` +
      esc(MOOD_Q) +
      `<div class="opts" id="moods" style="margin-top:10px">${buttons}</div>` +
      `<div class="row" id="mood-row" style="margin-top:10px">` +
      `<input type="text" id="mood-input" class="chip-input" style="flex:1 1 150px;min-width:0" placeholder="직접 적어도 됩니다">` +
      `<button class="sm primary" id="mood-send" style="align-self:stretch">전송</button>` +
      `</div>` +
      `<div class="msg-actions" style="margin-top:10px">` +
      `<button class="sm" id="repick-purpose">이전으로</button>` +
      `</div>` +
      `</div></div>`
    );
  }

  const tail = isCustom
    ? `<div class="row" style="margin-top:8px"><input type="text" class="chip-input" style="flex:1 1 auto;min-width:0" value="${esc(chosen)}" readonly></div>`
    : '';

  return (
    `<div class="msg"><div class="msg-body" style="pointer-events:none">` +
    esc(MOOD_Q) +
    `<div class="opts" style="margin-top:10px">${buttons}</div>` +
    tail +
    `</div></div>`
  );
}

/**
 * 추가 의견 블록.
 *
 * 용도·느낌을 고른 뒤, 그 밖에 전하고 싶은 말을 자유로 받는다(2026-08-23 피드백).
 * 이 단계에서 "4안 만들기" 를 눌러 생성으로 넘어간다. 비워도 되고, 적으면 생성
 * 프롬프트에 그대로 실린다. 예시 버튼이 없는 자유 입력이라 로그에는 사용자
 * 말풍선으로만 남긴다(renderConversation).
 */
export const EXTRA_Q = '더 전하고 싶은 의견이 있으면 적어 주세요. 없으면 그대로 만들어도 됩니다.';

export function extraBlockHtml() {
  return (
    `<div class="msg"><div class="msg-body">` +
    esc(EXTRA_Q) +
    `<input type="text" id="extra-input" class="chip-input" style="margin-top:10px;width:100%" placeholder="예: 광고는 최소로, 모바일에서 특히 깔끔하게">` +
    `<div class="msg-actions" style="margin-top:10px">` +
    `<button class="sm" id="back-mood">이전으로</button>` +
    `<button class="sm primary" id="make">4안 만들기</button>` +
    `</div>` +
    `</div></div>`
  );
}

/* ------------------------------------------------------------ 로그 조립 */

// 진행 순서. 로그에는 "지금 단계보다 앞선" 단계만 들어간다. 선택형으로 바꾸며
// 느낌·추가의견·컨셉 단계는 걷어냈다 - 이제 용도 하나만 대화로 받는다.
const STEPS = ['purpose', 'concept', 'detail', 'chat'];

/** 지금 어느 단계인가. 화면 위치로 정한다. */
function activeStep(state) {
  switch (state.screen) {
    case 'E1':
      return 'purpose';
    case 'P1':
      return 'concept';
    case 'P2':
      return 'detail';
    case 'W1':
      return 'chat';
    case 'D1':
      return 'done';
    default:
      return 'purpose';
  }
}

/** 끝난 단계들을 로그 HTML 로. 이름표(안내/나)는 두지 않는다 - 좌우로 화자를 안다. */
export function renderConversation(state) {
  const active = activeStep(state);
  const idx = active === 'done' ? STEPS.length : STEPS.indexOf(active);
  const done = (s) => STEPS.indexOf(s) < idx;

  const parts = [];

  // 용도는 E1 을 지나면 로그로 남는다. 질문 + 고른 답(정적 블록)으로.
  if (done('purpose') && state.purpose && state.purpose.trim()) {
    parts.push(purposeBlockHtml(state, false));
  }

  return parts.join('');
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
