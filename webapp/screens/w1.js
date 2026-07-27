/**
 * W1 작업 화면
 *
 * 지시하고, 결과를 확인하고, 더 고칠지 받아갈지 정한다. 모델을 부르는 두 곳 중 하나다.
 *
 * 이 화면이 지키는 것 세 가지.
 *   - 실패해도 직전 결과를 지우지 않는다. 되돌아갈 자리가 없으면 마음 놓고 시킬 수 없다
 *   - 검증에 걸려도 자동으로 다시 시키지 않는다. 재시도 한 번이 사용자 지갑에서 나간다
 *   - 무엇이 바뀌었는지 응답에 목록으로 붙인다. 미리보기만 보고 짐작하게 두지 않는다
 *
 * 세부 값을 고치는 경로는 여기서 대화 하나뿐이다. P2 처럼 항목 패널을 같이 두면
 * 경로가 둘이 되어 어느 쪽이 최신인지 알 수 없게 된다.
 */

import { detailsToPreset, validateDetails } from '../harness/spec.js';
import { buildEditPrompt } from '../harness/system-prompt.js';
import { auditPlaceholders, auditGroupTags } from '../harness/contract.js';
import { checkPitfalls } from '../harness/pitfalls.js';
import { buildSkinHtml, buildIndexXml } from '../presets/base/skeleton.js';
import { renderPreview, PREVIEW_PAGES } from '../loop/render.js';
import { PREVIEW_EXTRA_CSS } from '../loop/mock-data.js';
import { createStructured, estimateCost } from '../providers.js';

/** 코드 열람 탭. 키는 파일 묶음의 이름이고 라벨만 짧게 줄인다. */
const CODE_TABS = [
  { key: 'skin.html', label: 'skin.html' },
  { key: 'style.css', label: 'style.css' },
  { key: 'images/script.js', label: 'script.js' },
  { key: 'index.xml', label: 'index.xml' },
];

/** 대화와 미리보기를 한 줄에 못 놓는 폭. shell.css 의 .split 브레이크포인트와 같아야 한다. */
const NARROW = '(max-width: 899px)';

export function mount(root, ctx) {
  const { actions, shared, toast } = ctx;

  // 화면 안에서만 쓰는 표시 상태. 상태 저장소에 넣지 않는다. 새로고침하면 사라져도 되는 것들이다
  let pageType = 'tt-body-index';
  let mobileFrame = false;
  let zoomed = false;
  let codeOpen = false;
  let codeTab = 'skin.html';
  let narrowTab = 'chat';

  // 검증에 걸린 뒤 "그냥 두기" 를 고른 것. 기록은 남기되 버튼만 접는다.
  // 순번이 아니라 항목 자체를 기억한다. 되돌리기가 대화를 자르면 순번은 다른 것을 가리킨다
  const dismissed = new WeakSet();

  // 중단을 누르면 이 번호가 올라간다. 늦게 도착한 응답은 자기 번호로 자기가 버려진 것을 안다
  let reqSeq = 0;

  let files = null;
  let audit = { ok: true, problems: [] };

  root.innerHTML = `
    <div class="page wide">
      <div class="row" style="margin-bottom:12px">
        <h2 style="font-size:16px">작업</h2>
        <span class="badge" id="concept-name"></span>
        <span class="badge" id="verdict"></span>
        <span class="spacer"></span>
        <span class="tiny dim mono" id="model-name"></span>
        <button class="sm" id="settings">설정</button>
        <button class="primary sm" id="download">내려받기</button>
      </div>

      <div class="row" id="narrow-tabs" hidden style="margin-bottom:8px">
        <button class="sm on" id="tab-chat">대화</button>
        <button class="sm" id="tab-view">미리보기</button>
      </div>

      <div class="split chat" id="split">
        <div class="panel" id="chat-pane">
          <div class="panel-head">대화</div>
          <div class="panel-body scroll" id="chat"></div>
          <div class="panel-foot">
            <textarea id="input" rows="2" placeholder="바꿀 내용을 적으세요. 엔터로 보냅니다"></textarea>
            <div class="row" style="margin-top:8px">
              <button class="primary sm" id="send">보내기</button>
              <span class="busy" id="busy" hidden>고치는 중</span>
              <button class="sm" id="stop" hidden>중단</button>
              <button class="sm ghost" id="reset">처음으로</button>
              <span class="spacer"></span>
              <span class="tiny dim" id="usage"></span>
            </div>
          </div>
        </div>

        <div class="panel" id="view-pane">
          <div class="panel-head">
            <span id="view-title">미리보기</span>
            <select id="page"></select>
            <span class="spacer"></span>
            <button class="sm" id="mobile">모바일</button>
            <button class="sm" id="zoom">확대</button>
            <button class="sm" id="code">코드</button>
          </div>
          <div class="panel-body">
            <iframe class="preview" id="preview" title="미리보기"></iframe>
            <div id="code-box" hidden>
              <div class="row" id="code-tabs"></div>
              <pre class="mono tiny" id="code-text" style="margin:8px 0 0;padding:10px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);overflow:auto;white-space:pre;max-height:calc(100vh - 340px)"></pre>
              <p class="tiny dim" style="margin:8px 0 0">읽기 전용입니다. 고칠 내용은 왼쪽 대화로 지시하세요.</p>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  const $ = (id) => root.querySelector('#' + id);

  /* ---------------------------------------------------------- 미리보기 */

  const sel = $('page');
  for (const p of PREVIEW_PAGES) {
    const o = document.createElement('option');
    o.value = p.id;
    o.textContent = p.label;
    sel.append(o);
  }
  sel.value = pageType;
  sel.addEventListener('change', () => {
    pageType = sel.value;
    drawView(actions.getState());
  });

  $('mobile').addEventListener('click', () => {
    mobileFrame = !mobileFrame;
    $('mobile').classList.toggle('on', mobileFrame);
    drawView(actions.getState());
  });

  // 확대는 이 레이아웃의 약점을 메우는 장치다. 미리보기가 절반뿐이라 판단이 어려운
  // 순간에만 대화를 접고 전폭으로 본다
  $('zoom').addEventListener('click', () => {
    zoomed = !zoomed;
    applyLayout();
    drawView(actions.getState());
  });

  $('code').addEventListener('click', () => {
    codeOpen = !codeOpen;
    drawView(actions.getState());
  });

  $('code-tabs').addEventListener('click', (e) => {
    const key = e.target.dataset?.tab;
    if (!key) return;
    codeTab = key;
    drawView(actions.getState());
  });

  /* ---------------------------------------------------------- 좁은 폭 */

  const narrow = window.matchMedia(NARROW);
  const onNarrow = () => {
    applyLayout();
    drawView(actions.getState());
  };
  narrow.addEventListener('change', onNarrow);

  $('tab-chat').addEventListener('click', () => {
    narrowTab = 'chat';
    applyLayout();
  });
  $('tab-view').addEventListener('click', () => {
    narrowTab = 'view';
    applyLayout();
    drawView(actions.getState());
  });

  /**
   * 어느 판을 보여줄지 정한다.
   * 좁은 폭에서는 둘을 나란히 놓을 자리가 없어 탭으로 갈라 놓는다.
   */
  function applyLayout() {
    const isNarrow = narrow.matches;
    $('narrow-tabs').hidden = isNarrow ? false : true;
    $('tab-chat').classList.toggle('on', narrowTab === 'chat');
    $('tab-view').classList.toggle('on', narrowTab === 'view');

    const showChat = zoomed ? false : isNarrow ? narrowTab === 'chat' : true;
    const showView = zoomed ? true : isNarrow ? narrowTab === 'view' : true;

    $('chat-pane').hidden = !showChat;
    $('view-pane').hidden = !showView;

    // 확대일 때 두 단 격자를 그대로 두면 미리보기가 좁은 첫 칸에 들어간다
    $('split').className = zoomed || isNarrow ? '' : 'split chat';
    $('zoom').textContent = zoomed ? '대화 열기' : '확대';
    $('zoom').classList.toggle('on', zoomed);
  }

  /* ---------------------------------------------------------- 보내기 */

  $('send').addEventListener('click', () => send($('input').value));
  $('input').addEventListener('keydown', (e) => {
    // 줄바꿈이 필요한 지시는 드물다. 엔터를 보내기로 쓰고 줄바꿈은 시프트에 둔다
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      send($('input').value);
    }
  });

  $('stop').addEventListener('click', () => {
    reqSeq++;
    actions.setBusy(false);
    actions.pushChat({
      role: 'note',
      kind: 'stopped',
      text: '중단했습니다. 이미 보낸 요청의 비용은 발생합니다.',
    });
  });

  // 작업 기록을 통째로 버리는 유일한 버튼이고 되돌릴 방법이 없다. 한 번 더 묻는다
  let resetArmed = false;
  const disarmReset = () => {
    resetArmed = false;
    $('reset').textContent = '처음으로';
  };
  $('reset').addEventListener('click', () => {
    if (!actions.getState().chat.length) return;
    if (!resetArmed) {
      resetArmed = true;
      $('reset').textContent = '정말 지울까요';
      setTimeout(disarmReset, 4000);
      return;
    }
    disarmReset();
    actions.clearChat();
  });

  $('settings').addEventListener('click', () => actions.go('E1'));

  $('download').addEventListener('click', () => {
    const state = actions.getState();
    if (!audit.ok) toast?.('검증에 걸린 채로 넘어갑니다. 그대로 올리면 깨질 수 있습니다.', 'bad');
    handOffFiles(state);
    actions.go('D1');
  });

  /**
   * 만든 파일 묶음을 D1 에게 넘긴다.
   *
   * D1 이 스스로 만들게 두지 않는다. 그러면 같은 조립 과정이 두 곳에 생겨
   * 어느 쪽이 진짜인지 헷갈린다. 만든 곳이 넘긴다.
   */
  function handOffFiles(state) {
    actions.setFiles(makeFiles(state.details, state));
  }

  /**
   * 지시 한 번을 처리한다.
   *
   * 검증을 통과한 것만 세부 값에 반영한다. 하나라도 걸리면 직전 결과를 그대로 두고
   * 무엇이 왜 막혔는지만 대화에 남긴다.
   */
  async function send(raw) {
    const message = String(raw || '').trim();
    const state = actions.getState();
    if (!message || state.busy) return;

    $('input').value = '';
    // 최근 대화는 이번 지시를 넣기 전에 뽑는다. 넣고 뽑으면 방금 것이 두 번 들어간다
    const recentTurns = conversationTurns(state.chat);
    actions.pushChat({ role: 'user', text: message });
    await run(message, recentTurns);
  }

  /** 같은 지시를 다시 보낸다. 검증에 걸렸을 때 사용자가 직접 고른 경우에만 부른다. */
  async function retry(message) {
    const state = actions.getState();
    if (state.busy) return;
    actions.pushChat({ role: 'user', text: message });
    await run(message, conversationTurns(state.chat));
  }

  async function run(message, recentTurns) {
    const state = actions.getState();
    const before = state.details;
    const my = ++reqSeq;

    actions.setBusy(true);

    // 최근 대화를 몇 개까지 보낼지는 buildEditPrompt 가 정한다. 여기서 자르면
    // 기준이 두 곳에 생겨 반드시 어긋난다
    const prompt = buildEditPrompt({
      currentDetails: before,
      recentTurns,
      userMessage: message,
    });

    const res = await createStructured(state.provider, state.apiKey, {
      model: state.model,
      system: prompt.system,
      messages: prompt.messages,
      schema: prompt.schema,
      effort: prompt.effort,
    });

    // 비용은 중단해도 이미 나갔다. 버릴 응답이어도 사용량은 반드시 더한다
    if (res.ok) {
      actions.addUsage(res.usage, estimateCost(state.provider, state.model, res.usage));
    }
    if (my !== reqSeq) return;

    actions.setBusy(false);

    if (!res.ok) {
      actions.pushChat({
        role: 'note',
        kind: 'failed',
        title: '모델을 부르지 못했습니다',
        text: res.error.message,
        problems: [],
        ask: message,
      });
      return;
    }

    const data = res.data || {};
    const changes = Array.isArray(data.changes) ? data.changes.filter(Boolean) : [];
    const reply = String(data.reply || '').trim();

    // 모델이 못 하겠다고 한 경우. 검증 실패와 원인이 다르므로 모양도 다르게 남긴다
    if (!changes.length) {
      actions.pushChat({
        role: 'assistant',
        refused: true,
        text: reply || '바꿀 수 있는 항목이 없습니다.',
      });
      return;
    }

    const problems = verify(data.details);
    if (problems.length) {
      actions.pushChat({
        role: 'note',
        kind: 'failed',
        title: '적용하지 않았습니다',
        text: reply,
        problems,
        ask: message,
      });
      return;
    }

    // 되돌리기가 동작하려면 그 시점의 세부 값이 대화에 같이 들어 있어야 한다
    actions.setDetails(data.details);
    actions.pushChat({
      role: 'assistant',
      text: reply,
      changes,
      details: data.details,
    });
  }

  /**
   * 모델이 낸 세부 값을 실제 산출물까지 만들어 보고 확인한다.
   *
   * 값 범위만 보고 넘기면 골격이 만들어 낸 마크업이 계약을 어긴 경우를 놓친다.
   * 검사 순서는 값 -> 치환자 -> 그룹 태그 -> 함정이다. 앞이 깨지면 뒤는 볼 필요가 없다.
   */
  function verify(details, prebuilt) {
    const bad = validateDetails(details);
    if (bad.length) return bad;

    const made = prebuilt || makeFiles(details, actions.getState());
    const ph = auditPlaceholders(made['skin.html']);
    const gt = auditGroupTags(made['skin.html']);

    const out = [
      ...ph.unknown.map((n) => `없는 치환자를 썼습니다: [##_${n}_##]`),
      ...ph.blacklisted.map((b) => `[##_${b.name}_##] 는 존재하지 않습니다. ${b.why}`),
      ...ph.scopeErrors.map((e) => e.message),
      ...gt.unknown.map((t) => `없는 그룹 태그를 썼습니다: <${t}>`),
      ...gt.unbalanced.map((u) => `<${u.tag}> 의 여는 태그와 닫는 태그 수가 다릅니다`),
      ...gt.parentErrors.map((e) => e.message),
    ];
    if (out.length) return out;

    return checkPitfalls(made)
      .filter((p) => p.severity !== 'info')
      .map((p) => `${p.title}: ${p.message}`);
  }

  /* ---------------------------------------------------------- 그리기 */

  /** 산출물 네 개. 미리보기, 코드 열람, 검증이 전부 같은 묶음을 본다. */
  function makeFiles(details, state) {
    const name = state.concepts[state.conceptIndex]?.name || '내 스킨';
    const preset = detailsToPreset(details, { name });
    return {
      'skin.html': buildSkinHtml(preset),
      'style.css': shared.css,
      'images/script.js': shared.js,
      'index.xml': buildIndexXml(preset, { name }),
    };
  }

  function drawView(state) {
    files = makeFiles(state.details, state);

    const problems = verify(state.details, files);
    audit = { ok: problems.length === 0, problems };

    const v = $('verdict');
    v.textContent = audit.ok ? '검증 통과' : '검증 실패';
    v.classList.toggle('on', audit.ok);

    $('view-title').textContent = codeOpen ? '코드' : '미리보기';
    $('page').hidden = codeOpen;
    $('mobile').hidden = codeOpen;
    $('code').textContent = codeOpen ? '미리보기' : '코드';
    $('code').classList.toggle('on', codeOpen);

    const frame = $('preview');
    frame.hidden = codeOpen;
    $('code-box').hidden = !codeOpen;

    if (codeOpen) {
      $('code-tabs').innerHTML = CODE_TABS.map(
        (t) => `<button class="sm${t.key === codeTab ? ' on' : ''}" data-tab="${t.key}">${t.label}</button>`,
      ).join('');
      $('code-text').textContent = files[codeTab] || '';
      return;
    }

    frame.srcdoc = renderPreview(files['skin.html'], {
      pageType,
      css: shared.css,
      js: shared.js,
      extraCss: PREVIEW_EXTRA_CSS,
    });
    frame.classList.toggle('mobile', mobileFrame);
    frame.style.height = zoomed ? 'calc(100vh - 190px)' : 'calc(100vh - 280px)';
  }

  /** 대화를 통째로 다시 그린다. 입력칸은 이 안에 없어서 포커스가 날아가지 않는다. */
  function drawChat(state) {
    const name = state.concepts[state.conceptIndex]?.name || '지금 값';
    const intro =
      `<div class="msg sys"><div class="msg-body">${esc(name)} 으로 시작합니다. ` +
      `바꾸고 싶은 것을 말해 주세요.</div></div>`;

    $('chat').innerHTML = intro + state.chat.map(entryHtml).join('');
    // 새 응답은 아래에 쌓인다. 사용자가 매번 굴려 내리게 두지 않는다
    $('chat').scrollTop = $('chat').scrollHeight;
  }

  function entryHtml(e, i) {
    if (e.role === 'user') {
      return `<div class="msg user"><div class="msg-role">나</div><div class="msg-body">${esc(e.text)}</div></div>`;
    }

    if (e.role === 'assistant' && e.refused) {
      // 모델이 거절한 것. 값은 멀쩡했고 요청이 범위 밖이었다는 뜻이라 실패와 갈라 놓는다
      return (
        `<div class="msg"><div class="msg-role">응답</div><div class="msg-body">` +
        `<span class="badge">바꾸지 않음</span> ${esc(e.text)}</div></div>`
      );
    }

    if (e.role === 'assistant') {
      const list = (e.changes || []).map((c) => `<li>${esc(c)}</li>`).join('');
      return (
        `<div class="msg"><div class="msg-role">응답</div><div class="msg-body">` +
        `${esc(e.text)}` +
        (list ? `<ul class="list">${list}</ul>` : '') +
        `<div style="margin-top:8px"><button class="sm" data-rewind="${i}">이 지점으로 되돌리기</button></div>` +
        `</div></div>`
      );
    }

    if (e.kind === 'failed') {
      const done = dismissed.has(e);
      const list = (e.problems || []).map((p) => `<li>${esc(p)}</li>`).join('');
      return (
        `<div class="msg sys"><div class="msg-body">` +
        `<div style="color:var(--danger);font-weight:600">${esc(e.title || '적용하지 않았습니다')}</div>` +
        (e.text ? `<p>${esc(e.text)}</p>` : '') +
        (list ? `<ul class="list">${list}</ul>` : '') +
        `<p class="tiny">직전 결과가 그대로 유지됩니다.</p>` +
        (done
          ? `<p class="tiny">그냥 두기를 골랐습니다.</p>`
          : `<div class="row" style="margin-top:8px">` +
            `<button class="sm" data-retry="${i}">다시 시키기</button>` +
            `<button class="sm ghost" data-keep="${i}">그냥 두기</button>` +
            `</div>`) +
        `</div></div>`
      );
    }

    return `<div class="msg sys"><div class="msg-body">${esc(e.text)}</div></div>`;
  }

  // 대화는 통째로 다시 그려지므로 버튼마다 리스너를 달면 매번 새로 달아야 한다
  $('chat').addEventListener('click', (e) => {
    const t = e.target;
    if (t.dataset?.rewind !== undefined) {
      actions.rewindTo(Number(t.dataset.rewind));
      return;
    }
    if (t.dataset?.keep !== undefined) {
      const entry = actions.getState().chat[Number(t.dataset.keep)];
      if (!entry) return;
      dismissed.add(entry);
      drawChat(actions.getState());
      return;
    }
    if (t.dataset?.retry !== undefined) {
      const entry = actions.getState().chat[Number(t.dataset.retry)];
      if (entry?.ask) retry(entry.ask);
    }
  });

  function drawUsage(state) {
    const u = state.usage;
    if (!u.calls) {
      $('usage').textContent = '아직 부르지 않았습니다';
      return;
    }
    const cost = u.cost > 0 ? ` · 약 $${u.cost.toFixed(4)}` : ' · 단가를 모르는 모델';
    $('usage').textContent = `${u.calls}회 · 입력 ${u.input.toLocaleString()} · 출력 ${u.output.toLocaleString()}${cost}`;
  }

  /* ---------------------------------------------------------- 갱신 */

  let lastDetails = null;
  let lastChat = null;
  let lastError = null;

  applyLayout();

  return {
    unmount() {
      narrow.removeEventListener('change', onNarrow);
    },

    update(state) {
      // 앞 단계를 건너뛰고 들어온 경우. 돌려보낸다
      if (!state.keyChecked) {
        actions.go('E1');
        return;
      }
      if (!state.conceptDetails) {
        actions.go('P1');
        return;
      }

      $('concept-name').textContent = state.concepts[state.conceptIndex]?.name || '';
      $('model-name').textContent = state.model || '';

      $('busy').hidden = !state.busy;
      $('stop').hidden = !state.busy;
      $('input').disabled = state.busy;
      $('send').disabled = state.busy;
      $('reset').disabled = state.busy || !state.chat.length;
      // 생성 중에도 직전 결과는 받아갈 수 있다. 다만 눈에 덜 띄게 둔다
      $('download').classList.toggle('primary', !state.busy);

      drawUsage(state);

      if (state.chat !== lastChat) {
        lastChat = state.chat;
        drawChat(state);
      }

      // 미리보기는 값이 바뀔 때만 다시 그린다. 생성 중에 비우면 무엇을 만들던
      // 중이었는지 잃는다
      if (state.details !== lastDetails) {
        lastDetails = state.details;
        drawView(state);
      }

      if (state.error && state.error !== lastError) {
        lastError = state.error;
        toast?.(String(state.error), 'bad');
      }
    },
  };
}

/**
 * 모델에게 보낼 대화 턴을 고른다.
 *
 * 안내와 실패 기록은 지시가 아니라서 뺀다. 응답을 못 받은 지시도 뺀다. 그것이 남으면
 * 사용자 발화가 연달아 붙어 어느 것이 이번 지시인지 흐려진다.
 */
function conversationTurns(chat) {
  const out = [];
  for (const e of chat) {
    if (e.role !== 'user' && e.role !== 'assistant') continue;
    if (e.role === 'user' && out[out.length - 1]?.role === 'user') out.pop();
    out.push({ role: e.role, content: e.text });
  }
  if (out[out.length - 1]?.role === 'user') out.pop();
  return out;
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
