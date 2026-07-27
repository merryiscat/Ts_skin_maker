/**
 * 앱 껍데기
 *
 * 화면을 갈아 끼우고 공통 자산을 한 번만 받아 둔다. 화면 사이의 실제 이동 규칙은
 * state.js 가 들고 있고, 여기서는 어느 화면 모듈을 붙일지만 정한다.
 *
 * 화면 모듈 규약
 *
 *   export function mount(root, ctx) -> { update(state), unmount? }
 *
 * mount 는 화면에 들어올 때 한 번만 부른다. 상태가 바뀔 때마다 다시 그리지 않고
 * update 를 부른다. 매번 통째로 다시 그리면 입력칸에서 포커스와 커서 위치가
 * 날아가서 글자를 칠 수 없다.
 *
 * ctx 에는 다음이 들어 있다.
 *   state    현재 상태 (읽기 전용으로 다룰 것)
 *   actions  state.js 가 내보내는 함수 전부
 *   shared   { css, js } 미리보기에 인라인으로 넣을 공유 자산
 *   toast    짧은 알림을 띄우는 함수
 */

import * as actions from './state.js';

const ROUTES = {
  E1: () => import('../screens/e1.js'),
  P1: () => import('../screens/p1.js'),
  P2: () => import('../screens/p2.js'),
  W1: () => import('../screens/w1.js'),
  D1: () => import('../screens/d1.js'),
};

const STEP_LABEL = { E1: '키', P1: '컨셉', P2: '세부', W1: '작업', D1: '내려받기' };

let shared = null;
let current = null; // { id, api }
let root = null;
let barEl = null;

/** 공유 자산은 미리보기에 인라인으로 들어가므로 한 번만 받아 둔다. */
async function loadShared() {
  const [css, js] = await Promise.all([
    fetch(new URL('../presets/base/style.css', import.meta.url)).then((r) => r.text()),
    fetch(new URL('../presets/base/script.js', import.meta.url)).then((r) => r.text()),
  ]);
  return { css, js };
}

function toast(message, kind = 'info') {
  const el = document.createElement('div');
  el.className = `toast${kind === 'bad' ? ' bad' : ''}`;
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), 2600);
}

/** 상단 진행 표시. 아직 갈 수 없는 화면은 눌러도 안 넘어간다. */
function drawBar(state) {
  if (!barEl) return;
  barEl.textContent = '';
  const order = actions.SCREENS;
  const at = order.indexOf(state.screen);

  for (let i = 0; i < order.length; i++) {
    const id = order[i];
    const s = document.createElement('span');
    s.textContent = STEP_LABEL[id];
    if (i === at) s.className = 'on';
    else if (i < at) s.className = 'done';
    if (i < at) {
      s.style.cursor = 'pointer';
      s.title = '이 단계로 돌아가기';
      s.addEventListener('click', () => actions.go(id));
    }
    barEl.append(s);
  }
}

// 화면 전환 순번. 동적 import 를 기다리는 동안 다른 전환이 겹치면
// 늦게 끝난 쪽이 화면을 덮고, 먼저 mount 된 화면은 unmount 를 못 받아
// 리스너(W1 의 matchMedia 등)가 샌다. 순번이 다르면 그 결과는 버린다
let showSeq = 0;

async function show(state) {
  if (current?.id === state.screen) {
    current.api.update?.(state);
    return;
  }

  const my = ++showSeq;

  current?.api.unmount?.();
  root.textContent = '';
  current = null;

  const loader = ROUTES[state.screen];
  if (!loader) {
    root.innerHTML = '<div class="page"><div class="note bad">없는 화면입니다.</div></div>';
    return;
  }

  const mod = await loader();
  // 기다리는 사이 더 새 전환이 시작됐으면 mount 하지 않는다. 그쪽이 화면을 책임진다
  if (my !== showSeq) return;

  const api = mod.mount(root, { state: actions.getState(), actions, shared, toast, go: actions.go });
  current = { id: state.screen, api };
  api.update?.(actions.getState());
}

export async function start(mountPoint, stepBar) {
  root = mountPoint;
  barEl = stepBar;

  try {
    shared = await loadShared();
  } catch (e) {
    root.innerHTML =
      '<div class="page"><div class="note bad">' +
      '<h3>공유 자산을 불러오지 못했습니다</h3>' +
      '<p>ES 모듈과 fetch 는 file:// 에서 막힙니다. 로컬 서버로 열어야 합니다.</p>' +
      '<p class="mono small">python -m http.server 8000</p>' +
      '<p class="small dim">' +
      String(e).replace(/</g, '&lt;') +
      '</p></div></div>';
    return;
  }

  actions.restore();
  actions.subscribe((s) => {
    drawBar(s);
    show(s);
  });

  const s = actions.getState();
  drawBar(s);
  await show(s);
}
