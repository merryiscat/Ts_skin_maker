/**
 * E1 진입 / 키 등록
 *
 * 키를 요구하기 전에 무엇을 받는 서비스인지 도식 넷으로 먼저 보여준다.
 * 키 확인은 모델 목록 조회로 한다. 토큰이 들지 않으므로 키가 살아 있는지와
 * 쓸 수 있는 모델을 한 번에 얻는다. 확인 전에는 모델도 시작 버튼도 잠근다 -
 * 잘못된 키로 P1 까지 갔다가 되돌아오는 낭비를 없애는 것이 이 화면의 목적이다.
 *
 * 화면 모듈 규약은 app/app.js 위쪽 주석에 있다.
 */

import { PROVIDERS, RECOMMENDED, validateKeyFormat, listModels, estimateCost } from '../providers.js';
import { detailsToPreset } from '../harness/spec.js';
import { schematic } from '../ui/schematic.js';

/**
 * 상단 결과물 도식 네 개.
 *
 * "답에 맞춰 매번 다른 4안이 나옵니다" 를 말이 아니라 그림으로 보여주는 자리다.
 * 넷이 눈에 띄게 달라야 뜻이 전달되므로 사이드바 위치, 목록 모양, 배경을 전부 다르게 잡았다.
 */
const SHOWCASE = [
  { sidebar: 'left', listStyle: 'standard', listItems: ['thumbnail', 'summary'], background: 'light', accent: '#2f6f4f' },
  { sidebar: 'none', listStyle: 'plain', listItems: [], background: 'light', accent: '#a3352a', features: ['toc'] },
  { sidebar: 'none', listStyle: 'grid', listItems: ['thumbnail'], background: 'light', accent: '#2f4f8f' },
  { sidebar: 'right', listStyle: 'dense', listItems: ['thumbnail', 'summary'], background: 'dark', accent: '#c08a2e' },
];

/**
 * 비용 예상에 쓰는 대략의 토큰 수.
 *
 * 정확한 값이 아니라 자릿수를 보여주기 위한 것이다. 실제 사용량은 답변 길이에 따라 달라진다.
 */
const EST = {
  concepts: { input: 4000, output: 3500 },
  turn: { input: 6000, output: 1500 },
};

/**
 * 오류 문구.
 *
 * 세 가지를 구분하는 이유가 각각 다르다. 형식 오류는 호출 전에 걸러 비용을 아꼈다는 사실을
 * 알려야 하고, 거부와 네트워크 실패는 문구가 같으면 멀쩡한 키를 의심하며 시간을 버린다.
 */
const ERRORS = {
  format: {
    title: '키 형식이 다릅니다',
    tail: '호출 전에 걸러내므로 비용이 들지 않습니다',
  },
  invalid_key: {
    title: '키가 거부되었습니다',
    body: '제공자가 이 키를 인정하지 않습니다. 오타가 없는지, 결제 수단이 등록되어 있는지 확인하세요.',
    tail: 'Anthropic 과 OpenAI 는 401, Google 은 400 으로 답합니다',
  },
  network: {
    title: '제공자에 닿지 못했습니다',
    body: '네트워크 문제로 보입니다. 키 문제가 아닐 수 있으니 잠시 후 다시 시도하세요.',
    tail: '확장 프로그램이 요청을 막는 경우도 있습니다',
  },
  api: {
    title: '제공자가 오류를 돌려줬습니다',
    tail: '키가 아니라 요청이나 제공자 쪽 문제일 수 있습니다',
  },
};

export function mount(root, ctx) {
  const { actions, toast } = ctx;

  let checking = false;
  let failure = null; // { kind, message }
  let unlocked = false; // 교체를 눌러 키 입력으로 돌아간 상태
  let custom = false; // 모델을 직접 입력하는 중
  let switched = false; // 제공자를 바꿔 확인이 풀린 상태. 모델 칸의 문구가 달라진다
  let attempt = 0; // 확인 중에 제공자를 바꾸면 늦게 온 응답을 버린다

  // 저장해 둔 키로 들어온 경우. 원문을 다시 보여주지 않고 등록 카드로 시작한다
  const storedAtMount = !!(actions.getState().rememberKey && actions.getState().apiKey);

  root.innerHTML = `
    <div class="page">
      <h2 style="font-size:18px;margin-bottom:6px">티스토리 스킨 만들기</h2>
      <p class="small dim" style="margin:0 0 16px">
        어떤 블로그인지 답하면 4안을 만들어 줍니다. 고른 뒤 대화로 고쳐서 내려받습니다.
      </p>

      <div id="shots" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px"></div>
      <p class="tiny dim" style="margin:0 0 20px">답에 맞춰 매번 다른 4안이 나옵니다</p>

      <div class="panel">
        <div class="panel-head">키 등록</div>
        <div class="panel-body">

          <div class="field">
            <div class="field-label">제공자</div>
            <div class="opts" id="providers"></div>
          </div>

          <div class="field">
            <div class="field-label">API 키</div>

            <div class="row" id="key-edit">
              <input type="password" class="mono" id="key" style="flex:1 1 200px;min-width:0" autocomplete="off" spellcheck="false">
              <button id="key-show" type="button">보기</button>
              <button id="check">확인</button>
              <span class="busy" id="check-busy" hidden>확인 중</span>
            </div>

            <div class="card" id="key-locked" hidden>
              <div class="row">
                <span class="badge on" id="lock-badge"></span>
                <span class="mono small" id="lock-key"></span>
                <span class="spacer"></span>
                <button class="sm" id="recheck">다시 확인</button>
                <button class="sm" id="replace">교체</button>
                <button class="sm danger" id="forget">지우기</button>
              </div>
              <div class="field-note" id="lock-note"></div>
            </div>

            <div class="field-note" id="key-hint"></div>
          </div>

          <div id="error" hidden style="margin-bottom:16px"></div>

          <div class="field" id="model-field">
            <div class="field-label">모델</div>

            <div class="small dim" id="model-off"></div>

            <div id="model-on" hidden>
              <div class="tiny dim" style="margin-bottom:6px">추천</div>
              <div id="rec"></div>
              <div class="row" style="margin-top:12px">
                <button class="sm" id="pick-list">받아온 목록에서 고르기</button>
                <button class="sm" id="pick-custom">직접 입력</button>
              </div>
              <div class="row" style="margin-top:8px">
                <select id="all" style="max-width:100%"></select>
                <input type="text" class="mono" id="custom" hidden style="flex:1 1 200px;min-width:0" placeholder="모델 ID">
              </div>
              <div class="field-note" id="model-note"></div>
            </div>
          </div>

          <div class="field">
            <div class="row">
              <button class="sm" id="remember">off</button>
              <span class="small">이 브라우저에 키 저장</span>
            </div>
            <div class="field-note">꺼 두면 새로고침할 때 다시 넣어야 합니다. 공용 기기라면 꺼 두세요.</div>
          </div>

          <div class="card dashed">
            <ul class="list">
              <li>이 페이지에는 서버가 없습니다. 키는 브라우저를 벗어나 고른 제공자로만 갑니다.</li>
              <li>만든 스킨은 파일로 내려받습니다. 어디에도 올라가지 않습니다.</li>
              <li>요금은 사용자 계정에서 결제됩니다.</li>
            </ul>
          </div>

        </div>
        <div class="panel-foot row">
          <span class="tiny dim" id="foot-note"></span>
          <span class="spacer"></span>
          <button class="primary" id="start" disabled>시작</button>
        </div>
      </div>
    </div>`;

  const $ = (id) => root.querySelector('#' + id);

  $('shots').innerHTML = SHOWCASE.map((d) => schematic(detailsToPreset(d), { width: 108 })).join('');

  // 제공자 버튼. 바꾸면 setProvider 가 확인 상태를 푼다
  for (const p of Object.values(PROVIDERS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'opt';
    b.dataset.provider = p.id;
    b.textContent = p.label;
    b.addEventListener('click', () => {
      if (actions.getState().provider === p.id) return;
      attempt++;
      checking = false;
      failure = null;
      unlocked = true; // 다른 제공자의 키를 그대로 등록된 것처럼 보여주면 안 된다
      custom = false;
      switched = true;
      actions.setProvider(p.id);
    });
    $('providers').append(b);
  }

  // 타이핑은 확인 상태를 푼다. state 에 바로 넣어 두면 새로고침 없이 다른 화면과 값이 어긋나지 않는다
  $('key').addEventListener('input', () => {
    failure = null;
    actions.setApiKey($('key').value);
  });
  $('key').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runCheck();
  });

  $('check').addEventListener('click', () => runCheck());
  $('recheck').addEventListener('click', () => runCheck());

  // 타이핑 중 어깨너머 노출을 막으려고 기본은 password 다. 오타 확인이 필요할 때만 잠깐 연다
  $('key-show').addEventListener('click', () => {
    const input = $('key');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    $('key-show').textContent = show ? '가리기' : '보기';
  });

  $('replace').addEventListener('click', () => {
    unlocked = true;
    failure = null;
    actions.setApiKey('');
    $('key').focus();
  });

  $('forget').addEventListener('click', () => {
    unlocked = true;
    failure = null;
    actions.forgetEverything();
    toast('저장된 키를 지웠습니다');
  });

  $('remember').addEventListener('click', () => {
    actions.setRememberKey(!actions.getState().rememberKey);
  });

  $('pick-list').addEventListener('click', () => {
    custom = false;
    draw();
  });
  $('pick-custom').addEventListener('click', () => {
    custom = true;
    draw();
    $('custom').focus();
  });

  $('all').addEventListener('change', () => actions.setModel($('all').value));
  $('custom').addEventListener('change', () => actions.setModel($('custom').value.trim()));

  $('start').addEventListener('click', () => actions.go('P1'));

  /**
   * 키 확인.
   *
   * 형식 검사를 먼저 통과시켜 네트워크를 타지 않는다. 형식이 틀린 키로 부르면
   * 기다림만 늘고 얻는 것이 없다.
   */
  async function runCheck() {
    // 확인이 진행 중일 때 재클릭이나 Enter 연타가 들어오면 listModels 가 병렬로 나간다.
    // 늦게 온 응답이 attempt 검사로 버려지긴 하지만 요청 자체가 낭비라 입구에서 막는다
    if (checking) return;

    const state = actions.getState();
    const key = (locked(state) ? state.apiKey : $('key').value).trim();

    const formatError = validateKeyFormat(state.provider, key);
    if (formatError) {
      failure = { kind: 'format', message: formatError };
      checking = false;
      draw();
      return;
    }

    const mine = ++attempt;
    checking = true;
    failure = null;
    draw();

    const res = await listModels(state.provider, key);

    // 기다리는 동안 제공자를 바꿨으면 이 응답은 다른 제공자의 것이다
    if (mine !== attempt) return;

    checking = false;

    if (!res.ok) {
      failure = res.error;
      draw();
      return;
    }

    failure = null;
    unlocked = false;
    switched = false;
    actions.setKeyChecked(res.models, preferredModel(state.provider, res.models, state.model));
    draw();
  }

  /** 등록 카드로 보여줄 상태인지. 키 원문은 이 상태에서 다시 보여주지 않는다. */
  function locked(state) {
    if (unlocked || !state.apiKey) return false;
    return state.keyChecked || storedAtMount;
  }

  function draw() {
    const state = actions.getState();
    const provider = PROVIDERS[state.provider];
    const isLocked = locked(state);

    for (const b of root.querySelectorAll('#providers button')) {
      b.classList.toggle('on', b.dataset.provider === state.provider);
    }

    drawKey(state, provider, isLocked);
    drawError(state, provider);
    drawModel(state);

    $('remember').textContent = state.rememberKey ? 'on' : 'off';
    $('remember').classList.toggle('on', state.rememberKey);

    $('start').disabled = !state.keyChecked || !state.model;
    $('foot-note').textContent = state.keyChecked
      ? ''
      : '키를 확인해야 시작할 수 있습니다';
  }

  function drawKey(state, provider, isLocked) {
    $('key-edit').hidden = isLocked;
    $('key-locked').hidden = !isLocked;

    if (isLocked) {
      $('lock-badge').textContent = state.keyChecked ? '확인됨' : provider.label;
      $('lock-key').textContent = maskKey(provider, state.apiKey);
      $('lock-note').textContent = checking
        ? '모델 목록을 받아오는 중입니다'
        : [
            state.rememberKey ? '이 브라우저에 저장됨' : '이 탭에서만 유지됨',
            state.keyChecked ? `모델 ${state.model || '없음'}` : '아직 확인하지 않았습니다',
          ].join(' · ');
      for (const id of ['recheck', 'replace', 'forget']) $(id).disabled = checking;
      $('key-hint').textContent = '';
      return;
    }

    const input = $('key');
    input.placeholder = provider.keyPlaceholder;
    // 사용자가 치는 중에 값을 덮어쓰면 커서가 튄다. 밖에서 비운 경우만 맞춘다
    if (document.activeElement !== input && input.value !== state.apiKey) {
      input.value = state.apiKey;
    }
    input.classList.toggle('bad', !!failure && failure.kind !== 'network');

    $('check').hidden = checking;
    $('check-busy').hidden = !checking;
    $('check').textContent = failure ? '다시 확인' : '확인';

    const hint = $('key-hint');
    hint.textContent = '';
    if (checking) {
      hint.textContent = '모델 목록을 받아오는 중입니다';
      return;
    }
    const a = document.createElement('a');
    a.href = provider.consoleUrl;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = `${provider.consoleLabel} 에서 발급`;
    hint.append(a, ' · 확인은 모델 목록을 받아오는 것이라 토큰이 들지 않습니다');
  }

  function drawError(state, provider) {
    const box = $('error');
    box.hidden = !failure;
    if (!failure) return;

    const shape = ERRORS[failure.kind] || ERRORS.api;
    const body =
      shape.body ||
      (failure.kind === 'format'
        ? `${provider.label} 키는 ${provider.keyPrefix}... 로 시작합니다. 다른 제공자의 키를 넣은 것은 아닌지 확인하세요.`
        : failure.message);

    box.innerHTML =
      `<div class="note bad">` +
      `<h3>${esc(shape.title)}</h3>` +
      `<p>${esc(body)}</p>` +
      (shape.body && failure.message && failure.kind !== 'invalid_key' && failure.kind !== 'network'
        ? `<p class="small dim">${esc(failure.message)}</p>`
        : '') +
      `<p class="tiny dim">${esc(shape.tail)}</p>` +
      `</div>`;
  }

  function drawModel(state) {
    const off = $('model-off');
    const on = $('model-on');

    off.hidden = state.keyChecked;
    on.hidden = !state.keyChecked;
    $('model-field').style.opacity = state.keyChecked ? '' : '0.45';

    if (!state.keyChecked) {
      off.textContent = switched
        ? '제공자를 바꿔 다시 확인해야 합니다'
        : '키를 확인하면 쓸 수 있는 모델이 나옵니다';
      return;
    }

    drawRecommended(state);
    drawAllModels(state);

    const known = recommendedFor(state).some((r) => r.id === state.model);
    $('model-note').textContent = known
      ? ''
      : '추천 밖 모델은 단가를 몰라 비용을 표시하지 못합니다';
  }

  /**
   * 추천 모델 카드.
   *
   * 받아온 목록에 없는 추천은 감춘다. 코드에 박아 둔 추천은 언젠가 낡는데,
   * 없어진 모델을 계속 권하는 것이 그중 가장 나쁜 결과다. 하나도 안 남으면
   * 아래 전체 목록만으로 고르게 둔다.
   */
  function drawRecommended(state) {
    const recs = recommendedFor(state);
    const box = $('rec');
    box.textContent = '';

    if (!recs.length) {
      const p = document.createElement('div');
      p.className = 'small dim';
      p.textContent = '이 제공자에는 정리해 둔 추천이 없습니다. 아래 목록에서 고르세요.';
      box.append(p);
      return;
    }

    for (const r of recs) {
      const card = document.createElement('div');
      card.className = 'card' + (state.model === r.id ? ' selected' : '');
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => {
        custom = false;
        actions.setModel(r.id);
      });

      const head = document.createElement('div');
      head.className = 'row';
      const name = document.createElement('span');
      name.style.fontWeight = '600';
      name.textContent = r.label;
      const gap = document.createElement('span');
      gap.className = 'spacer';
      const price = document.createElement('span');
      price.className = 'tiny dim';
      price.textContent = unitPrice(r);
      head.append(name, gap, price);

      const note = document.createElement('div');
      note.className = 'tiny dim';
      note.style.marginTop = '4px';
      note.textContent = [r.note, runCost(state.provider, r.id)].filter(Boolean).join(' · ');

      card.append(head, note);
      box.append(card);
    }
  }

  /** 받아온 전체 목록과 직접 입력. 목록이 바뀔 때만 다시 채운다. */
  function drawAllModels(state) {
    const sel = $('all');
    const box = $('custom');

    sel.hidden = custom;
    box.hidden = !custom;
    $('pick-list').classList.toggle('on', !custom);
    $('pick-custom').classList.toggle('on', custom);

    const signature = state.models.map((m) => m.id).join(',');
    if (sel.dataset.signature !== signature) {
      sel.dataset.signature = signature;
      sel.textContent = '';
      for (const m of state.models) {
        const o = document.createElement('option');
        o.value = m.id;
        o.textContent = m.label === m.id ? m.id : `${m.label} (${m.id})`;
        sel.append(o);
      }
    }
    if (!custom && sel.value !== state.model) sel.value = state.model;
    if (custom && document.activeElement !== box && box.value !== state.model) box.value = state.model;
  }

  /** 받아온 목록에 실제로 있는 추천만. */
  function recommendedFor(state) {
    const have = new Set(state.models.map((m) => m.id));
    return (RECOMMENDED[state.provider] || []).filter((r) => have.has(r.id));
  }

  return {
    update() {
      draw();
    },
  };
}

/* ------------------------------------------------------------ 표시용 */

/** 뒤 4자리만. 등록된 키의 원문은 화면에 다시 올리지 않는다. */
function maskKey(provider, key) {
  const k = String(key || '');
  return `${provider.keyPrefix} ... ${k.slice(-4)}`;
}

function unitPrice(rec) {
  if (!rec.price) return '단가 모름';
  return `100만 토큰당 입력 $${rec.price.input} · 출력 $${rec.price.output}`;
}

/** 자릿수를 보여주는 용도의 예상 비용. 실제 사용량은 답변 길이에 따라 달라진다. */
function runCost(providerId, modelId) {
  const four = estimateCost(providerId, modelId, EST.concepts);
  const turn = estimateCost(providerId, modelId, EST.turn);
  if (four == null || turn == null) return '';
  return `4안 약 ${money(four)} · 대화 1회 약 ${money(turn)}`;
}

function money(v) {
  return '$' + (v < 0.01 ? v.toFixed(4) : v.toFixed(2));
}

/** 이미 고른 모델이 살아 있으면 유지하고, 아니면 추천 중 첫 번째를 고른다. */
function preferredModel(providerId, models, current) {
  const have = new Set(models.map((m) => m.id));
  if (current && have.has(current)) return current;
  const rec = (RECOMMENDED[providerId] || []).find((r) => have.has(r.id));
  return rec?.id || models[0]?.id || '';
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
