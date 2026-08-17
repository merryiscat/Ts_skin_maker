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

const KEY_STORAGE = 'tsm.key';
const PREF_STORAGE = 'tsm.pref';

/** 화면 목록. 순서가 곧 진행 순서다. */
export const SCREENS = ['E1', 'P1', 'P2', 'W1', 'D1'];

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
    mood: '',
    concepts: [],
    conceptIndex: -1,
    mixNote: '',

    // P2
    conceptDetails: null,
    details: defaultDetails(),

    // W1
    chat: [],
    files: null,

    // 공통
    busy: false,
    error: null,
    usage: { calls: 0, input: 0, output: 0, cost: 0 },
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

export function setQuestion({ purpose, mood }) {
  set({
    purpose: purpose ?? state.purpose,
    mood: mood ?? state.mood,
  });
}

export function setConcepts(concepts) {
  set({ concepts, conceptIndex: -1 });
}

/** 실패했다가 다시 만든 안 하나를 자리에 끼워 넣는다. */
export function replaceConcept(kind, concept) {
  const next = state.concepts.filter((c) => c.kind !== kind).concat(concept);
  const order = ['보편 A', '보편 B', '실험 A', '실험 B'];
  next.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  set({ concepts: next });
}

export function chooseConcept(index) {
  const c = state.concepts[index];
  if (!c) return;
  set({
    conceptIndex: index,
    conceptDetails: { ...c.details },
    details: { ...c.details },
  });
}

export function setMixNote(text) {
  set({ mixNote: text });
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

/** 대화의 특정 지점으로 되돌린다. 그 시점의 세부 값도 같이 복원한다. */
export function rewindTo(index) {
  const entry = state.chat[index];
  if (!entry || !entry.details) return;
  set({ chat: state.chat.slice(0, index + 1), details: { ...entry.details } });
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
