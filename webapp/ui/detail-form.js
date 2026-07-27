/**
 * 세부 항목 폼 (P2)
 *
 * DETAIL_FIELDS 를 그대로 화면으로 만든다. 항목을 여기에 따로 적지 않는다.
 * spec.js 에 항목을 하나 더하면 이 폼에 자동으로 나온다.
 *
 * 이 화면은 API 를 쓰지 않는다. 전부 플래그 조작이라 마음껏 눌러 볼 수 있고,
 * 그 점이 대화로 고치는 W1 과 갈리는 지점이다.
 */

import { DETAIL_FIELDS } from '../harness/spec.js';

/**
 * 폼을 그린다.
 *
 * @param {HTMLElement} root
 * @param {object} opts
 * @param {object} opts.details      현재 값
 * @param {object} [opts.conceptDetails] 컨셉이 정한 값. 다른 항목에 표시를 단다
 * @param {(next:object)=>void} opts.onChange
 */
export function renderDetailForm(root, { details, conceptDetails, onChange }) {
  root.textContent = '';
  const state = { ...details };

  const emit = () => onChange({ ...state });

  for (const field of DETAIL_FIELDS) {
    // 사이드바를 없앤 상태에서 "사이드바에 넣을 것" 을 물어봐야 소용이 없다
    if (field.dependsOn && !meetsDependency(field.dependsOn, state)) continue;

    const wrap = el('div', 'field');

    const label = el('div', 'field-label');
    label.append(field.label);
    if (conceptDetails && isFromConcept(field, state, conceptDetails)) {
      const tag = el('span', 'from-concept');
      tag.textContent = '컨셉';
      tag.title = '컨셉이 정한 값입니다';
      label.append(' ', tag);
    }
    wrap.append(label);

    if (field.type === 'color') {
      wrap.append(colorControl(field, state, emit));
    } else if (field.type === 'multi') {
      wrap.append(multiControl(field, state, emit));
    } else {
      wrap.append(singleControl(field, state, emit));
    }

    if (field.note) {
      const note = el('div', 'field-note');
      note.textContent = field.note;
      wrap.append(note);
    }

    root.append(wrap);
  }
}

/** 의존 조건을 만족하는지. { sidebar: ['left','right'] } 형태 */
function meetsDependency(dep, state) {
  return Object.entries(dep).every(([k, allowed]) => allowed.includes(state[k]));
}

/** 이 항목이 컨셉이 정한 값 그대로인지. 사용자가 바꾸면 표시가 사라진다. */
function isFromConcept(field, state, conceptDetails) {
  const a = state[field.id];
  const b = conceptDetails[field.id];
  if (b === undefined) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && [...a].sort().join() === [...b].sort().join();
  }
  return a === b;
}

function singleControl(field, state, emit) {
  const row = el('div', 'opts');
  for (const o of field.options) {
    const b = el('button', 'opt');
    b.type = 'button';
    b.textContent = o.label;
    if (o.note) b.title = o.note;
    if (state[field.id] === o.value) b.classList.add('on');
    b.addEventListener('click', () => {
      state[field.id] = o.value;
      emit();
    });
    row.append(b);
  }
  return row;
}

function multiControl(field, state, emit) {
  const row = el('div', 'opts');
  for (const o of field.options) {
    const b = el('button', 'opt');
    b.type = 'button';
    b.textContent = o.label;
    if (o.note) b.title = o.note;
    const has = () => (state[field.id] || []).includes(o.value);
    if (has()) b.classList.add('on');
    b.addEventListener('click', () => {
      const cur = new Set(state[field.id] || []);
      if (cur.has(o.value)) cur.delete(o.value);
      else cur.add(o.value);
      // 정의된 순서를 유지한다. 순서가 흔들리면 컨셉 값과 비교할 때 헛되이 달라 보인다
      state[field.id] = field.options.map((x) => x.value).filter((v) => cur.has(v));
      emit();
    });
    row.append(b);
  }
  return row;
}

function colorControl(field, state, emit) {
  const row = el('div', 'opts');
  const input = el('input', 'color');
  input.type = 'color';
  input.value = state[field.id] || field.default;
  input.addEventListener('input', () => {
    state[field.id] = input.value;
    emit();
  });
  const code = el('span', 'color-code');
  code.textContent = input.value;
  input.addEventListener('input', () => {
    code.textContent = input.value;
  });
  row.append(input, code);
  return row;
}

function el(tag, cls) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  return n;
}

/**
 * 컨셉 값과 달라진 항목을 모은다.
 * 많이 바뀌었다면 컨셉이 안 맞는다는 신호라 화면에서 그 사실을 알려 준다.
 */
export function changedFromConcept(details, conceptDetails) {
  if (!conceptDetails) return [];
  const out = [];
  for (const field of DETAIL_FIELDS) {
    if (isFromConcept(field, details, conceptDetails)) continue;
    if (conceptDetails[field.id] === undefined) continue;
    out.push({
      id: field.id,
      label: field.label,
      from: labelOf(field, conceptDetails[field.id]),
      to: labelOf(field, details[field.id]),
    });
  }
  return out;
}

/** 값을 사람이 읽을 이름으로 바꾼다. */
function labelOf(field, value) {
  if (field.type === 'color') return String(value);
  if (field.type === 'multi') {
    const arr = value || [];
    if (!arr.length) return '없음';
    return arr.map((v) => field.options.find((o) => o.value === v)?.label || v).join(', ');
  }
  return field.options.find((o) => o.value === value)?.label || String(value);
}
