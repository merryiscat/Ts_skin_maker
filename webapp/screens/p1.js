/**
 * P1 레이아웃 고르기 (1안씩 탐색, 2026-08-26 옵션2 + 피드백)
 *
 * 순서(옵션2)는 그대로 - 레이아웃을 먼저 고르고 무드는 C1 에서. 다만 P1 은 "4개를 한 번에"
 * 가 아니라 "한 안씩 탐색" 이다(디자인 피드백):
 *   - 시작에 레이아웃 1안을 보여준다.
 *   - "새로운 안": 지금까지 본 것과 다른 새 레이아웃(다음 시드 + avoid).
 *   - "이 안 수정": 입력한 의견으로 지금 안의 구조는 유지한 채 고친다(base 모드).
 *   - "이 레이아웃으로": 이 레이아웃을 들고 C1(무드) 로.
 *   - "이전으로": 용도(E1) 로.
 *
 * 각 안은 모델이 짓는 흑백 자유 와이어이고, 소독+실현가능성 린트를 통과한 것만 그린다.
 *
 * 화면 모듈 규약은 app/app.js 위쪽 주석에 있다.
 */

import { buildVariantPrompt, conceptSummary, VARIANTS } from '../harness/concept-prompt.js';
import { sanitizeWireHtml, lintWireFeasibility } from '../harness/wire-feasibility.js';
import { renderWireDoc } from '../loop/wire-render.js';
import { createStructured, estimateCost, PROVIDERS } from '../providers.js';

const MAX_TRIES = 3; // 실현가능성 위반 시 재시도(최초 1 + 재시도 2)

export function mount(root, ctx) {
  const { actions, toast, panes, showCanvas } = ctx;
  const getState = actions.getState;

  let busy = false;
  let reqSeq = 0;

  function call(prompt) {
    const st = getState();
    return createStructured(st.provider, st.apiKey, {
      model: st.model,
      system: prompt.system,
      messages: prompt.messages,
      schema: prompt.schema,
      effort: prompt.effort,
    });
  }

  /* ------------------------------------------------------------ 생성 */

  /**
   * 레이아웃 한 안을 만든다.
   * @param {{refine?:boolean, note?:string}} opts
   *   refine=true 면 지금 안의 구조를 유지하며 note 로 고친다. 아니면 새 구조를 avoid 로 뽑는다.
   */
  async function generateOne({ refine = false, note = '' } = {}) {
    busy = true;
    drawBusy();
    const my = ++reqSeq;
    const st = getState();
    const seen = st.genConcepts;

    let promptBase;
    if (refine) {
      const cur = seen[st.genIndex];
      if (!cur) {
        busy = false;
        drawShow(st);
        return;
      }
      promptBase = { purpose: st.purpose, seed: cur.hint, base: `${cur.name} — ${cur.hint}`, note };
    } else {
      const seed = VARIANTS[seen.length % VARIANTS.length].seed;
      const avoid = seen.map(conceptSummary).filter(Boolean);
      promptBase = { purpose: st.purpose, seed, avoid };
    }

    let fix = [];
    let concept = null;
    let lastError = null;
    for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
      const res = await call(buildVariantPrompt({ ...promptBase, fix }));
      if (my !== reqSeq) return;
      if (!res.ok) {
        lastError = res.error;
        break;
      }
      actions.addUsage(res.usage, estimateCost(st.provider, st.model, res.usage));
      // 사이드바 위치는 모델의 wireHtml 을 믿지 않고 sidebar 필드로 앱이 강제한다
      // (싼 모델이 "오른쪽" 을 desc 엔 쓰고 wireHtml 엔 반영 못 하는 것을 막는다).
      const wireHtml = withSidebarSide(sanitizeWireHtml(res.data.wireHtml), res.data.sidebar);
      const { violations } = lintWireFeasibility(wireHtml, res.data);
      if (violations.length && attempt < MAX_TRIES - 1) {
        fix = violations.map((v) => v.message);
        continue;
      }
      concept = {
        name: res.data.name || '',
        desc: res.data.desc || '',
        hint: res.data.hint || '',
        sidebar: res.data.sidebar || 'left',
        wireHtml,
        warned: violations.length > 0,
      };
      break;
    }

    if (my !== reqSeq) return;
    busy = false;
    if (!concept) {
      showError(lastError);
      drawShow(getState());
      return;
    }
    actions.addConcept(concept);
    drawShow(getState());
    showCanvas?.();
  }

  function drawBusy() {
    root.innerHTML =
      '<div class="msg"><div class="msg-body"><span class="busy">레이아웃을 만드는 중입니다</span></div></div>';
    panes.foot.innerHTML = '';
    panes.canvasHead.innerHTML = '<span class="badge">레이아웃</span>';
    panes.canvasBody.className = 'canvas-body';
    panes.canvasBody.innerHTML = '<div class="card" style="padding:8px"><div class="skeleton" style="height:420px"></div></div>';
  }

  /* ------------------------------------------------------------ 보여주기 */

  function drawShow(state) {
    const c = state.genIndex >= 0 ? state.genConcepts[state.genIndex] : null;
    root.innerHTML = `
      <div class="msg">
        <div class="msg-body">
          이 레이아웃 어때요? 마음에 들면 이걸로 가고, 아니면 지금 안을 고치거나 새 안을 보세요.
          <div class="row" style="gap:8px;margin-top:10px;flex-wrap:nowrap">
            <input type="text" id="note-input" class="chip-input" style="flex:1 1 150px;min-width:0"
              placeholder="지금 안을 고칠 의견 (예: 사이드바를 오른쪽으로)">
            <button id="refine" style="align-self:stretch">이 안 수정</button>
          </div>
          <button class="block" id="new" style="margin-top:8px">새로운 안 보기</button>
          <button class="primary block" id="confirm" style="margin-top:8px"${c ? '' : ' disabled'}>이 레이아웃으로</button>
          <button class="ghost block" id="back" style="margin-top:8px">이전으로</button>
        </div>
      </div>`;

    const noteEl = root.querySelector('#note-input');
    const refine = () => {
      if (busy) return;
      const v = noteEl.value.trim();
      if (!v) {
        toast?.('고칠 의견을 적어 주세요', 'bad');
        return;
      }
      if (looksLikeKey(v)) {
        toast?.('API 키로 보이는 값이라 보내지 않았습니다. 키는 설정에서 바꿉니다.', 'bad');
        return;
      }
      generateOne({ refine: true, note: v });
    };
    root.querySelector('#refine').addEventListener('click', refine);
    noteEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        refine();
      }
    });
    root.querySelector('#new').addEventListener('click', () => {
      if (busy) return;
      generateOne({ refine: false });
    });
    root.querySelector('#confirm').addEventListener('click', () => {
      if (getState().genIndex < 0) return;
      actions.go('C1'); // 레이아웃 확정 → 무드 단계로
    });
    root.querySelector('#back').addEventListener('click', () => actions.go('E1'));

    drawCanvas(state);
  }

  function drawCanvas(state) {
    const c = state.genIndex >= 0 ? state.genConcepts[state.genIndex] : null;
    panes.canvasHead.innerHTML =
      '<span class="badge">레이아웃</span>' + `<span class="badge plain">${esc(state.purpose)}</span>`;
    panes.canvasBody.className = 'canvas-body';
    panes.canvasBody.innerHTML = `
      <iframe id="wire-frame" title="와이어프레임" sandbox="" tabindex="-1"
        style="width:100%;height:460px;border:0;background:#fff;border-radius:8px;pointer-events:none"></iframe>
      <div id="wire-meta" style="margin-top:8px"></div>`;
    const frame = panes.canvasBody.querySelector('#wire-frame');
    if (frame && c) frame.srcdoc = renderWireDoc(c.wireHtml);
    const meta = panes.canvasBody.querySelector('#wire-meta');
    if (c) {
      meta.innerHTML =
        `<span class="strong">${esc(c.name)}</span>` +
        (c.warned ? ' <span class="badge bad">확인 필요</span>' : '') +
        `<p class="small dim" style="margin:4px 0 0">${esc(c.desc)}</p>`;
    }
  }

  /* ------------------------------------------------------------ 오류 */

  function showError(error) {
    if (!error) return;
    if (error.kind === 'invalid_key' || error.kind === 'format') {
      toast?.('키에 문제가 있습니다. 등록 화면으로 갑니다', 'bad');
      actions.go('E1');
      return;
    }
    toast?.(error.message || '요청이 실패했습니다', 'bad');
  }

  /* ------------------------------------------------------------ 진입 */

  const at = getState();
  if (!at.keyChecked || !at.purpose) {
    actions.go('E1');
  } else if (at.pendingGenerate || at.genPurpose !== at.purpose) {
    busy = true;
    drawBusy();
    queueMicrotask(() => {
      actions.requestGenerate(false);
      actions.resetConsult(at.purpose);
      generateOne({ refine: false });
    });
  } else if (at.genConcepts.length) {
    drawShow(at);
  } else {
    busy = true;
    drawBusy();
    queueMicrotask(() => generateOne({ refine: false }));
  }

  return {
    update() {},
  };
}

/** 와이어 루트(.wf)에 사이드바 위치 클래스를 심어 렌더 측에서 좌/우/없음을 강제한다. */
function withSidebarSide(html, sidebar) {
  const cls = sidebar === 'right' ? 'side-right' : sidebar === 'none' ? 'side-none' : 'side-left';
  return String(html)
    .replace(/class="wf"/, `class="wf ${cls}"`)
    .replace(/class='wf'/, `class='wf ${cls}'`);
}

function looksLikeKey(text) {
  const t = String(text || '').trim();
  return Object.values(PROVIDERS).some((p) => t.startsWith(p.keyPrefix));
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
