/**
 * E1 진입 / 키 등록
 *
 * 키 확인은 모델 목록 조회로 한다. 토큰이 들지 않으므로 키가 살아 있는지와
 * 쓸 수 있는 모델을 한 번에 얻는다. 확인 전에는 모델도 시작 버튼도 잠근다 -
 * 잘못된 키로 P1 까지 갔다가 되돌아오는 낭비를 없애는 것이 이 화면의 목적이다.
 *
 *
 * 왜 폼이 아니라 대화인가
 *
 * 처음에는 말풍선 안에 입력 폼을 통째로 넣었다. 그러면 대화의 모양만 쓴 폼이고,
 * 사용자가 처음 만나는 화면이 여전히 "칸을 채우는 일"이 된다. 지금은 키를
 * **아래 입력줄에 붙여넣어 보내는 것**으로 받는다. 이 도구에서 사용자가 하게 될
 * 행동(치고 보내기)을 첫 화면에서 그대로 한 번 해 보는 셈이다.
 *
 * 그래서 이 화면에는 폼이 없다. 고르는 것(제공자, 모델)은 말풍선 안의 버튼이고,
 * 값을 넣는 것은 입력줄 하나뿐이다.
 *
 *
 * 오른쪽에는 키 받는 방법을 처음부터 띄워 둔다
 *
 * 키가 없는 사람이 여기서 막히는 지점은 하나다 - 키를 어떻게 받는지 모른다.
 * 그 답을 누르지 않아도 보이게 둔다. 절차는 남의 화면이라 언제든 바뀌므로
 * 짧게만 적고 발급 링크를 크게 함께 둔다. 글이 틀려도 링크는 맞다.
 *
 *
 * 자리 배치
 *   왼쪽 대화   안내 - 제공자 고르기 - (키 붙여넣기) - 확인 결과와 모델 고르기
 *   chat-foot   키를 붙여넣는 입력줄, 저장 토글, 시작 버튼
 *   캔버스      키 받는 방법 - 흐름과 비용 - 나오는 것
 *
 * 화면 모듈 규약은 app/app.js 위쪽 주석에 있다.
 */

import { PROVIDERS, RECOMMENDED, chatModels, validateKeyFormat, listModels, estimateCost } from '../providers.js';
import { detailsToPreset } from '../harness/spec.js';
import { schematic } from '../ui/schematic.js';

/**
 * 캔버스 아래쪽에 거는 결과물 도식 네 개.
 *
 * "답에 맞춰 매번 다른 4안이 나옵니다" 를 말이 아니라 그림으로 보여주는 자리다.
 * 넷이 눈에 띄게 달라야 뜻이 전달되므로 사이드바 위치, 목록 모양, 배경을 전부 다르게 잡았다.
 */
const SHOWCASE = [
  {
    caption: '표준',
    note: '사이드바와 목록',
    details: { sidebar: 'left', listStyle: 'standard', listItems: ['thumbnail', 'summary'], background: 'light', accent: '#2f6f4f' },
  },
  {
    caption: '읽기 중심',
    note: '사이드바 없음',
    details: { sidebar: 'none', listStyle: 'plain', listItems: ['summary'], background: 'light', accent: '#a3352a', features: ['toc'] },
  },
  {
    caption: '그리드',
    note: '이미지 앞세움',
    details: { sidebar: 'none', listStyle: 'grid', listItems: ['thumbnail'], background: 'light', accent: '#2f4f8f' },
  },
  {
    caption: '작업 로그',
    note: '날짜와 제목만',
    details: { sidebar: 'right', listStyle: 'dense', listItems: [], background: 'dark', accent: '#c08a2e' },
  },
];

/** 다섯 단계가 각각 얼마를 쓰는지. 키를 넣기 전에 전체 비용 구조를 먼저 보여준다. */
const FLOW = [
  { what: '키 등록', cost: '무료' },
  { what: '컨셉 4안', cost: '호출 1회' },
  { what: '세부 정하기', cost: '무료' },
  { what: '대화로 작업', cost: '지시마다' },
  { what: 'ZIP 내려받기', cost: '무료' },
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
  const { actions, toast, panes } = ctx;

  let checking = false;
  let failure = null; // { kind, message }
  let custom = false; // 모델을 직접 입력하는 중
  let attempt = 0; // 확인 중에 제공자를 바꾸면 늦게 온 응답을 버린다

  // 저장해 둔 키로 들어왔는지. 그러면 입력칸 대신 "확인할까요" 를 낸다.
  // 원문을 다시 화면에 올리지 않으려는 것이다
  let stored = !!(actions.getState().rememberKey && actions.getState().apiKey);

  /* ------------------------------------------------------- 대화 아래 발판 */

  /*
   * 입력줄은 대화용이지 키를 받는 자리가 아니다.
   *
   * 이 자리는 W1 에서 **모델에게 전송되는 통로**다. E1 에서 여기에 키를 넣게
   * 가르치면 나중에 W1 에서 같은 자리에 키를 붙여넣는 손버릇이 생기고, 그러면
   * 사용자 손으로 키가 밖에 나간다. 그래서 키는 말풍선 안 전용 칸에서 받고,
   * 이 입력줄은 키가 확인되기 전까지 잠가 둔다.
   *
   * 잠금이 풀린 뒤에 여기 적는 답은 P1 의 첫 질문(용도)에 그대로 들어간다.
   * 활성화만 해 놓고 아무 일도 안 하면 안내 문구가 거짓말이 된다.
   */
  panes.foot.innerHTML = `
    <div class="composer">
      <input type="text" id="composer" placeholder="어떤 용도의 블로그를 만들려고 하시나요?" disabled>
      <div class="row">
        <button class="sm switch" id="remember">off</button>
        <span class="tiny dim">이 브라우저에 저장</span>
        <span class="spacer"></span>
        <span class="tiny dim" id="foot-note"></span>
        <button class="primary" id="start" disabled>시작</button>
      </div>
    </div>`;

  const foot = (id) => panes.foot.querySelector('#' + id);

  foot('composer').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      submitPurpose();
    }
  });

  foot('remember').addEventListener('click', () => {
    actions.setRememberKey(!actions.getState().rememberKey);
  });

  /*
   * 나가는 문.
   *
   * 처음 온 사람은 P1(컨셉 고르기)로 간다. 하지만 작업 중에 설정에서 "키 관리"를
   * 눌러 여기로 온 사람도 있다. 그 사람을 P1 으로 보내면 컨셉부터 다시 훑고
   * 내려와야 한다. 이미 시작점을 고른 적이 있으면 작업 화면으로 돌려보낸다.
   */
  function exitTo() {
    return actions.getState().conceptDetails ? 'W1' : 'P1';
  }

  foot('start').addEventListener('click', () => actions.go(exitTo()));

  /* ------------------------------------------------------------ 오른쪽 */

  panes.canvasBody.innerHTML = `
    <div id="howto"></div>

    <div class="eyebrow" style="margin:32px 0 12px">모델과 비용</div>
    <div id="price"></div>

    <div class="eyebrow" style="margin:32px 0 12px">흐름과 비용</div>
    <div class="flow">
      ${FLOW.map(
        (f, i) =>
          `<div${i === 0 ? ' class="now"' : ''}>` +
          `<div class="num">${i + 1}</div>` +
          `<div class="what">${f.what}</div>` +
          `<div class="cost">${f.cost}</div>` +
          '</div>',
      ).join('')}
    </div>

    <div class="eyebrow" style="margin:32px 0 12px">나오는 것</div>
    <div class="grid-4">
      ${SHOWCASE.map(
        (c) =>
          '<div>' +
          schematic(detailsToPreset(c.details)) +
          `<div class="shot-caption"><b>${c.caption}</b> ${c.note}</div>` +
          '</div>',
      ).join('')}
    </div>
    <p class="tiny dim" style="margin-top:12px">답에 맞춰 매번 다른 4안이 나옵니다</p>`;

  /**
   * 모델 비용 표.
   *
   * 4안 한 번과 대화 한 번이 각각 얼마인지를 고르기 전에 보여 준다. 단가만 적으면
   * "100만 토큰당 $5" 가 이 도구에서 얼마인지 알 수 없다.
   *
   * 단가를 모르는 제공자는 표 대신 그 사실을 적는다. 지어낸 값을 넣으면 사용자가
   * 그 숫자를 보고 결제 규모를 판단하게 되는데, 틀리면 실제 청구서로 돌아온다.
   */
  function drawPrices(provider) {
    const recs = RECOMMENDED[provider.id] || [];
    const box = panes.canvasBody.querySelector('#price');

    if (!recs.length) {
      box.innerHTML = `
        <div class="card dashed">
          <span class="strong">${esc(provider.label)} 의 단가는 아직 정리해 두지 못했습니다.</span>
          <p class="small" style="margin:4px 0 0">키를 확인하면 쓸 수 있는 모델 목록이 나옵니다. 다만 이 도구가 단가를 모르므로 비용은 표시하지 못합니다. 요금은 ${esc(provider.label)} 콘솔에서 확인하세요.</p>
          <p class="tiny dim" style="margin:6px 0 0">모르는 값을 지어내 보여 주지 않는 것이 이 화면의 규칙입니다.</p>
        </div>`;
      return;
    }

    const row = (r) =>
      `<tr>` +
      `<td style="padding:6px 0"><span class="strong">${esc(r.label)}</span>` +
      `<div class="tiny dim">${esc(r.note || '')}</div></td>` +
      `<td class="mono tiny" style="text-align:right;white-space:nowrap">$${r.price.input} / $${r.price.output}</td>` +
      `<td class="mono tiny" style="text-align:right;white-space:nowrap">${money(estimateCost(provider.id, r.id, EST.concepts))}</td>` +
      `<td class="mono tiny" style="text-align:right;white-space:nowrap">${money(estimateCost(provider.id, r.id, EST.turn))}</td>` +
      `</tr>`;

    const section = (title, tier) => {
      const list = recs.filter((r) => r.tier === tier);
      if (!list.length) return '';
      return (
        `<tr><td colspan="4" class="eyebrow" style="padding:14px 0 2px">${title}</td></tr>` +
        list.map(row).join('')
      );
    };

    box.innerHTML = `
      <div class="panel">
        <div class="panel-body">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr class="tiny dim">
                <th style="text-align:left;font-weight:400">모델</th>
                <th style="text-align:right;font-weight:400">100만 토큰당 입력/출력</th>
                <th style="text-align:right;font-weight:400">4안 1회</th>
                <th style="text-align:right;font-weight:400">대화 1회</th>
              </tr>
            </thead>
            <tbody>
              ${section('최고 성능', 'top')}
              ${section('가성비', 'value')}
            </tbody>
          </table>
          <p class="tiny dim" style="margin:12px 0 0">
            오른쪽 두 칸은 이 도구에서 실제로 나가는 돈의 어림값입니다. 4안 1회는 컨셉을 만들 때
            한 번, 대화 1회는 작업 화면에서 지시할 때마다 듭니다. 답변 길이에 따라 달라집니다.
          </p>
        </div>
      </div>`;
  }

  /** 키 받는 방법. 고른 제공자에 맞춰 갈아 끼운다. */
  function drawHowto(provider) {
    panes.canvasBody.querySelector('#howto').innerHTML = `
      <div class="eyebrow" style="margin-bottom:12px;color:var(--accent)">${esc(provider.label)} 키 받는 방법</div>
      <div class="panel">
        <div class="panel-body">
          <ol class="list" style="padding-left:18px;list-style:decimal">
            ${(provider.keySteps || []).map((s) => `<li>${esc(s)}</li>`).join('')}
          </ol>
          <p class="small dim" style="margin:12px 0 0">${esc(provider.keyNote || '')}</p>
        </div>
        <div class="panel-foot row">
          <a href="${esc(provider.consoleUrl)}" target="_blank" rel="noopener">${esc(provider.consoleLabel)} 열기</a>
          <span class="spacer"></span>
          <span class="tiny dim">화면이 설명과 다르면 이 링크가 맞습니다</span>
        </div>
      </div>
      <p class="tiny dim" style="margin:8px 0 0">받은 키를 왼쪽 아래 입력줄에 붙여넣고 엔터를 누르세요. 확인은 모델 목록을 받아오는 것이라 토큰이 들지 않습니다.</p>`;
  }

  /* ------------------------------------------------------------ 대화 */

  /**
   * 대화를 통째로 다시 그린다.
   *
   * 기록을 쌓아 두지 않고 지금 상태에서 매번 만들어 낸다. 이 화면의 대화는
   * 실제 대화가 아니라 "지금 어디까지 왔는가"의 표현이라, 쌓아 두면 실패했다
   * 성공한 뒤에도 옛 오류 말풍선이 남아 무엇이 참인지 흐려진다.
   *
   * 입력줄은 발판에 따로 있어서 다시 그려도 포커스가 날아가지 않는다.
   */
  function drawChat() {
    const state = actions.getState();
    const provider = PROVIDERS[state.provider];
    const parts = [];

    parts.push(
      `<div class="msg sys"><div class="msg-body">` +
        `서버 없음 · 로그인 없음. 키는 이 브라우저를 벗어나 고른 제공자로만 갑니다.` +
        `</div></div>`,
    );

    /*
     * 키를 받는 칸은 이 안내 말풍선 안에 있다.
     *
     * 확인이 끝나면 통째로 사라진다. 키는 대화의 한 턴이 아니라 설정값이라
     * 기록으로 남길 이유가 없고, 마스킹했다 해도 스크롤을 올릴 때마다 나오는
     * 것이 좋을 게 없다. 확인된 뒤로 이 화면에 남는 것은 "무엇으로 만들 것인가"
     * 뿐이고, 키를 바꾸는 일은 설정(S1)이 맡는다.
     */
    /*
     * 키가 왜 필요한지를 먼저 말한다.
     *
     * 처음 온 사람에게 "API 키를 넣으세요" 는 갑작스러운 요구다. 이 도구에는
     * 서버가 없어서 사용자 키로 사용자가 직접 부르는 구조라는 것을, 칸을
     * 내밀기 전에 한 문단으로 설명한다.
     *
     * 강조한 낱말은 오른쪽 "키 받는 방법" 제목과 같은 색(--accent)을 쓴다.
     * 왼쪽에서 요구한 것의 답이 오른쪽에 있다는 것을 색으로 잇는 것이다.
     */
    const lead = state.keyChecked
      ? '쓸 키는 정해졌습니다.'
      /*
       * "따로 저장되지 않습니다" 라고는 못 쓴다.
       *
       * 입력줄 아래에 "이 브라우저에 저장" 토글이 있고, 켜면 실제로
       * localStorage 에 들어간다. 기본값이 off 라 대개는 맞는 말이지만,
       * 사용자가 켜는 순간 화면의 약속과 동작이 갈린다. 키 취급에 대한
       * 약속은 어긋난 채로 두면 안 된다. 그래서 정확히 참인 문장으로 적는다 -
       * 어디로 가는가(고른 제공자뿐), 어디에 남는가(원하면 이 브라우저에만).
       */
      : `Tstory Skin Maker 는 ${hi('본인의 API 키')}를 활용하여 모델을 호출합니다. ` +
        `키는 llm 호출에만 사용하고, 고른 제공자 외에 어디로도 전송되지 않습니다. ` +
        `원하시면 이 브라우저에만 저장할 수 있습니다.` +
        `<div style="margin-top:8px">아래 박스에 api 키를 작성하시고 검증 버튼을 눌러주세요. ` +
        `첫 1회 인증 후 ${hi('좌측 상단 설정')}에서 api 키를 교체하실 수 있습니다.</div>`;

    parts.push(
      `<div class="msg"><div class="msg-role">안내</div><div class="msg-body">` +
        `<div>${lead}</div>` +
        (state.keyChecked
          ? ''
          : `<div class="tiny dim" style="margin-top:8px">어디 키를 쓰시겠어요?</div>`) +
        `<div class="opts" id="providers" style="margin-top:8px"></div>` +
        (state.keyChecked ? '' : keyFieldHtml(state, provider)) +
        `</div></div>`,
    );

    if (failure) {
      parts.push(errorHtml(provider));
    } else if (state.keyChecked) {
      parts.push(okHtml(state, provider));
    }

    root.innerHTML = parts.join('');
    wireChat(state);
    root.scrollTop = root.scrollHeight;
  }

  /**
   * 키를 받는 칸. 제공자 칩 바로 아래에 붙는다.
   *
   * 저장해 둔 키가 있으면 칸 대신 "확인할까요" 를 낸다. 살아 있는지는 불러 봐야
   * 알지만 그 호출을 말없이 대신 하지는 않는다 - 사용자가 누른 적 없는 요청은
   * 만들지 않는다는 것이 이 화면의 규칙이다.
   */
  function keyFieldHtml(state, provider) {
    if (stored) {
      return (
        `<div class="field-note" style="margin-top:10px">` +
        `저장해 둔 키가 있습니다 <span class="token">${esc(maskKey(provider, state.apiKey))}</span>` +
        `</div>` +
        `<div class="msg-actions">` +
        `<button class="sm" id="recheck">확인</button>` +
        `<button class="sm danger" id="forget">지우기</button>` +
        `</div>`
      );
    }

    return (
      `<div class="row" style="margin-top:10px">` +
      `<input type="password" class="mono" id="key" style="flex:1 1 150px;min-width:0" autocomplete="off" spellcheck="false" placeholder="${esc(provider.keyPlaceholder)}">` +
      `<button class="sm" id="check"${checking ? ' disabled' : ''}>검증</button>` +
      (checking ? `<span class="busy">확인 중</span>` : '') +
      `</div>` +
      `<div class="field-note">` +
      `<a href="${esc(provider.consoleUrl)}" target="_blank" rel="noopener">${esc(provider.consoleLabel)} 에서 발급</a>` +
      ` · 확인은 모델 목록을 받아오는 것이라 토큰이 들지 않습니다` +
      `</div>`
    );
  }

  function errorHtml(provider) {
    const shape = ERRORS[failure.kind] || ERRORS.api;
    const body =
      shape.body ||
      (failure.kind === 'format'
        ? `${provider.label} 키는 ${provider.keyPrefix}... 로 시작합니다. 다른 제공자의 키를 넣은 것은 아닌지 확인하세요.`
        : failure.message);

    const detail =
      shape.body && failure.message && failure.kind !== 'invalid_key' && failure.kind !== 'network'
        ? `<p class="small dim" style="margin:0 0 4px">${esc(failure.message)}</p>`
        : '';

    return (
      `<div class="msg sys"><div class="msg-role">안내</div>` +
      `<div class="msg-body" style="border-style:solid;border-color:var(--danger);background:var(--danger-bg)">` +
      `<h3 style="font-size:var(--t-body);color:var(--danger);margin-bottom:4px">${esc(shape.title)}</h3>` +
      `<p style="margin:0 0 4px">${esc(body)}</p>` +
      detail +
      `<p class="tiny dim" style="margin:0">${esc(shape.tail)}</p>` +
      // 다시 시도하는 버튼을 여기 두지 않는다. 위 말풍선의 키 칸에 값이 되돌아와
      // 있고 그 옆에 확인 버튼이 있다. 같은 일을 하는 버튼이 둘이면 어느 것이
      // 무엇을 보내는지 알 수 없다
      `<p class="tiny dim" style="margin:6px 0 0">위 키 칸에서 고쳐서 다시 확인하세요.</p>` +
      `</div></div>`
    );
  }

  function okHtml(state, provider) {
    return (
      `<div class="msg"><div class="msg-role">안내</div><div class="msg-body">` +
      // 확인 상태는 대화 머리의 배지가 상시로 들고 있다. 여기서 또 말하지 않는다
      `키를 확인했습니다. 쓸 모델을 고르세요.` +
      `<div class="tiny dim" style="margin-top:6px" id="lock-note"></div>` +
      `<div style="margin-top:10px" id="rec"></div>` +
      `<div class="row" style="margin-top:10px">` +
      `<button class="sm" id="pick-list">받아온 목록에서</button>` +
      `<button class="sm" id="pick-custom">직접 입력</button>` +
      `</div>` +
      `<div class="row" style="margin-top:8px">` +
      `<select id="all" style="max-width:100%"></select>` +
      `<input type="text" class="mono" id="custom" hidden style="flex:1 1 150px;min-width:0" placeholder="모델 ID">` +
      `</div>` +
      `<div class="field-note" id="model-note"></div>` +
      `<div class="msg-actions">` +
      `<button class="sm" id="forget">키 지우기</button>` +
      `</div>` +
      `</div></div>`
    );
  }

  /* ------------------------------------------------------------ 이어붙이기 */

  /** 대화는 통째로 다시 그려지므로 버튼 배선도 매번 다시 한다. */
  function wireChat(state) {
    const box = root.querySelector('#providers');
    for (const p of Object.values(PROVIDERS)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'opt sm' + (p.id === state.provider ? ' on' : '');
      b.textContent = p.label;
      b.addEventListener('click', () => {
        if (actions.getState().provider === p.id) return;
        // 다른 제공자의 키를 그대로 등록된 것처럼 보여주면 안 된다
        attempt++;
        checking = false;
        failure = null;
        custom = false;
        stored = false;
        actions.setProvider(p.id);
      });
      box.append(b);
    }

    const $ = (id) => root.querySelector('#' + id);

    // 키 입력칸. 확인 전에만 있다
    const keyEl = $('key');
    if (keyEl) {
      // 실패했으면 방금 넣은 값을 되돌려 놓는다. 오타 하나 때문에 긴 키를 다시
      // 붙여넣게 하지 않는다. 성공했거나 처음이면 비워 둔다
      keyEl.value = failure ? state.apiKey : '';
      keyEl.classList.toggle('bad', !!failure && failure.kind !== 'network');
      keyEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.isComposing) {
          e.preventDefault();
          submitKey();
        }
      });
      $('check').addEventListener('click', () => submitKey());
    }

    $('recheck')?.addEventListener('click', () => runCheck(actions.getState().apiKey));
    $('forget')?.addEventListener('click', () => {
      stored = false;
      failure = null;
      actions.forgetEverything();
      toast('저장된 키를 지웠습니다');
    });

    if (!state.keyChecked) return;

    $('pick-list').addEventListener('click', () => {
      custom = false;
      drawModels(actions.getState());
    });
    $('pick-custom').addEventListener('click', () => {
      custom = true;
      drawModels(actions.getState());
      $('custom').focus();
    });
    $('all').addEventListener('change', () => actions.setModel($('all').value));
    $('custom').addEventListener('change', () => actions.setModel($('custom').value.trim()));

    $('lock-note').textContent = [
      state.rememberKey ? '이 브라우저에 저장됨' : '이 탭에서만 유지됨',
      '뒤 4자리만 표시합니다',
    ].join(' · ');

    drawModels(state);
  }

  /* ------------------------------------------------------------ 모델 */

  function drawModels(state) {
    drawRecommended(state);
    drawAllModels(state);

    const known = recommendedFor(state).some((r) => r.id === state.model);
    const note = root.querySelector('#model-note');
    if (note) {
      note.textContent = known ? '' : '추천 밖 모델은 단가를 몰라 비용을 표시하지 못합니다';
    }
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
    const box = root.querySelector('#rec');
    if (!box) return;
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
      card.className = 'card tight pick' + (state.model === r.id ? ' selected' : '');
      card.addEventListener('click', () => {
        custom = false;
        actions.setModel(r.id);
      });

      const head = document.createElement('div');
      head.className = 'row';
      const name = document.createElement('span');
      name.className = 'card-title';
      name.style.fontSize = 'var(--t-body)';
      name.textContent = r.label;
      const gap = document.createElement('span');
      gap.className = 'spacer';
      const price = document.createElement('span');
      price.className = 'tiny dim';
      price.textContent = runCost(state.provider, r.id) || unitPrice(r);
      head.append(name, gap, price);

      const note = document.createElement('div');
      note.className = 'card-sub';
      note.textContent = r.note || unitPrice(r);

      card.append(head, note);
      box.append(card);
    }
  }

  /** 받아온 전체 목록과 직접 입력. 목록이 바뀔 때만 다시 채운다. */
  function drawAllModels(state) {
    const sel = root.querySelector('#all');
    const box = root.querySelector('#custom');
    if (!sel || !box) return;

    sel.hidden = custom;
    box.hidden = !custom;
    root.querySelector('#pick-list').classList.toggle('on', !custom);
    root.querySelector('#pick-custom').classList.toggle('on', custom);

    // 음성·이미지·임베딩 모델을 빼고 채운다. 안 거르면 제공자에 따라 100개가 넘어
    // 쓸 수 있는 모델을 찾지 못한다
    const usable = chatModels(state.models);
    const signature = usable.map((m) => m.id).join(',');
    if (sel.dataset.signature !== signature) {
      sel.dataset.signature = signature;
      sel.textContent = '';
      for (const m of usable) {
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

  /* ------------------------------------------------------------ 보내기 */

  /** 말풍선 안 키 칸에서 확인을 누른 경우. 키가 들어오는 유일한 경로다. */
  function submitKey() {
    const el = root.querySelector('#key');
    const key = el ? el.value.trim() : '';
    if (!key || checking) return;

    actions.setApiKey(key);
    runCheck(key);
  }

  /**
   * 입력줄에 적은 답을 들고 P1 으로 넘어간다.
   *
   * 이 자리의 안내 문구가 "어떤 용도의 블로그를 만들려고 하시나요?" 이므로,
   * 여기 적은 것은 P1 의 첫 질문에 그대로 들어가야 한다. 활성화만 해 놓고
   * 아무 데도 안 쓰면 물어놓고 안 듣는 셈이 된다.
   */
  function submitPurpose() {
    const el = foot('composer');
    const text = el.value.trim();
    const state = actions.getState();
    if (!state.keyChecked || !state.model) return;

    if (text) actions.setQuestion({ purpose: text });
    el.value = '';
    actions.go(exitTo());
  }

  /**
   * 키 확인.
   *
   * 형식 검사를 먼저 통과시켜 네트워크를 타지 않는다. 형식이 틀린 키로 부르면
   * 기다림만 늘고 얻는 것이 없다.
   */
  async function runCheck(rawKey) {
    if (checking) return;

    const state = actions.getState();
    const key = String(rawKey || state.apiKey).trim();

    const formatError = validateKeyFormat(state.provider, key);
    if (formatError) {
      failure = { kind: 'format', message: formatError };
      checking = false;
      stored = false;
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
      // 저장해 둔 키가 거부됐다면 그 키는 이제 쓸 수 없다. 입력칸을 내줘서
      // 새 키를 넣게 한다. 안 그러면 "확인" 버튼만 계속 눌러 보게 된다
      stored = false;
      draw();
      return;
    }

    failure = null;
    actions.setKeyChecked(res.models, preferredModel(state.provider, res.models, state.model));
    draw();
  }

  /* ------------------------------------------------------------ 그리기 */

  function draw() {
    const state = actions.getState();
    const provider = PROVIDERS[state.provider];

    drawHowto(provider);
    drawPrices(provider);
    drawChat();

    // 입력줄은 키가 확인된 뒤에만 열린다. 그 전에는 답을 받아 봐야 쓸 데가 없다
    const ready = state.keyChecked && !!state.model;
    const composer = foot('composer');
    composer.disabled = !ready;
    composer.placeholder = ready
      ? '어떤 용도의 블로그를 만들려고 하시나요?'
      : '키를 확인하면 여기서 대화를 시작합니다';

    foot('remember').textContent = state.rememberKey ? 'on' : 'off';
    foot('remember').classList.toggle('on', state.rememberKey);

    const back = exitTo() === 'W1';
    foot('start').disabled = !state.keyChecked || !state.model;
    foot('start').textContent = back ? '작업으로 돌아가기' : '시작';
    foot('foot-note').textContent = state.keyChecked
      ? back
        ? '만들던 것은 그대로 있습니다'
        : '요금은 사용자 계정에서 결제됩니다'
      : '키를 확인해야 시작할 수 있습니다';

    // 확인 전에는 비워 둔다. 이 줄에 넣을 만한 "지금 상태"가 아직 없다
    panes.canvasHead.textContent = state.keyChecked
      ? `모델 ${state.model || '고르는 중'} · 쓴 토큰 0`
      : '';
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

/** 단가를 모르는 모델은 값 대신 그렇게 적는다. NaN 을 화면에 내보내지 않는다. */
function money(v) {
  if (v == null || Number.isNaN(v)) return '모름';
  return '$' + (v < 0.01 ? v.toFixed(4) : v.toFixed(2));
}

/** 이미 고른 모델이 살아 있으면 유지하고, 아니면 추천 중 첫 번째를 고른다. */
function preferredModel(providerId, models, current) {
  const have = new Set(models.map((m) => m.id));
  if (current && have.has(current)) return current;
  const rec = (RECOMMENDED[providerId] || []).find((r) => have.has(r.id));
  return rec?.id || models[0]?.id || '';
}

/**
 * 강조 낱말.
 *
 * 색은 오른쪽 "키 받는 방법" 제목과 같은 --accent 다. design.css 의 .eyebrow 는
 * --dim(회색)이라 그대로 쓰면 강조가 아니라 오히려 흐려진다. 그래서 양쪽 다
 * --accent 로 맞췄다. 값을 직접 적지 않고 변수를 쓰는 것은 테마를 갈아탈 때
 * 같이 따라오게 하려는 것이다.
 */
function hi(text) {
  return `<span style="color:var(--accent);font-weight:var(--w-bold)">${esc(text)}</span>`;
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
