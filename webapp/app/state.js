/**
 * 앱 상태
 *
 * 서버가 없으므로 모든 상태는 이 모듈이 들고 있는다. 화면은 상태를 직접 고치지 않고
 * actions 를 통해서만 바꾼다. 그래야 어디서 무엇이 바뀌었는지 한 곳에서 보인다.
 *
 * API 키는 기본적으로 메모리에만 둔다. 사용자가 명시적으로 저장을 켰을 때만
 * localStorage 에 넣는다. localStorage 는 확장 프로그램이 읽을 수 있으므로
 * 공용 기기에서는 꺼 두는 편이 낫고, 화면에도 그렇게 적는다.
 */

import { defaultDetails } from '../harness/spec.js';
import { overallConceptToText } from '../harness/concept-prompt.js';

const KEY_STORAGE = 'tsm.key';
const PREF_STORAGE = 'tsm.pref';

/** 화면 목록. 순서가 곧 진행 순서다.
 *  2026-08-24 생성형으로 재피벗. E1(용도) → P1(레이아웃) → C1(무드·색 실현) →
 *  W1(미리보기+대화 편집) → D1(내려받기).
 *  P2(미리보기 확인 전용)는 2026-08-30 제거 - W1 과 미리보기가 똑같아 사용자가 두 화면을
 *  구분하지 못했다. W1 이 미리보기+편집을 겸하므로 C1 다음에 바로 W1 으로 간다. */
export const SCREENS = ['E1', 'P1', 'C1', 'W1', 'D1'];

function emptyState() {
  return {
    screen: 'E1',

    // E1
    provider: 'anthropic',
    apiKey: '',
    keyChecked: false,
    rememberKey: false,
    models: [],
    model: '',

    // P1
    purpose: '',

    // P1 (용도 기반 4 와이어, 2026-08-26 옵션2). 용도에서 구조가 서로 다른 레이아웃 4개(A~D)를
    // 뽑는다. 무드는 아직 없다(다음 C1 단계). 소독+실현가능성 린트를 통과한 것만 쌓인다.
    genConcepts: [], // [{ name, desc, hint, sidebar, wireHtml, key(A~D), warned? }] 4안
    genIndex: -1, // 고른 레이아웃

    // C1 (무드, 2026-08-29 개편). 레이아웃을 고른 뒤 무드 후보 3개를 텍스트+팔레트로 받아
    // 그중 하나를 고른다. 후보는 { name, summary, palette:[{role,label,hex}], warned? }.
    moodCandidates: [], // 아직 안 고른 후보들(C1 이 텍스트로 제시)
    overallConcept: null, // 고른 무드 1개. P2 look 재료. (레이아웃 × 무드 = 두 축)

    conceptNote: '', // "이런 느낌으로 다시" 재생성 방향(선택)
    selectedConcept: null, // 확정한 컨셉 { name, look, hint, sidebar }. 실현 재료

    // 마지막으로 4안을 만든 용도. 이 값이 바뀌면 다시 만든다
    genPurpose: '',

    // ④ 생성된 테마 CSS 레이어와, 그것을 어느 안으로 만들었는지 키(고른 안이 바뀌면 다시 만든다)
    themeCss: '',
    themeFor: '',

    // P2
    conceptDetails: null,
    details: defaultDetails(),
    // 미리보기 채움용 LLM 샘플. { purpose, blogTitle, posts, ... } 또는 null.
    // 용도별로 한 번 만들어 두고 그 용도가 바뀌면 다시 만든다.
    sample: null,
    // 사용자가 올린 글꼴. { name, family, css(@font-face) } 또는 null.
    // bodyFont 를 'uploaded' 로 두면 이 글꼴을 스킨에 임베드해 쓴다.
    uploadedFont: null,

    // W1
    chat: [],
    files: null,

    // 공통
    busy: false,
    error: null,
    usage: { calls: 0, input: 0, output: 0, cost: 0 },

    // E1 에서 용도·느낌을 다 받고 "4안 만들기" 를 누르면 켠다. P1 이 켜진 채로
    // 열리면 묻지 않고 곧장 4안을 생성하고, 소비하는 즉시 끈다. 저장하지 않는다
    pendingGenerate: false,
  };
}

let state = emptyState();
const listeners = new Set();

/** 상태가 바뀔 때마다 부른다. 구독 해제 함수를 돌려준다. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getState() {
  return state;
}

/** 상태를 갈아끼우고 구독자에게 알린다. */
function set(patch) {
  state = { ...state, ...patch };
  for (const fn of listeners) fn(state);
}

/* ------------------------------------------------------------ 저장 */

/** 저장해 둔 키와 설정을 읽어 온다. 페이지를 열 때 한 번 부른다. */
export function restore() {
  try {
    const pref = JSON.parse(localStorage.getItem(PREF_STORAGE) || '{}');
    const patch = {};
    if (pref.provider) patch.provider = pref.provider;
    if (pref.model) patch.model = pref.model;
    if (pref.rememberKey) {
      patch.rememberKey = true;
      const key = localStorage.getItem(KEY_STORAGE);
      if (key) patch.apiKey = key;
    }
    if (Object.keys(patch).length) set(patch);
  } catch {
    // 저장된 값이 깨졌으면 없는 셈 친다. 첫 방문과 같은 상태로 시작한다
  }
}

/** 키 저장 여부를 바꾼다. 끄면 저장해 둔 키를 즉시 지운다. */
export function setRememberKey(on) {
  set({ rememberKey: on });
  if (on) persistKey();
  else localStorage.removeItem(KEY_STORAGE);
  persistPref();
}

function persistKey() {
  if (state.rememberKey && state.apiKey) localStorage.setItem(KEY_STORAGE, state.apiKey);
}

function persistPref() {
  try {
    localStorage.setItem(
      PREF_STORAGE,
      JSON.stringify({
        provider: state.provider,
        model: state.model,
        rememberKey: state.rememberKey,
      }),
    );
  } catch {
    // 저장 공간이 막혀 있어도 앱은 그대로 동작해야 한다
  }
}

/** 저장된 것을 전부 지운다. 공용 기기에서 쓴 사용자에게 필요하다. */
export function forgetEverything() {
  localStorage.removeItem(KEY_STORAGE);
  localStorage.removeItem(PREF_STORAGE);
  set({ apiKey: '', keyChecked: false, rememberKey: false, models: [], model: '' });
}

/* ------------------------------------------------------------ 이동 */

export function go(screen) {
  if (!SCREENS.includes(screen)) return;
  set({ screen, error: null });
}

/* ------------------------------------------------------------ E1 */

export function setProvider(provider) {
  if (provider === state.provider) return;
  // 키도 모델도 제공자에 매여 있다. 이전 키를 남겨 두면 입력칸에 남아 등록된 것처럼
  // 보인다. 형식 검사가 어차피 거부하므로 잘못 나갈 위험은 없지만, 지우는 편이 덜 헷갈린다.
  set({ provider, apiKey: '', keyChecked: false, models: [], model: '' });
  localStorage.removeItem(KEY_STORAGE);
  persistPref();
}

export function setApiKey(key) {
  set({ apiKey: key, keyChecked: false, models: [], model: '' });
  // 키를 비우거나 바꾸는 순간 저장소의 옛 키는 낡은 값이다. 남겨 두면 rememberKey 를 켠 채
  // 교체한 뒤 새로고침했을 때 restore 가 버린 키를 되살린다. 저장은 확인이 끝난
  // setKeyChecked(persistKey) 에서만 하고, 여기서는 낡은 것을 지우기만 한다
  localStorage.removeItem(KEY_STORAGE);
}

/**
 * 키 확인이 끝났을 때. 모델 목록이 같이 들어온다.
 *
 * model 이 비어 있어도 목록 첫 번째로 채워 주지 않는다. 모델은 사용자가
 * 직접 고르는 값이고, 고른 순간이 있어야 E1 이 다음 질문으로 넘어갈 수
 * 있다 (2026-08-17 디자인 피드백). 빈 채로 두면 화면이 고르라고 요구한다.
 */
export function setKeyChecked(models, model) {
  set({ keyChecked: true, models, model: model || '', error: null });
  persistKey();
  persistPref();
}

export function setModel(model) {
  set({ model });
  persistPref();
}

/* ------------------------------------------------------------ P1 */

/**
 * 스키마 선택을 시작한다. 생성 컨셉이 없으므로 기본값을 "기준선(conceptDetails)"
 * 으로 세운다 - P2·W1·되돌리기가 이 기준선을 그대로 쓴다. 한 번만 세우고,
 * 이미 있으면 사용자가 만진 값을 지키기 위해 건드리지 않는다.
 */
export function startDesign() {
  if (!state.conceptDetails) {
    const base = defaultDetails();
    set({ conceptDetails: base, details: base });
  }
}

/** 처음부터 다시 - 용도·기준선·값·대화를 비운다(키는 그대로). E1 로 돌아간다. */
export function startOver() {
  set({
    purpose: '',
    conceptDetails: null,
    details: defaultDetails(),
    chat: [],
    sample: null,
    uploadedFont: null,
    moodCandidates: [],
    overallConcept: null,
    genConcepts: [],
    genIndex: -1,
    conceptNote: '',
    selectedConcept: null,
    genPurpose: '',
    themeCss: '',
    themeFor: '',
  });
}

/* ------------------------------------------------------------ P1 (생성형 앞단) */

/** 상담을 새로 시작한다. 용도가 바뀌면 컨셉·안·선택을 비우고 이 용도로 다시 뽑는다. */
export function resetConsult(purpose) {
  set({
    moodCandidates: [],
    overallConcept: null,
    genConcepts: [],
    genIndex: -1,
    conceptNote: '',
    selectedConcept: null,
    themeCss: '',
    themeFor: '',
    genPurpose: purpose ?? state.purpose,
  });
}

/** C1 이 받은 무드 후보 묶음으로 갈아끼운다("반영" 으로 새로 뽑을 때). */
export function setMoodCandidates(list) {
  set({ moodCandidates: Array.isArray(list) ? list : [] });
}

/** 무드 후보를 뒤에 더한다("다른 무드 더 보기"). */
export function addMoodCandidates(list) {
  if (!Array.isArray(list) || !list.length) return;
  set({ moodCandidates: [...state.moodCandidates, ...list] });
}

/** 후보 중 하나를 무드로 고른다. 테마는 이 무드로 다시 만들게 비운다. */
export function chooseMood(i) {
  const m = state.moodCandidates[i];
  if (!m) return;
  set({ overallConcept: m, themeCss: '', themeFor: '' });
}

/** 고른 무드를 물러 후보 고르기로 되돌린다("다른 무드 고르기"). 후보는 그대로 둔다. */
export function clearChosenMood() {
  set({ overallConcept: null, themeCss: '', themeFor: '' });
}

/** C1 에서 정한 무드를 직접 넣는다(외부 진입용). */
export function setOverallConcept(concept) {
  set({ overallConcept: concept || null, themeCss: '', themeFor: '' });
}

/**
 * C1 에서 사용자가 색 스와치를 손봤을 때. 팔레트(배열)만 바꾸고 테마는 다시 만들게 비운다.
 * palette 는 [{role,label,hex}] 배열이다(무드가 개수를 정한 가변 팔레트).
 */
export function setPalette(palette) {
  if (!state.overallConcept) return;
  set({ overallConcept: { ...state.overallConcept, palette }, themeCss: '', themeFor: '' });
}

/** 4안을 비운다. P1 에서 "4안 다시" 로 세트를 새로 뽑을 때. */
export function resetVariants() {
  set({ genConcepts: [], genIndex: -1 });
}

/** 새로 만든 와이어안 1개를 누적한다(4안을 순차 생성). 방금 것을 기본 선택으로 둔다. */
export function addConcept(concept) {
  if (!concept) return;
  const genConcepts = [...state.genConcepts, concept];
  set({ genConcepts, genIndex: genConcepts.length - 1 });
}

/** 쌓인 안 중 하나를 고른다(강조). 같은 것을 다시 누르면 해제. */
export function chooseConcept(i) {
  set({ genIndex: state.genIndex === i ? -1 : i });
}

/** "이런 느낌으로 다시" 재생성 방향. */
export function setConceptNote(text) {
  set({ conceptNote: text });
}

/**
 * 고른 안을 확정한다. 컨셉(이름·설명·구조 힌트)을 selectedConcept 로 남기고, 세부 값은
 * 중립(listStyle: custom)에 스케치의 사이드바만 반영한다 - 나머지 구조·색은 P2 에서
 * CSS 로 생성한다(디자인 실현).
 */
export function applySelectedConcept() {
  const c = state.genConcepts[state.genIndex];
  if (!c) return;
  // 사이드바는 모델이 준 값을 쓴다(none/right/left). 나머지 구조·색은 P2 가 CSS 로 생성한다.
  const sidebar = c.sidebar === 'none' ? 'none' : c.sidebar === 'right' ? 'right' : 'left';
  const details = { ...defaultDetails(), listStyle: 'custom', sidebar };
  // look 은 전반 컨셉(무드·색감·타이포)이 재료다. hint 는 고른 안의 구조다.
  // 둘을 합쳐 P2 가 "이 컨셉을, 이 구조로" CSS 실현하게 한다.
  const conceptText = overallConceptToText(state.overallConcept);
  const look = [conceptText, c.desc ? `이 안: ${c.desc}` : ''].filter(Boolean).join('\n');
  set({
    selectedConcept: {
      name: state.overallConcept?.name || c.name,
      look,
      hint: c.hint || '',
      sidebar,
      palette: state.overallConcept?.palette || null, // 사용자가 C1 에서 정한 색 팔레트
    },
    conceptDetails: { ...details },
    details: { ...details },
    themeCss: '',
    themeFor: '',
  });
}

/** 고른 컨셉을 가리키는 키. 이 값이 바뀌면 디자인을 다시 만든다. */
export function conceptKey(concept) {
  if (!concept) return '';
  return `${concept.name || ''}`;
}

/** ④ 생성된 테마 CSS 를 넣는다. 어느 안으로 만들었는지 키도 함께 저장한다. */
export function setTheme({ css, forKey }) {
  set({ themeCss: css || '', themeFor: forKey || '' });
}

/** 미리보기 샘플을 저장한다. { purpose 포함 } 로 넣어 용도가 바뀌면 다시 만들게 한다. */
export function setSample(sample) {
  set({ sample });
}

/** 사용자가 올린 글꼴을 저장한다. */
export function setUploadedFont(font) {
  set({ uploadedFont: font });
}

export function setQuestion({ purpose }) {
  set({ purpose: purpose ?? state.purpose });
}

/** E1 의 "4안 만들기" 가 켜고, P1 이 열리며 소비한 뒤 끈다. */
export function requestGenerate(on = true) {
  set({ pendingGenerate: on });
}

/* ------------------------------------------------------------ P2 */

export function setDetails(details) {
  set({ details });
}

/** 컨셉이 정한 값으로 되돌린다. */
export function resetDetails() {
  if (state.conceptDetails) set({ details: { ...state.conceptDetails } });
}

/* ------------------------------------------------------------ W1 */

export function pushChat(entry) {
  set({ chat: [...state.chat, { ...entry, at: state.chat.length }] });
}

/** 대화의 특정 지점으로 되돌린다. 그 시점의 세부 값과 테마도 같이 복원한다. */
export function rewindTo(index) {
  const entry = state.chat[index];
  if (!entry || !entry.details) return;
  set({
    chat: state.chat.slice(0, index + 1),
    details: { ...entry.details },
    // 그 시점의 테마 스냅샷이 있으면 함께 되돌린다(없던 시절 항목이면 그대로 둔다)
    ...(entry.themeCss !== undefined ? { themeCss: entry.themeCss } : {}),
  });
}

/**
 * 내려받을 파일 묶음을 넣는다. W1 에서 만들어 D1 으로 넘긴다.
 *
 * D1 이 스스로 만들게 두지 않는 이유는, 그러면 같은 조립 과정이 두 곳에 생겨
 * 어느 쪽이 진짜인지 헷갈리기 때문이다. 만든 곳이 넘긴다.
 */
export function setFiles(files) {
  set({ files });
}

export function clearChat() {
  if (!state.conceptDetails) return;
  set({ chat: [], details: { ...state.conceptDetails } });
}

/* ------------------------------------------------------------ 공통 */

export function setBusy(busy) {
  set({ busy });
}

export function setError(error) {
  set({ error, busy: false });
}

/** 호출 한 번의 사용량을 더한다. 비용은 단가를 아는 모델만 들어온다. */
export function addUsage(usage, cost) {
  set({
    usage: {
      calls: state.usage.calls + 1,
      input: state.usage.input + (usage?.input || 0),
      output: state.usage.output + (usage?.output || 0),
      cost: state.usage.cost + (cost || 0),
    },
  });
}

/** 테스트에서 쓴다. 화면에서는 부르지 않는다. */
export function __resetForTest() {
  state = emptyState();
  listeners.clear();
}
