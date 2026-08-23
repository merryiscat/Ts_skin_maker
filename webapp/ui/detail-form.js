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
export function renderDetailForm(root, { details, conceptDetails, onChange, uploadedFont, onUpload }) {
  root.textContent = '';
  const state = { ...details };

  const emit = () => onChange({ ...state });

  for (const field of DETAIL_FIELDS) {
    // 배경 밝기·강조색은 "팔레트" 단계로 따로 뺐다. 지금 폼에는 안 낸다.
    if (field.palette) continue;
    // chatOnly: 스펙에는 있지만 폼에는 안 내는 항목(제목 글꼴 등). W1 대화로만 바꾼다.
    if (field.chatOnly) continue;
    // 사이드바를 없앤 상태에서 "사이드바에 넣을 것" 을 물어봐야 소용이 없다
    if (field.dependsOn && !meetsDependency(field.dependsOn, state)) continue;

    const wrap = el('div', 'field');

    const label = el('div', 'field-label');
    label.append(field.label);
    wrap.append(label);

    if (field.type === 'color') {
      wrap.append(colorControl(field, state, emit));
    } else if (field.type === 'font') {
      wrap.append(fontControl(field, state, emit, { uploadedFont, onUpload }));
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

/**
 * 글꼴 선택. 종류가 많아 칩 대신 검색형 콤보박스(텍스트 박스)로 낸다.
 * 입력칸에 치면 갈래별로 걸러 보여 주고, 고르면 그 글꼴 이름이 칸에 남는다.
 */
function fontControl(field, state, emit, opts = {}) {
  const wrap = el('div', 'combo');
  const input = el('input', 'chip-input combo-input');
  input.type = 'text';
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('spellcheck', 'false');
  input.placeholder = '글꼴 검색…';

  const list = el('div', 'combo-list');
  list.hidden = true;

  // 올린 글꼴이 있으면 맨 앞에 낀다. 업로드는 본문 글꼴에만 붙인다 - 제목 글꼴
  // 경로는 카탈로그 id 만 받아(fontById), 'uploaded' 를 주면 폴백돼 버린다.
  const canUpload = field.id === 'bodyFont';
  const options = (canUpload && opts.uploadedFont ? [{ value: 'uploaded', label: opts.uploadedFont.name || '내 올린 글꼴', cat: '내 글꼴' }] : []).concat(field.options);

  const labelOf = (v) => options.find((o) => o.value === v)?.label || v;
  input.value = labelOf(state[field.id]);

  const renderList = (filter) => {
    list.textContent = '';
    const f = (filter || '').trim().toLowerCase();
    let lastCat = null;
    for (const o of options) {
      const hay = (o.label + ' ' + (o.cat || '')).toLowerCase();
      if (f && !hay.includes(f)) continue;
      if (o.cat && o.cat !== lastCat) {
        lastCat = o.cat;
        const h = el('div', 'combo-cat');
        h.textContent = o.cat;
        list.append(h);
      }
      const item = el('button', 'combo-item');
      item.type = 'button';
      item.textContent = o.label;
      if (state[field.id] === o.value) item.classList.add('on');
      // mousedown 로 처리해야 input 의 blur 보다 먼저 잡혀 선택이 먹는다
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        state[field.id] = o.value;
        input.value = o.label;
        list.hidden = true;
        emit();
      });
      list.append(item);
    }
    if (!list.querySelector('.combo-item')) {
      const none = el('div', 'combo-cat');
      none.textContent = '검색 결과 없음';
      list.append(none);
    }
  };

  input.addEventListener('focus', () => {
    input.select();
    renderList('');
    list.hidden = false;
  });
  input.addEventListener('input', () => {
    renderList(input.value);
    list.hidden = false;
  });
  input.addEventListener('blur', () => {
    // 아무것도 안 고르고 나가면 원래 이름으로 되돌린다
    setTimeout(() => {
      list.hidden = true;
      input.value = labelOf(state[field.id]);
    }, 120);
  });

  wrap.append(input, list);

  // 글꼴 파일 올리기. 본문 글꼴에만, onUpload 가 있을 때만(P2 에서 넘긴다).
  if (canUpload && opts.onUpload) {
    const upBtn = el('button', 'sm ghost');
    upBtn.type = 'button';
    upBtn.style.marginTop = '6px';
    upBtn.textContent = '글꼴 파일 올리기';
    const file = el('input');
    file.type = 'file';
    file.accept = '.woff2,.woff,.ttf,.otf';
    file.hidden = true;
    upBtn.addEventListener('click', () => file.click());
    file.addEventListener('change', async () => {
      const f = file.files && file.files[0];
      if (!f) return;
      const font = await readFontFile(f);
      if (font) opts.onUpload(font);
    });
    wrap.append(upBtn, file);
  }

  return wrap;
}

/** 올린 글꼴 파일을 @font-face(data URL) 로 만든다. 글꼴은 스킨에 임베드된다. */
function readFontFile(file) {
  const fmt =
    { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' }[
      (file.name.split('.').pop() || '').toLowerCase()
    ] || '';
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => {
      const dataUrl = reader.result;
      const css =
        `@font-face{font-family:'UploadedFont';` +
        `src:url(${dataUrl})${fmt ? ` format('${fmt}')` : ''};font-display:swap;}`;
      resolve({ name: file.name, family: "'UploadedFont', sans-serif", css });
    };
    reader.readAsDataURL(file);
  });
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
  const code = el('span', 'color-code');
  code.textContent = input.value;
  // 드래그 중에는 옆의 코드 표시만 따라간다. input 마다 emit 하면 폼이 통째로
  // 다시 그려져 이 input 요소가 제거되고, 네이티브 컬러 피커가 도중에 닫힌다
  input.addEventListener('input', () => {
    code.textContent = input.value;
  });
  // 값 확정(피커를 닫거나 드래그를 놓은) 시점에만 밖으로 알린다
  input.addEventListener('change', () => {
    state[field.id] = input.value;
    emit();
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
    if (field.palette) continue;
    if (field.chatOnly) continue;
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
