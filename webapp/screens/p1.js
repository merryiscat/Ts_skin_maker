/**
 * P1 컨셉 고르기
 *
 * 용도와 컨셉을 묻고, 그 답으로 만든 컨셉 4안을 제시한다.
 *
 * 넷을 한 호출로 같이 만든다. 따로 만들면 서로를 모르는 채 생성되어 보편 A 와 B 가,
 * 실험 A 와 B 가 겹친다. 넷이 서로 다르다는 것이 4안의 존재 이유이므로 상호 차별화는
 * 생성 시점에 보장돼야 한다.
 *
 * 대신 검증에 실패한 안만 나머지 셋을 참고 자료로 줘서 그 안만 다시 만든다.
 * 하나 때문에 넷을 통째로 다시 만들면 사용자 지갑에서 나가는 돈이 네 배가 된다.
 */

import { buildConceptPrompt, buildRetryConceptPrompt, conceptSchemaFor } from '../harness/system-prompt.js';
import { validateConceptSet, validateDetails, detailsToPreset } from '../harness/spec.js';
import { createStructured, estimateCost } from '../providers.js';
import { buildSkinHtml } from '../presets/base/skeleton.js';
import { auditPlaceholders, auditGroupTags } from '../harness/contract.js';
import { checkPitfalls } from '../harness/pitfalls.js';
import { schematic } from '../ui/schematic.js';

const KINDS = ['보편 A', '보편 B', '실험 A', '실험 B'];

const PURPOSES = ['개발', '에세이', '사진', '리뷰', '일상'];
const MOODS = ['미니멀', '터미널 느낌', '잡지 같은', '따뜻한', '정보 밀도 높게', '여백 많이'];

export function mount(root, ctx) {
  const { actions, shared, toast } = ctx;

  let phase = 'ask'; // ask | busy | show
  let progress = [];
  let failed = []; // 검증에 걸린 종류
  let zoomIndex = -1;
  let custom = false;

  root.innerHTML = `
    <div class="page wide">
      <div id="body"></div>
    </div>`;

  const body = root.querySelector('#body');

  /* ------------------------------------------------------------ 질문 */

  function drawAsk(state) {
    body.innerHTML = `
      <div class="panel" style="max-width:680px;margin:0 auto">
        <div class="panel-head">컨셉 고르기</div>
        <div class="panel-body">
          <div class="field">
            <div class="field-label">어떤 글을 쓰시나요</div>
            <div class="opts" id="purposes"></div>
            <input type="text" id="purpose-custom" placeholder="직접 입력" hidden style="margin-top:6px">
          </div>

          <div class="field">
            <div class="field-label">어떤 느낌이면 좋겠어요</div>
            <input type="text" id="mood" placeholder="예: 담백하고 글에 집중되는">
            <div class="opts" style="margin-top:6px" id="moods"></div>
            <div class="field-note">비워 두면 용도만 보고 만듭니다</div>
          </div>
        </div>
        <div class="panel-foot row">
          <span class="tiny dim" id="cost-hint"></span>
          <span class="spacer"></span>
          <button class="primary" id="make">4안 만들기</button>
        </div>
      </div>`;

    const purposesEl = body.querySelector('#purposes');
    const customEl = body.querySelector('#purpose-custom');
    const moodEl = body.querySelector('#mood');

    const paint = () => {
      purposesEl.textContent = '';
      for (const p of PURPOSES) {
        const b = button(p, state.purpose === p && !custom, () => {
          custom = false;
          actions.setQuestion({ purpose: p });
        });
        purposesEl.append(b);
      }
      purposesEl.append(
        button('직접 입력', custom, () => {
          custom = true;
          actions.setQuestion({ purpose: '' });
        }),
      );
      customEl.hidden = !custom;
    };
    paint();

    customEl.value = custom ? state.purpose : '';
    customEl.addEventListener('input', () => actions.setQuestion({ purpose: customEl.value }));

    moodEl.value = state.mood;
    moodEl.addEventListener('input', () => actions.setQuestion({ mood: moodEl.value }));

    const moodsEl = body.querySelector('#moods');
    for (const m of MOODS) {
      moodsEl.append(
        button(m, false, () => {
          const next = state.mood ? `${state.mood}, ${m}` : m;
          moodEl.value = next;
          actions.setQuestion({ mood: next });
        }, 'ghost'),
      );
    }

    body.querySelector('#make').addEventListener('click', () => generate());
    updateAsk(actions.getState());
  }

  function updateAsk(state) {
    const make = body.querySelector('#make');
    if (make) make.disabled = !state.purpose.trim();
    const hint = body.querySelector('#cost-hint');
    if (hint) {
      hint.textContent = state.keyChecked
        ? '4안을 만드는 데 한 번 호출합니다'
        : '키를 먼저 확인해야 합니다';
    }
  }

  /* ------------------------------------------------------------ 생성 */

  function drawBusy() {
    body.innerHTML = `
      <div class="panel" style="max-width:680px;margin:0 auto">
        <div class="panel-head">4안 만드는 중</div>
        <div class="panel-body">
          <p class="small dim" id="cond"></p>
          <div id="prog" class="col" style="margin-top:10px"></div>
          <p class="tiny dim" style="margin-top:12px">넷이 서로 달라야 하므로 한 번에 같이 만듭니다</p>
        </div>
        <div class="panel-foot"><span class="busy">기다리는 중</span></div>
      </div>`;
    const st = actions.getState();
    body.querySelector('#cond').textContent = [st.purpose, st.mood].filter(Boolean).join(' / ');
    drawProgress();
  }

  function drawProgress() {
    const el = body.querySelector('#prog');
    if (!el) return;
    el.innerHTML = progress
      .map((p) => `<div class="row"><span class="badge">${esc(p.kind)}</span><span class="small dim">${esc(p.note)}</span></div>`)
      .join('');
  }

  /**
   * 안 하나가 실제로 티스토리에 올릴 수 있는 스킨이 되는지 본다.
   * 세부 값이 범위 안이어도 골격을 통과하지 못하면 소용이 없다.
   */
  function auditConcept(concept) {
    const problems = validateDetails(concept.details);
    if (problems.length) return problems;

    const preset = detailsToPreset(concept.details);
    const html = buildSkinHtml(preset);
    const a = auditPlaceholders(html);
    const g = auditGroupTags(html);
    const traps = checkPitfalls({ 'skin.html': html, 'style.css': shared.css, 'images/script.js': shared.js });

    return [
      ...a.unknown.map((x) => `없는 치환자 ${x}`),
      ...a.blacklisted.map((x) => x.why),
      ...a.scopeErrors.map((x) => x.message),
      ...g.unknown.map((x) => `없는 그룹 태그 ${x}`),
      ...g.unbalanced.map((x) => `여닫이가 안 맞는 ${x.tag}`),
      ...g.parentErrors.map((x) => x.message),
      ...traps.map((x) => x.message),
    ];
  }

  async function callModel(prompt) {
    const st = actions.getState();
    const res = await createStructured(st.provider, st.apiKey, {
      model: st.model,
      system: prompt.system,
      messages: prompt.messages,
      schema: prompt.schema,
      effort: prompt.effort,
    });
    if (res.ok) {
      actions.addUsage(res.usage, estimateCost(st.provider, st.model, res.usage));
    }
    return res;
  }

  async function generate() {
    const st = actions.getState();
    if (!st.keyChecked) {
      actions.go('E1');
      return;
    }

    phase = 'busy';
    failed = [];
    progress = KINDS.map((k) => ({ kind: k, note: '대기' }));
    actions.setBusy(true);
    drawBusy();

    const res = await callModel(buildConceptPrompt({ purpose: st.purpose, mood: st.mood }));

    if (!res.ok) {
      actions.setBusy(false);
      phase = 'ask';
      drawAsk(actions.getState());
      showError(res.error);
      return;
    }

    const concepts = res.data?.concepts || [];

    // 넷이 서로 다른지 먼저 본다. 겹치면 사용자가 고를 근거가 없다
    const setErrors = validateConceptSet(concepts);

    // 안마다 실제로 스킨이 되는지 본다
    const kept = [];
    for (const c of concepts) {
      const problems = auditConcept(c);
      const i = progress.findIndex((p) => p.kind === c.kind);
      if (i >= 0) progress[i].note = problems.length ? '통과하지 못함' : '완료';
      if (problems.length) failed.push({ kind: c.kind, problems });
      else kept.push(c);
    }

    // 겉모습이 겹친다는 지적은 개별 안의 문제가 아니라 묶음의 문제다.
    // 넷 다 멀쩡한데 서로 닮았을 뿐이라면 통째로 버리지 않고 알리기만 한다.
    const shapeDup = setErrors.filter((e) => e.includes('겉모습이 같은'));

    actions.setConcepts(kept);
    actions.setBusy(false);
    phase = 'show';
    drawShow(actions.getState(), shapeDup);
  }

  /** 실패한 안 하나만 다시 만든다. 살아남은 셋을 참고로 줘서 겹치지 않게 한다. */
  async function retryOne(kind) {
    const st = actions.getState();
    actions.setBusy(true);
    const btn = body.querySelector(`[data-retry="${cssEsc(kind)}"]`);
    if (btn) {
      btn.disabled = true;
      btn.textContent = '만드는 중';
    }

    const prompt = buildRetryConceptPrompt({
      purpose: st.purpose,
      mood: st.mood,
      kind,
      others: st.concepts,
    });
    const res = await callModel({ ...prompt, schema: prompt.schema || conceptSchemaFor(kind) });

    actions.setBusy(false);

    if (!res.ok) {
      showError(res.error);
      drawShow(actions.getState());
      return;
    }

    const concept = res.data?.concept || res.data;
    const problems = auditConcept(concept);
    if (problems.length) {
      toast('다시 만든 안도 통과하지 못했습니다', 'bad');
      drawShow(actions.getState());
      return;
    }

    failed = failed.filter((f) => f.kind !== kind);
    actions.replaceConcept(kind, concept);
    drawShow(actions.getState());
  }

  /* ------------------------------------------------------------ 4안 */

  function drawShow(state, shapeDup = []) {
    const cards = state.concepts
      .map((c, i) => conceptCard(c, i, i === state.conceptIndex))
      .join('');

    const failedBox = failed.length
      ? `<div class="note bad" style="margin-bottom:12px">
           <h3>${failed.map((f) => esc(f.kind)).join(', ')} 가 검증을 통과하지 못했습니다</h3>
           <p class="small">나온 안 중에서 고르거나, 통과하지 못한 안만 다시 만들 수 있습니다. 다시 만들 때 나머지와 겹치지 않도록 그것들을 참고합니다.</p>
           <div class="row" style="margin-top:8px">
             ${failed.map((f) => `<button class="sm" data-retry="${esc(f.kind)}">${esc(f.kind)} 다시 만들기</button>`).join('')}
           </div>
           <p class="tiny dim" style="margin-top:6px">${esc(failed[0].problems[0] || '')}</p>
         </div>`
      : '';

    const dupBox = shapeDup.length
      ? `<div class="note" style="margin-bottom:12px">
           <h3>비슷해 보이는 안이 있습니다</h3>
           <p class="small">${esc(shapeDup[0])}</p>
           <p class="tiny dim">조건을 바꿔 다시 만들면 더 다른 넷이 나올 수 있습니다.</p>
         </div>`
      : '';

    body.innerHTML = `
      <div class="row" style="margin-bottom:12px">
        <h2 style="font-size:16px">4안</h2>
        <span class="badge">${esc([state.purpose, state.mood].filter(Boolean).join(' / '))}</span>
        <span class="spacer"></span>
        <button id="again">조건 바꾸기</button>
        <button id="remake">다시 만들기</button>
      </div>
      ${failedBox}${dupBox}
      <div id="cards" style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">${cards}</div>
      <div class="panel" style="margin-top:12px">
        <div class="panel-body">
          <div class="field" style="margin:0">
            <div class="field-label">섞고 싶은 것이 있으면 적어 주세요</div>
            <input type="text" id="mix" placeholder="예: 보편 A로 하되 실험 A의 고정폭 글꼴을 쓰고 싶다">
            <div class="field-note">다음 화면의 세부 항목에 미리 반영됩니다</div>
          </div>
        </div>
        <div class="panel-foot row">
          <span class="tiny dim">다음 화면에서 사이드바 위치와 목록 형태 같은 세부를 정합니다</span>
          <span class="spacer"></span>
          <button class="primary" id="next" ${state.conceptIndex < 0 ? 'disabled' : ''}>세부 정하러 가기</button>
        </div>
      </div>
      <div id="zoom"></div>`;

    body.querySelector('#again').addEventListener('click', () => {
      phase = 'ask';
      drawAsk(actions.getState());
    });
    body.querySelector('#remake').addEventListener('click', () => generate());

    const mix = body.querySelector('#mix');
    mix.value = state.mixNote;
    mix.addEventListener('input', () => actions.setMixNote(mix.value));

    body.querySelector('#next').addEventListener('click', () => actions.go('P2'));

    for (const b of body.querySelectorAll('[data-choose]')) {
      b.addEventListener('click', () => {
        actions.chooseConcept(Number(b.dataset.choose));
        drawShow(actions.getState());
      });
    }
    for (const b of body.querySelectorAll('[data-zoom]')) {
      b.addEventListener('click', () => {
        zoomIndex = Number(b.dataset.zoom);
        drawZoom(actions.getState());
      });
    }
    for (const b of body.querySelectorAll('[data-retry]')) {
      b.addEventListener('click', () => retryOne(b.dataset.retry));
    }
  }

  function conceptCard(c, i, selected) {
    const preset = detailsToPreset(c.details);
    return `
      <div class="card${selected ? ' selected' : ''}">
        <div style="display:flex;gap:10px;align-items:flex-start">
          <div style="flex:1;min-width:0">
            <span class="badge solid">${esc(c.kind)}</span>
            <div style="font-weight:600;font-size:14px;margin:6px 0 4px">${esc(c.name)}</div>
            <p class="small" style="margin:0 0 8px">${esc(c.summary)}</p>
          </div>
          <div style="flex:0 0 auto">${schematic(preset, { width: 88 })}</div>
        </div>
        <div class="tiny dim" style="margin-bottom:4px">무엇을 다르게 하나</div>
        <ul class="list">${(c.differences || []).map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
        <div class="row" style="margin-top:10px">
          <button class="sm${selected ? ' on' : ''}" data-choose="${i}">${selected ? '선택됨' : '선택'}</button>
          <button class="sm" data-zoom="${i}">크게 보기</button>
        </div>
      </div>`;
  }

  /** 크게 보기. 컨셉을 길게 읽고 포기하는 것까지 본다. */
  function drawZoom(state) {
    const c = state.concepts[zoomIndex];
    const box = body.querySelector('#zoom');
    if (!c) {
      box.innerHTML = '';
      return;
    }
    const preset = detailsToPreset(c.details);
    box.innerHTML = `
      <div class="panel" style="margin-top:12px">
        <div class="panel-head">
          <span class="badge solid">${esc(c.kind)}</span>
          <span class="plain" style="font-size:13px;color:var(--text)">${esc(c.name)}</span>
          <span class="spacer"></span>
          <button class="sm" id="zoom-prev">이전 안</button>
          <button class="sm" id="zoom-next">다음 안</button>
          <button class="sm" id="zoom-close">닫기</button>
        </div>
        <div class="panel-body split">
          <div>
            <p style="margin:0 0 12px">${esc(c.summary)}</p>
            <div class="tiny dim" style="margin-bottom:4px">구체적으로</div>
            <ul class="list">${(c.differences || []).map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
            <div class="tiny dim" style="margin:14px 0 4px">이 컨셉이 포기하는 것</div>
            <p class="small" style="margin:0">${esc(c.tradeoff)}</p>
            <button class="primary" style="margin-top:14px" id="zoom-choose">이걸로 시작</button>
          </div>
          <div>
            <div style="display:flex;justify-content:center">${schematic(preset, { width: 300 })}</div>
            <p class="tiny dim" style="text-align:center;margin-top:8px">
              실제 렌더가 아니라 도식입니다. 정확한 모습은 세부를 정한 뒤 작업 화면에서 봅니다.
            </p>
          </div>
        </div>
      </div>`;

    box.querySelector('#zoom-close').addEventListener('click', () => {
      zoomIndex = -1;
      box.innerHTML = '';
    });
    box.querySelector('#zoom-prev').addEventListener('click', () => {
      zoomIndex = (zoomIndex - 1 + state.concepts.length) % state.concepts.length;
      drawZoom(state);
    });
    box.querySelector('#zoom-next').addEventListener('click', () => {
      zoomIndex = (zoomIndex + 1) % state.concepts.length;
      drawZoom(state);
    });
    box.querySelector('#zoom-choose').addEventListener('click', () => {
      actions.chooseConcept(zoomIndex);
      actions.go('P2');
    });
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ------------------------------------------------------------ 오류 */

  function showError(error) {
    if (!error) return;
    if (error.kind === 'invalid_key' || error.kind === 'format') {
      toast('키에 문제가 있습니다. 등록 화면으로 갑니다', 'bad');
      actions.go('E1');
      return;
    }
    toast(error.message || '요청이 실패했습니다', 'bad');
  }

  /* ------------------------------------------------------------ */

  function button(label, on, onClick, extra = '') {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `opt${on ? ' on' : ''}${extra ? ' ' + extra : ''}`;
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  drawAsk(actions.getState());

  return {
    update(state) {
      if (phase === 'ask') {
        // 입력칸을 다시 그리면 커서가 날아간다. 버튼 상태만 손댄다
        const purposesEl = body.querySelector('#purposes');
        if (purposesEl) {
          for (const b of purposesEl.children) {
            b.classList.toggle('on', b.textContent === state.purpose && !custom);
          }
        }
        updateAsk(state);
      } else if (phase === 'busy') {
        drawProgress();
      }
    },
  };
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function cssEsc(s) {
  return String(s).replace(/"/g, '\\"');
}
