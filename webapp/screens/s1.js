/**
 * S1 설정
 *
 * 화면이 아니라 **가운데 팝업**이다. 단계 흐름(E1-P1-P2-W1-D1)에 끼지 않고,
 * 지금 화면을 그대로 둔 채 그 위에 뜬다. 여닫는 일은 app/app.js 가 한다.
 *
 * 뒤의 두 판은 흐려진 채 남는다. 무엇을 만들던 중이었는지 보이는 채로
 * 설정을 만져야 하기 때문이다.
 *
 *
 * 이 팝업이 지키는 것
 *
 * **되돌릴 수 없는 것을 구분선 아래로 몰았다.** 위쪽은 눌러도 잃는 것이 없고,
 * 아래쪽은 작업이 사라진다. 같은 목록에 섞어 두면 손이 미끄러진다.
 *
 * **키 원문은 여기서도 안 보여준다.** 뒤 4자리만 띄운다. 지우기는 이 자리에서
 * 바로 하고, 바꾸기(새 키를 넣는 일)만 E1 으로 보낸다. 좁은 서랍에서 키를 받으면
 * 발급 안내를 같이 띄울 자리가 없어서, 키가 없는 사람은 결국 막힌다. E1 은
 * 오른쪽에 발급 방법을 통째로 띄우는 화면이다.
 *
 * **되돌릴 수 없는 것 앞에는 내려받기를 먼저 권한다.** 지금까지의 작업을 잃기
 * 전에 받아 둘 기회를 주는 것이 사과보다 낫다.
 */

import { PROVIDERS, RECOMMENDED, estimateCost } from '../providers.js';

/** 대화 한 번에 대략 이 정도. 정확한 값이 아니라 자릿수를 보여주는 용도다. */
const TURN = { input: 6000, output: 1500 };

export function mount(root, ctx) {
  const { actions, toast, close } = ctx;

  // 서랍 안에서 무엇을 펼쳐 놓았는지. 'model' 은 모델 고르기, 'reset' 은 경고
  let open = null;

  root.innerHTML = `
    <div id="main"></div>
    <div id="sub" hidden></div>`;

  const $ = (id) => root.querySelector('#' + id);

  function draw(state) {
    if (open === 'model') return drawModelPicker(state);
    if (open === 'reset') return drawResetWarning(state);
    return drawMain(state);
  }

  /* ------------------------------------------------------------ 기본 */

  function drawMain(state) {
    $('sub').hidden = true;
    $('main').hidden = false;

    const provider = PROVIDERS[state.provider];
    const rec = (RECOMMENDED[state.provider] || []).find((r) => r.id === state.model);
    const turn = estimateCost(state.provider, state.model, TURN);

    $('main').innerHTML = `
      <div class="field">
        <div class="field-label">모델</div>
        <div class="card tight">
          <div class="card-title" style="font-size:var(--t-body)">${esc(rec?.label || state.model || '고르지 않음')}</div>
          <div class="card-sub">${turn == null ? '단가를 모르는 모델입니다' : `대화 한 번 약 ${money(turn)}`}</div>
        </div>
        <button class="sm" style="margin-top:8px" id="to-model">바꾸기</button>
      </div>

      <div class="field">
        <div class="field-label">이번 작업</div>
        <ul class="list rows small">
          <li><span class="spacer">용도</span><span class="strong">${esc(state.purpose || '없음')}</span></li>
          <li><span class="spacer">대화</span><span class="strong">${state.usage.calls} 회</span></li>
          <li><span class="spacer">토큰</span><span class="strong">${(state.usage.input + state.usage.output).toLocaleString()}</span></li>
          <li><span class="spacer">비용</span><span class="strong">${state.usage.cost > 0 ? money(state.usage.cost) : '알 수 없음'}</span></li>
        </ul>
      </div>

      <div class="field">
        <div class="field-label">키</div>
        <div class="row">
          <span class="badge ok">${esc(provider.label)}</span>
          <span class="token">... ${esc(String(state.apiKey || '').slice(-4))}</span>
        </div>
        <div class="col" style="margin-top:8px">
          <button class="sm" id="change-key">키 바꾸기</button>
          <button class="sm danger" id="forget-key">키 지우기</button>
        </div>
        <div class="field-note">바꾸기는 새 키를 넣고 검증하는 화면으로 갑니다. 지우기는 이 브라우저에서 키를 없앱니다.</div>
      </div>

      <div class="field">
        <div class="field-label">테마</div>
        <div class="themebar" id="themebar"></div>
        <div class="field-note">이 도구의 겉모습입니다. 만드는 스킨과는 상관없습니다</div>
      </div>

      <hr class="rule">

      <div class="field">
        <div class="field-label">작업이 사라지는 것</div>
        <div class="col">
          <button class="sm" id="clear-chat">대화 처음부터</button>
          <button class="sm" id="to-reset">처음부터 다시</button>
        </div>
        <div class="field-note">앞은 대화만 지우고, 뒤는 용도부터 다시 시작합니다. 둘 다 비용은 들지 않습니다</div>
      </div>`;

    $('to-model').addEventListener('click', () => {
      open = 'model';
      draw(actions.getState());
    });

    // 키를 바꾸는 일은 새 키 입력 + 검증 + 모델 다시 고르기가 필요하다. 좁은
    // 팝업에는 발급 안내를 띄울 자리가 없어서, 그 일은 오른쪽에 발급 방법을
    // 통째로 띄우는 E1 이 맡는다. 여기서는 키를 비워 E1 이 입력칸을 내밀게 하고
    // 넘긴다 (화면을 옮기면 app.js 가 서랍을 닫는다).
    $('change-key').addEventListener('click', () => {
      actions.setApiKey('');
      actions.go('E1');
    });

    // 지우기는 이 자리에서 바로 한다. 저장된 키·설정을 없애고, 키 없이는 쓸 수
    // 없으니 입력 화면(E1)으로 돌려보낸다
    $('forget-key').addEventListener('click', () => {
      actions.forgetEverything();
      toast('키를 지웠습니다');
      actions.go('E1');
    });

    $('clear-chat').addEventListener('click', () => {
      if (!state.chat.length) {
        toast('지울 대화가 없습니다');
        return;
      }
      actions.clearChat();
      toast('대화를 지웠습니다. 만들어 둔 스킨은 그대로입니다');
    });

    $('to-reset').addEventListener('click', () => {
      open = 'reset';
      draw(actions.getState());
    });

    // 테마 버튼은 ui/theme.js 가 채운다. 그 파일은 실행 시점에 있는 .themebar 만
    // 채우므로, 서랍을 처음 열 때 만들어진 이 자리는 비어 있다. 다시 불러서 채운다
    loadThemeSwitch();
  }

  /* ------------------------------------------------------------ 모델 */

  function drawModelPicker(state) {
    $('main').hidden = true;
    $('sub').hidden = false;

    const recs = (RECOMMENDED[state.provider] || []).filter((r) =>
      state.models.some((m) => m.id === r.id),
    );

    $('sub').innerHTML = `
      <div class="row" style="margin-bottom:12px">
        <button class="sm ghost" id="back">뒤로</button>
        <span class="spacer"></span>
        <span class="tiny dim">바꿔도 지금까지의 작업은 그대로입니다</span>
      </div>
      <div id="recs"></div>
      <div class="field" style="margin-top:14px">
        <div class="field-label">받아온 전체 목록</div>
        <select id="all" style="max-width:100%"></select>
      </div>`;

    $('back').addEventListener('click', () => {
      open = null;
      draw(actions.getState());
    });

    const box = $('recs');
    if (!recs.length) {
      box.innerHTML = '<div class="small dim">정리해 둔 추천이 없습니다. 아래 목록에서 고르세요.</div>';
    }
    for (const r of recs) {
      const card = document.createElement('div');
      card.className = 'card tight pick' + (state.model === r.id ? ' selected' : '');
      card.innerHTML =
        `<div class="card-title" style="font-size:var(--t-body)">${esc(r.label)}</div>` +
        `<div class="card-sub">${esc(r.note || '')}</div>`;
      card.addEventListener('click', () => {
        actions.setModel(r.id);
        open = null;
        draw(actions.getState());
      });
      box.append(card);
    }

    const sel = $('all');
    for (const m of state.models) {
      const o = document.createElement('option');
      o.value = m.id;
      o.textContent = m.label === m.id ? m.id : `${m.label} (${m.id})`;
      sel.append(o);
    }
    sel.value = state.model;
    sel.addEventListener('change', () => actions.setModel(sel.value));
  }

  /* ------------------------------------------------- 되돌릴 수 없는 것 */

  /**
   * 처음부터 다시.
   *
   * 용도부터 다시 시작한다는 것은 지금까지의 대화와 만들어 둔 스킨을 버린다는
   * 뜻이다. 그래서 첫 선택지를 "먼저 내려받기" 로 둔다. 잃기 전에 받아 둘 기회를
   * 주는 것이 나중에 사과하는 것보다 낫다.
   */
  function drawResetWarning(state) {
    $('main').hidden = true;
    $('sub').hidden = false;

    $('sub').innerHTML = `
      <div class="note bad">
        <h3>지금까지의 작업이 사라집니다</h3>
        <p class="small">대화 ${state.usage.calls} 회와 지금 만들어 둔 스킨을 버리고 용도부터 다시 시작합니다.</p>
      </div>
      <div class="col" style="margin-top:14px">
        <button class="primary" id="save-first">먼저 지금 것을 내려받기</button>
        <button class="sm danger" id="do-reset">그래도 다시 시작</button>
        <button class="sm ghost" id="cancel">그만두기</button>
      </div>`;

    $('save-first').addEventListener('click', () => actions.go('D1'));
    $('cancel').addEventListener('click', () => {
      open = null;
      draw(actions.getState());
    });
    $('do-reset').addEventListener('click', () => {
      actions.startOver();
      actions.go('E1');
    });
  }

  return {
    update(state) {
      draw(state);
    },
  };
}

/**
 * 테마 전환 버튼을 다시 채운다.
 *
 * ui/theme.js 는 디자인에서 받은 그대로라 손대지 않았다. 그 파일은 실행되는
 * 순간 문서에 있는 .themebar 만 채우고, 이미 채운 자리는 dataset.built 로
 * 건너뛴다. 그래서 다시 불러도 기존 버튼이 두 벌이 되지 않는다.
 */
function loadThemeSwitch() {
  const s = document.createElement('script');
  s.src = new URL('../ui/theme.js', import.meta.url).href;
  s.addEventListener('load', () => s.remove());
  document.body.append(s);
}

function money(v) {
  return '$' + (v < 0.01 ? v.toFixed(4) : v.toFixed(2));
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
