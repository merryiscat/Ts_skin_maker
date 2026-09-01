/**
 * 앱 껍데기
 *
 * 골격(대화 셸)을 한 번 세워 두고, 그 안의 내용만 단계마다 갈아 끼운다.
 * 화면 사이의 이동 규칙은 state.js 가 들고 있고, 여기서는 어느 화면 모듈을
 * 붙일지와 공통 자리(단계 표시, 캔버스 머리 등)를 그리는 일만 한다.
 *
 *
 * 골격이 이렇게 생긴 이유
 *
 *   +----------------------+------------------------------+
 *   | chat-head            | canvas-head                  |
 *   +----------------------+------------------------------+
 *   |                      |                              |
 *   | chat-body            | canvas-body                  |
 *   |  (화면의 주 출력)     |  (지금 무엇이 만들어지는가)     |
 *   +----------------------+                              |
 *   | chat-foot            |                              |
 *   +----------------------+------------------------------+
 *
 * 예전에는 단계마다 화면 전체가 통째로 갈렸다. 그러면 사용자는 마지막
 * 단계(W1)에 가서야 이 도구가 대화형이라는 것을 알게 된다. 지금은 E1 부터
 * 같은 자리에 대화가 있고, 각 단계의 입력 폼이 응답 말풍선 안으로 들어간다.
 *
 *
 * 화면 모듈 규약
 *
 *   export function mount(root, ctx) -> { update(state), unmount? }
 *
 * mount 는 화면에 들어올 때 한 번만 부른다. 상태가 바뀔 때마다 다시 그리지 않고
 * update 를 부른다. 매번 통째로 다시 그리면 입력칸에서 포커스와 커서 위치가
 * 날아가서 글자를 칠 수 없다.
 *
 *   root         .chat-body - 화면의 주 출력이 들어가는 자리
 *   ctx.panes    나머지 자리들. 아래 표 참고
 *   ctx.state    현재 상태 (읽기 전용으로 다룰 것)
 *   ctx.actions  state.js 가 내보내는 함수 전부
 *   ctx.shared   { css, js } 미리보기에 인라인으로 넣을 공유 자산
 *   ctx.toast    짧은 알림을 띄우는 함수
 *
 * ctx.panes 에 들어 있는 자리
 *   foot         .chat-foot   - 입력줄과 다음 단계로 넘어가는 버튼
 *   canvasHead   .canvas-head - 오른쪽 머리의 오른쪽 끝. 상태 한 줄
 *   canvasBody   .canvas-body - 오른쪽 본문. 도식/미리보기/설치 안내
 *
 * 이 자리들은 화면이 바뀔 때 app.js 가 먼저 비운다. 화면 모듈은 자기가 쓸
 * 자리만 채우면 되고, 안 쓴 자리는 저절로 빈 채로 남는다.
 */

import * as actions from './state.js';
import { renderConversation } from './conversation.js';

const ROUTES = {
  E1: () => import('../screens/e1.js'),
  C1: () => import('../screens/c1.js'),
  P1: () => import('../screens/p1.js'),
  W1: () => import('../screens/w1.js'),
  D1: () => import('../screens/d1.js'),
};


/** 900px 미만에서는 대화와 캔버스를 나란히 못 놓는다. design.css 의 .chatshell 브레이크포인트와 같은 값이어야 한다. */
const NARROW = window.matchMedia('(max-width: 899px)');

let shared = null;
let current = null; // { id, api }
let root = null; // 앱이 들어가는 바깥 요소 (index.html 의 #root)
let panes = null; // 골격을 세우며 잡아 둔 자리들
let showingCanvas = false; // 좁은 화면에서 캔버스 탭을 보고 있는지
let wide = false; // 대화를 접고 캔버스가 전폭을 쓰는 중인지 (W1 의 확대)

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

/**
 * 테마 전환 버튼을 붙인다.
 *
 * ui/theme.js 는 디자인에서 그대로 가져온 파일이라 손대지 않았다. 그 파일은
 * 실행되는 순간 문서에 있는 .themebar 만 채우는데, 그 자리는 이 함수가 골격을
 * 세운 뒤에야 생긴다. 그래서 index.html 에서 미리 부르지 않고 여기서 부른다.
 * (테마 값 자체는 번쩍임을 막으려고 index.html 의 인라인 스크립트가 먼저 건다)
 */
function loadThemeSwitch() {
  const s = document.createElement('script');
  s.src = new URL('../ui/theme.js', import.meta.url).href;
  document.body.append(s);
}

/**
 * 골격을 한 번 세운다.
 *
 * 여기서 만든 요소는 앱이 끝날 때까지 같은 자리에 남는다. 화면이 바뀌어도
 * 대화 머리와 단계 표시가 그대로 있어야 "같은 대화를 계속하는 중"으로 읽힌다.
 */
function buildFrame() {
  root.textContent = '';
  root.innerHTML = `
    <div class="chatshell">

      <div class="chatpane">
        <div class="chat-head">
          <span class="mark">T</span>
          <span class="name">스킨 만들기</span>
          <span class="spacer"></span>
          <span class="badge" id="key-state"></span>
          <button class="sm" id="settings" hidden>설정</button>
        </div>

        <div class="tabs" id="tabs" hidden style="padding:0 var(--s4)">
          <button type="button" class="tab on" id="tab-chat">대화</button>
          <button type="button" class="tab" id="tab-canvas">나오는 것</button>
        </div>

        <!-- 왼쪽 대화는 두 겹이다. #conv-log 는 끝난 단계의 말풍선으로, 화면이
             바뀌어도 셸이 유지한다. #screen-root 는 지금 답하는 단계의 컨트롤로,
             화면 모듈이 채우고 전환 때 비워진다. 둘 다 .chat-body 안이라 하나의
             대화로 이어져 스크롤된다 (2026-08-23: 전체 흐름을 연속 대화로). -->
        <div class="chat-body" id="chat-body">
          <div id="conv-log"></div>
          <div id="screen-root"></div>
        </div>
        <div class="chat-foot" id="chat-foot"></div>
      </div>

      <!-- 감추는 것은 hidden 속성이 한다. design.css 의 [hidden] 이 !important 라
           아래 인라인 display:flex 를 이긴다 -->
      <div class="drawer" id="drawer" hidden style="display:flex;flex-direction:column;min-height:0">
        <div class="panel-head">설정 <span class="spacer"></span><button class="sm ghost" id="settings-close">닫기</button></div>
        <div class="chat-body" id="drawer-body"></div>
      </div>

      <div class="canvas" id="canvas">
        <!-- 테마 전환은 만들고 있는 스킨과 상관없는 도구 설정이라 머리의
             오른쪽 끝에 둔다. 발판은 비어 있지만 남긴다 - 셸의 발판 행을
             왼쪽 입력줄과 나눠 쓰므로 두 판의 아래 경계선이 나란해진다 -->
        <div class="canvas-head">
          <span id="canvas-head-note"></span>
          <span class="spacer"></span>
          <div class="themebar"></div>
        </div>
        <div class="canvas-body" id="canvas-body"></div>
        <div class="canvas-foot"></div>
      </div>

    </div>`;

  const $ = (id) => root.querySelector('#' + id);

  panes = {
    shell: root.querySelector('.chatshell'),
    chatpane: root.querySelector('.chatpane'),
    keyState: $('key-state'),
    settings: $('settings'),
    drawer: $('drawer'),
    drawerBody: $('drawer-body'),
    tabs: $('tabs'),
    // body 는 화면 모듈이 채우는 자리(#screen-root). 스크롤 컨테이너는 그
    // 부모(.chat-body)이고, convLog 는 셸이 유지하는 대화 로그다
    chatBody: $('chat-body'),
    convLog: $('conv-log'),
    body: $('screen-root'),
    foot: $('chat-foot'),
    canvas: $('canvas'),
    canvasHead: $('canvas-head-note'),
    canvasBody: $('canvas-body'),
  };

  $('tab-chat').addEventListener('click', () => setTab(false));
  $('tab-canvas').addEventListener('click', () => setTab(true));
  $('settings').addEventListener('click', () => openSettings());
  $('settings-close').addEventListener('click', () => closeSettings());

  NARROW.addEventListener('change', applyWidth);
  applyWidth();
}

/**
 * 좁은 화면에서 대화와 캔버스 중 하나만 보여준다.
 *
 * 넓은 화면에서는 둘 다 보이므로 탭 자체를 감춘다. 감추기만 하고 상태를
 * 되돌리지는 않는다 - 창을 다시 좁혔을 때 보던 쪽으로 돌아가는 편이 덜 놀랍다.
 */
function applyWidth() {
  if (!panes) return;
  const narrow = NARROW.matches;
  panes.tabs.hidden = !narrow;

  // 설정 팝업은 판 위에 떠 있을 뿐 자리를 차지하지 않으므로 폭 계산과 무관하다

  // 확대 중이면 넓든 좁든 캔버스만 보인다. 이 검사를 빼먹으면 창 크기를 바꾸는
  // 순간 applyWidth 가 확대를 풀어 버린다
  if (wide) {
    panes.canvas.hidden = false;
    panes.chatpane.hidden = true;
    return;
  }

  panes.shell.style.gridTemplateColumns = '';
  panes.canvas.hidden = narrow && !showingCanvas;
  panes.chatpane.hidden = narrow && showingCanvas;
}

function setTab(canvas) {
  showingCanvas = canvas;
  root.querySelector('#tab-chat').classList.toggle('on', !canvas);
  root.querySelector('#tab-canvas').classList.toggle('on', canvas);
  applyWidth();
}

/* ------------------------------------------------------------ 설정 서랍 */

/*
 * 설정은 화면(라우트)이 아니라 가운데 팝업이다.
 *
 * 단계 흐름(E1-P1-P2-W1-D1)에 끼워 넣으면 "몇 번째 단계"의 셈이 틀어지고,
 * 작업 중에 설정 하나 바꾸려고 흐름 밖으로 튕겨 나갔다 돌아와야 한다.
 * 그래서 지금 화면을 그대로 둔 채 그 위에 띄운다.
 *
 * 뒤의 두 판은 흐려진 채(.behind) 남는다. 무엇을 만들던 중이었는지 보이는
 * 채로 설정을 만져야 한다. 원래는 왼쪽 대화 자리를 덮는 서랍이었는데
 * 2026-08-17 디자인 피드백으로 팝업이 되었다.
 */

let settingsApi = null; // 서랍에 붙은 s1 모듈

async function openSettings() {
  if (!panes || !panes.drawer.hidden) return;

  panes.drawer.hidden = false;
  panes.shell.classList.add('overlay');
  panes.chatpane.classList.add('behind');
  panes.canvas.classList.add('behind');

  if (!settingsApi) {
    const mod = await import('../screens/s1.js');
    settingsApi = mod.mount(panes.drawerBody, {
      state: actions.getState(),
      actions,
      toast,
      close: closeSettings,
    });
  }
  settingsApi.update?.(actions.getState());
}

function closeSettings() {
  if (!panes || panes.drawer.hidden) return;
  panes.drawer.hidden = true;
  panes.shell.classList.remove('overlay');
  panes.chatpane.classList.remove('behind');
  panes.canvas.classList.remove('behind');
  applyWidth();
}

/**
 * 왼쪽 대화 로그를 다시 그린다.
 *
 * 끝난 단계의 말풍선은 상태에서 계산해 낸다(conversation.js). 화면이 바뀌어도
 * 이 자리는 셸이 유지하므로 대화가 접히지 않는다. 새 말풍선이 붙으면 바닥으로
 * 내려 방금 것이 보이게 한다 - 단, 사용자가 위로 올려 지난 대화를 읽는 중이면
 * 억지로 끌어내리지 않는다.
 */
function renderConvLog(state) {
  if (!panes) return;
  const box = panes.chatBody;
  const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  panes.convLog.innerHTML = renderConversation(state);
  if (nearBottom) box.scrollTop = box.scrollHeight;
}

/**
 * 대화 머리에서 화면마다 달라지는 것.
 *
 * 단계 표시는 두 번에 걸쳐 걷어냈다. 처음엔 다섯 단계를 늘어놓는 줄(.steprail)이
 * 있었고, 그다음엔 "1 / 5 키" 배지가 남아 있었다. 둘 다 뺀 이유는 같다 - 대화가
 * 시작되기도 전에 위쪽 자리를 안내가 차지했고, 되돌아가는 길은 각 화면이 이미
 * 자기 말로 제공하고 있다(P1 "조건 바꾸기", P2 "컨셉 다시 고르기",
 * D1 "작업으로 돌아가기"). 지금 이 자리에 남은 것은 설정 버튼 하나뿐이다.
 */
function drawStep(state) {
  if (!panes) return;

  /*
   * 키 상태는 셸이 상시 들고 있는다.
   *
   * 예전에는 E1 의 말풍선 안에 "확인됨" 배지가 있었는데, 그 말풍선은 대화가
   * 길어지면 위로 밀려 올라가 안 보인다. 키가 살아 있는지는 어느 화면에서든
   * 즉시 보여야 하는 값이라 항상 같은 자리에 둔다.
   */
  panes.keyState.textContent = state.keyChecked ? 'api-key 확인' : 'api-key 미확인';
  panes.keyState.className = 'badge ' + (state.keyChecked ? 'ok' : 'bad');

  // 키를 확인하기 전에는 설정에 담을 것이 없다. 확인하고 나면 어느 화면에서든
  // 여기서 키와 모델을 바꿀 수 있다
  panes.settings.hidden = !state.keyChecked;

  // 열어 둔 채로 상태가 바뀔 수 있다. 모델을 바꾸면 서랍 안의 값도 따라가야 한다
  if (!panes.drawer.hidden) settingsApi?.update?.(state);
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

  // 설정에서 "키 관리"를 누르면 E1 으로 간다. 서랍이 열린 채로 넘어가면
  // 도착한 화면의 대화가 서랍에 가려 안 보인다
  closeSettings();

  current?.api.unmount?.();
  current = null;

  // 화면이 자기가 안 쓰는 자리를 치우는 것까지 기억하게 하면 언젠가 빠뜨린다.
  // 자리를 내주는 쪽이 비우는 것이 규칙이다
  for (const el of [panes.body, panes.foot, panes.canvasBody]) el.textContent = '';
  panes.canvasHead.textContent = '';

  // 내용만 비우고 클래스를 그대로 두면 앞 화면이 붙인 것이 남는다. P1 이 붙이는
  // .center(가운데 정렬)가 대표적인데, 그 상태로 E1 로 돌아가면 도식이 가운데
  // 뭉쳐서 뜬다
  panes.canvasBody.className = 'canvas-body';

  // 확대는 그 화면에서만 유효한 상태다. 켠 채로 넘어가면 다음 화면은 대화가
  // 사라진 채로 뜬다
  wide = false;
  panes.shell.style.gridTemplateColumns = '';
  applyWidth();

  const loader = ROUTES[state.screen];
  if (!loader) {
    panes.body.innerHTML = '<div class="note bad">없는 화면입니다.</div>';
    return;
  }

  const mod = await loader();
  // 기다리는 사이 더 새 전환이 시작됐으면 mount 하지 않는다. 그쪽이 화면을 책임진다
  if (my !== showSeq) return;

  const api = mod.mount(panes.body, {
    state: actions.getState(),
    actions,
    shared,
    toast,
    go: actions.go,
    // 화면의 root(#screen-root)는 스크롤 컨테이너가 아니다(그 부모 .chat-body 가
    // 대화 로그와 함께 스크롤한다). 새 말풍선을 바닥으로 내릴 땐 이걸 부른다
    scrollChat: () => {
      panes.chatBody.scrollTop = panes.chatBody.scrollHeight;
    },
    panes: {
      foot: panes.foot,
      canvasHead: panes.canvasHead,
      canvasBody: panes.canvasBody,
    },
    /** 좁은 화면에서 캔버스로 눈을 옮겨야 할 때. 4안이 나온 순간 같은 경우다 */
    showCanvas: () => {
      if (NARROW.matches) setTab(true);
    },

    /**
     * 대화를 접고 캔버스가 전폭을 쓰게 한다. W1 의 "확대" 가 쓴다.
     *
     * 대화를 감추기만 하면 격자의 첫 칸(400px)이 빈 채로 남는다. 칸 자체를
     * 없애야 미리보기가 그 자리까지 쓴다. 그래서 두 가지를 같이 만진다.
     */
    setWide: (on) => {
      wide = !!on;
      panes.shell.style.gridTemplateColumns = wide ? '1fr' : '';
      applyWidth();
    },
  });

  current = { id: state.screen, api };
  api.update?.(actions.getState());

  // 새 화면의 컨트롤은 대화 맨 아래에 붙는다. 방금 것이 보이게 바닥으로 내린다.
  // (화면 모듈의 root 는 #screen-root 라 스크롤 컨테이너가 아니다 - 여기서 한다)
  panes.chatBody.scrollTop = panes.chatBody.scrollHeight;
}

export async function start(mountPoint) {
  root = mountPoint;

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

  buildFrame();
  loadThemeSwitch();

  actions.restore();
  actions.subscribe((s) => {
    renderConvLog(s);
    drawStep(s);
    show(s);
  });

  const s = actions.getState();
  renderConvLog(s);
  drawStep(s);
  await show(s);
}
