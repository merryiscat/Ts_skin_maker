/**
 * E1 진입 / 키 등록
 *
 * 키 확인은 모델 목록 조회로 한다. 토큰이 들지 않으므로 키가 살아 있는지와
 * 쓸 수 있는 모델을 한 번에 얻는다. 확인 전에는 모델 선택도 입력줄도 잠근다 -
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
 *   왼쪽 대화   안내 - 제공자 고르기 - 키 칸과 검증 - 확인 결과와 모델 고르기
 *   chat-foot   대화 입력줄과 전송 버튼. 키가 확인되기 전까지 잠근다
 *   캔버스      키 받는 방법 - 모델과 비용
 *
 * 흐름 안내와 결과물 도식은 첫 화면에서 뺐다 (2026-08-15 디자인 피드백).
 * 키를 넣는 사람에게 필요한 것만 남긴다.
 *
 * 화면 모듈 규약은 app/app.js 위쪽 주석에 있다.
 */

import { PROVIDERS, RECOMMENDED, validateKeyFormat, listModels } from '../providers.js';
import { purposeBlockHtml } from '../app/conversation.js';

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
  const { actions, toast, panes, scrollChat } = ctx;

  let checking = false;
  let failure = null; // { kind, message }
  let attempt = 0; // 확인 중에 제공자를 바꾸면 늦게 온 응답을 버린다

  // 저장해 둔 키로 들어왔는지. 그러면 입력칸 대신 "확인할까요" 를 낸다.
  // 원문을 다시 화면에 올리지 않으려는 것이다
  let stored = !!(actions.getState().rememberKey && actions.getState().apiKey);

  /* ------------------------------------------------------- 대화 아래 발판 */

  /*
   * 입력줄(발판)은 E1 내내 잠가 둔다.
   *
   * 이 자리는 W1 에서 **모델에게 전송되는 통로**다. E1 에서 여기에 무언가를
   * 받게 가르치면 나중에 W1 에서 같은 자리에 키를 붙여넣는 손버릇이 생기고,
   * 그러면 사용자 손으로 키가 밖에 나간다. 그래서 키도, 용도·느낌도 전부
   * 말풍선 안 전용 칸에서 받는다. 실제로 이 입력줄이 열리는 것은 W1 부터다.
   */
  panes.foot.innerHTML = `
    <div class="composer">
      <div class="row" style="flex-wrap:nowrap">
        <input type="text" id="composer" placeholder="용도와 느낌은 위 대화에서 정합니다" disabled style="flex:1 1 auto;min-width:0">
        <button class="primary" id="send" disabled>전송</button>
      </div>
    </div>`;

  const foot = (id) => panes.foot.querySelector('#' + id);

  /* ------------------------------------------------------------ 오른쪽 */

  panes.canvasBody.innerHTML = `
    <div id="howto"></div>

    <div class="eyebrow" style="margin:32px 0 12px">모델과 비용</div>
    <div id="price"></div>`;

  /**
   * 모델 비용 표.
   *
   * 지금은 공식 단가(100만 토큰당)만 보여 준다. "4안 1회 얼마" 같은 호출당
   * 어림값은 실제 호출의 평균 토큰 수를 재고 나서 되살리기로 했다
   * (docs/TODO.md) — 재기 전의 어림값은 지어낸 숫자와 다를 게 없다.
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
      `</tr>`;

    // "최고 성능"/"가성비" 구분 제목은 2026-08-16 피드백으로 뺐다.
    // 다만 줄 순서는 그 구분을 따른다 - 비싼 것부터 싼 것 순으로 읽히게
    const ordered = ['top', 'value'].flatMap((t) => recs.filter((r) => r.tier === t));

    box.innerHTML = `
      <div class="panel">
        <div class="panel-body">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr class="tiny dim">
                <th style="text-align:left;font-weight:400">모델</th>
                <th style="text-align:right;font-weight:400">100만 토큰당 입력/출력</th>
              </tr>
            </thead>
            <tbody>
              ${ordered.map(row).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  /**
   * 키 받는 방법. 고른 제공자에 맞춰 갈아 끼운다.
   *
   * 발급처 링크는 별도 줄이 아니라 첫 단계의 이름에 건다. 절차를 읽다가 그
   * 이름을 누르면 바로 그 화면이 열리는 것이 자연스럽고, 줄 하나가 준다.
   * keySteps 의 첫 단계에는 consoleLabel 이 들어 있다는 전제다 — 제공자를
   * 추가할 때 그 이름을 절차에 쓰면 링크는 따라온다.
   */
  function drawHowto(provider) {
    const linkStep = (s) => {
      const t = esc(s);
      const l = esc(provider.consoleLabel);
      if (!t.includes(l)) return t;
      return t.replace(l, `<a href="${esc(provider.consoleUrl)}" target="_blank" rel="noopener">${l}</a>`);
    };

    panes.canvasBody.querySelector('#howto').innerHTML = `
      <div class="eyebrow" style="margin-bottom:12px;color:var(--accent)">${esc(provider.label)} 키 받는 방법</div>
      <div class="panel">
        <div class="panel-body">
          <ol class="list" style="padding-left:18px;list-style:decimal">
            ${(provider.keySteps || []).map((s) => `<li>${linkStep(s)}</li>`).join('')}
          </ol>
        </div>
      </div>`;
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

    /*
     * 키와 모델이 모두 정해지면 설정 안내는 통째로 사라지고, 여기서 용도와
     * 느낌을 대화로 받는다 (2026-08-23 디자인 피드백: 용도·느낌을 P1 로
     * 나누지 않고 이 한 화면에서 채팅처럼 이어 묻는다). 4안 생성은 P1 이 맡되,
     * "4안 만들기" 를 누르면 곧장 넘어가 생성이 시작된다.
     */
    if (state.keyChecked && state.model) {
      root.innerHTML = purposeHtml();
      wirePurpose();
      scrollChat?.();
      return;
    }

    const parts = [];

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
    /*
     * "이 브라우저에 저장할 수 있습니다" 는 이제 말하지 않는다.
     *
     * 저장 토글을 화면에서 뺐기 때문이다 (2026-08-15 디자인 피드백). 약속만
     * 남기고 켤 방법이 없으면 화면이 거짓말을 하는 셈이라 문장도 같이 뺐다.
     * 과거에 저장해 둔 키가 있는 사람의 동작(stored 경로)은 그대로 살아 있다.
     */
    const lead = state.keyChecked
      ? '쓸 키는 정해졌습니다.'
      : `Tstory Skin Maker 는 ${hi('본인의 API 키')}를 활용하여 모델을 호출합니다. ` +
        `키는 llm 호출에만 사용하고, 고른 제공자 외에 어디로도 전송되지 않습니다.` +
        `<div style="margin-top:8px">아래 박스에 api 키를 작성하시고 검증 버튼을 눌러주세요. ` +
        `첫 1회 인증 후 ${hi('좌측 상단 설정')}에서 api 키를 교체하실 수 있습니다.</div>` +
        `<div class="tiny dim" style="margin-top:8px">처음 연결 검증에는 비용이 소요되지 않습니다.</div>`;

    parts.push(
      `<div class="msg"><div class="msg-body">` +
        `<div>${lead}</div>` +
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
    scrollChat?.();
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

    // 검증 버튼은 align-self:stretch 로 옆 입력칸과 키를 맞춘다. 높이를 숫자로
    // 적으면 입력칸의 패딩을 바꿀 때 따로 놀게 된다
    return (
      `<div class="row" style="margin-top:10px">` +
      `<input type="password" class="mono chip-input" id="key" style="flex:1 1 150px;min-width:0" autocomplete="off" spellcheck="false" placeholder="${esc(provider.keyPlaceholder)}">` +
      `<button class="sm" id="check" style="align-self:stretch"${checking ? ' disabled' : ''}>검증</button>` +
      (checking ? `<span class="busy">확인 중</span>` : '') +
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
      `<div class="msg sys">` +
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
      `<div class="msg"><div class="msg-body">` +
      // 확인 상태는 대화 머리의 배지가 상시로 들고 있다. 여기서 또 말하지 않는다
      `키를 확인했습니다. 쓸 모델을 고르세요.` +
      `<div style="margin-top:10px" id="rec"></div>` +
      // 키 변경·삭제와 그 밖의 모델은 설정에서 다룬다. 카드를 누르면 바로 골라지므로
      // "모델 선택" 버튼과 "키 지우기" 버튼은 걷어냈다 (2026-08-25 피드백).
      `<div class="tiny dim" style="margin-top:8px" id="lock-note"></div>` +
      `</div></div>`
    );
  }

  /**
   * 키와 모델이 정해진 뒤의 대화 - 용도 하나만 묻는다.
   *
   * 예전엔 여기서 느낌까지 받아 P1 에서 4안을 생성했지만, 자유 텍스트 컨셉을
   * 고정 스키마로 충실히 옮기지 못해 선택형으로 바꿨다 (2026-08-23). 이제 용도를
   * 받으면 곧장 스키마 선택 화면(P2)으로 넘어가 항목을 직접 고른다. 용도는
   * 맥락으로 남아 로그 위에 표시되고 W1 대화·산출물에 쓰인다.
   *
   * 블록 생김새는 conversation.js 가 단일 출처로 들고 있다. 키/모델 관리는 설정.
   */
  function purposeHtml() {
    return purposeBlockHtml({ purpose: '' }, true);
  }

  function wirePurpose() {
    // 용도를 고르거나 적으면 상담+4컨셉 생성을 예약하고 P1(생성형 앞단)으로 간다
    const go = (purpose) => {
      const text = String(purpose || '').trim();
      if (!text) return;
      actions.setQuestion({ purpose: text });
      actions.requestGenerate(true);
      actions.go('P1');
    };
    for (const b of root.querySelectorAll('#samples button')) {
      b.addEventListener('click', () => go(b.textContent));
    }
    const purposeInput = root.querySelector('#purpose-input');
    purposeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        go(purposeInput.value);
      }
    });
    root.querySelector('#purpose-send').addEventListener('click', () => go(purposeInput.value));
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

    $('lock-note').textContent = [
      state.rememberKey ? '이 브라우저에 저장됨' : '이 탭에서만 유지됨',
      '키 변경·삭제는 설정에서',
    ].join(' · ');

    drawModels(state);
  }

  /* ------------------------------------------------------------ 모델 */

  function drawModels(state) {
    drawRecommended(state);
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
      card.addEventListener('click', () => actions.setModel(r.id));

      const head = document.createElement('div');
      head.className = 'row';
      const name = document.createElement('span');
      name.className = 'card-title';
      name.style.fontSize = 'var(--t-body)';
      name.textContent = r.label;
      head.append(name);

      // 단가(100만 토큰당)는 사용자가 가늠하기 어려워 카드에서 뺐다. 상대적 비용은
      // note 가 말로 전한다("가장 싸고 빠릅니다" 등). 실행당 총 비용 표시는
      // 호출당 평균 토큰을 잰 뒤로 미뤄 둠 (docs/TODO.md, 2026-08-25 피드백).
      const note = document.createElement('div');
      note.className = 'card-sub';
      note.textContent = r.note || '';

      card.append(head, note);
      box.append(card);
    }
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
    actions.setKeyChecked(res.models, preferredModel(res.models, state.model));
    draw();
  }

  /* ------------------------------------------------------------ 그리기 */

  function draw() {
    const state = actions.getState();
    const provider = PROVIDERS[state.provider];

    drawHowto(provider);
    drawPrices(provider);
    drawChat();

    // 입력줄은 E1 내내 잠가 둔다. 용도·느낌은 위 말풍선 안에서 받고, 이 줄이
    // 실제로 열리는 것은 W1(모델과의 대화)부터다. 상태에 맞춰 안내만 바꾼다
    const composer = foot('composer');
    composer.disabled = true;
    composer.placeholder = !state.keyChecked
      ? '키를 확인하면 다음으로 넘어갑니다'
      : !state.model
        ? '모델을 고르면 용도를 묻습니다'
        : '용도와 느낌은 위 대화에서 정합니다';
    foot('send').disabled = true;

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


/**
 * 이미 고른 모델이 살아 있으면 유지한다. 처음이면 비워 둔다.
 *
 * 예전에는 추천 첫 번째를 대신 골라 줬는데, 그러면 "모델을 골랐다"는 순간이
 * 없어서 고르는 화면을 보여줄 틈도 없다. 직접 고른 순간이 있어야 그다음
 * (용도 질문)으로 넘어갈 수 있다 (2026-08-17 디자인 피드백).
 */
function preferredModel(models, current) {
  const have = new Set(models.map((m) => m.id));
  return current && have.has(current) ? current : '';
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
