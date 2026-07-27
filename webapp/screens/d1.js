/**
 * D1 내려받기 / 설치 안내
 *
 * ZIP 만으로는 설치가 되지 않는다. 티스토리는 스킨 압축 파일을 올리는 경로를 주지 않아
 * skin.html 과 style.css 는 스킨 편집 화면에 붙여넣고 images 아래 파일은 파일업로드 탭에서
 * 따로 올려야 한다. 한쪽을 빠뜨리면 404 가 나면서 레이아웃이 통째로 깨진다.
 *
 * 처음 하는 사람이 막히는 원인은 설명 부족이 아니라 위치를 못 찾는 것이다. 그래서
 * 관리자 화면을 도식으로 그려 지금 누를 곳에 굵은 테두리를 준다. 다만 남의 화면이라
 * 언제든 틀릴 수 있으므로 도식은 단순하게 그리고, 메뉴 경로와 기준 날짜를 항상 병기한다.
 */

import {
  INSTALL_STEPS,
  SYMPTOMS,
  ADMIN_UI_ASOF,
  pasteFiles,
  uploadFiles,
  downloadFile,
  downloadZip,
  copyToClipboard,
} from '../loop/package.js';

/** 단계마다 완료 버튼에 붙일 말. 단계와 동작이 달라 한 문구로 묶으면 어색해진다. */
const DONE_LABEL = {
  open: '열었음',
  html: '붙여넣었음',
  css: '붙여넣었음',
  upload: '올렸음',
  save: '확인했음',
};

/** 도식 아래에 붙는 설명. 그림만으로는 무엇을 보라는 건지 안 보인다. */
const SCHEMATIC_CAPTION = {
  menu: '굵은 테두리가 지금 누를 곳입니다',
  'tab-html': '탭 이름은 스킨 편집 화면 위쪽에 있습니다',
  'tab-css': '탭 이름은 스킨 편집 화면 위쪽에 있습니다',
  'tab-upload': '같은 이름 파일을 먼저 삭제한 뒤 추가합니다',
};

export function mount(root, ctx) {
  const { actions, toast } = ctx;

  let at = 0;
  const done = new Set(); // 완료 표시는 화면 안에서만 들고 있는다. 새로고침 후 유지하지 않는다
  let files = null;

  root.innerHTML = `
    <div class="page wide">
      <div class="row" style="margin-bottom:12px">
        <h2 style="font-size:16px">설치</h2>
        <span class="badge" id="count"></span>
        <span class="spacer"></span>
        <button id="zip">ZIP 받기</button>
        <button id="back">작업으로 돌아가기</button>
      </div>

      <div class="split">
        <div class="panel">
          <div class="panel-head">할 일 <span class="spacer"></span><span class="plain">눌러서 아무 단계나 갈 수 있습니다</span></div>
          <div class="panel-body scroll" id="todo"></div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <span id="right-head">티스토리 관리자</span>
            <span class="spacer"></span>
            <span class="badge plain">${esc(ADMIN_UI_ASOF)} 기준</span>
          </div>
          <div class="panel-body" id="right"></div>
        </div>
      </div>
    </div>`;

  const $ = (id) => root.querySelector('#' + id);

  $('back').addEventListener('click', () => actions.go('W1'));
  $('zip').addEventListener('click', () => {
    if (!files) return;
    downloadZip(files);
    toast('ZIP 을 받았습니다. 보관용이라 이것만 올려서는 설치되지 않습니다');
  });

  /* ---------------------------------------------------------- 왼쪽 */

  function drawTodo() {
    const step = INSTALL_STEPS[at];
    const box = $('todo');

    box.innerHTML =
      `<div class="card selected">
        <div style="font-weight:600;margin-bottom:4px">${at + 1}. ${esc(step.title)}</div>
        <p class="small dim" style="margin:0 0 8px">${esc(step.body)}</p>
        ${step.path ? pathBox(step.path) : ''}
        <div class="row" style="margin-top:8px" id="acts"></div>
        ${step.id === 'upload' ? uploadExtra() : ''}
        ${step.warning ? `<div class="note bad small" style="margin-top:8px">${esc(step.warning)}</div>` : ''}
      </div>
      <ul class="list" style="margin-top:12px" id="steps"></ul>
      <div class="note small" style="margin-top:12px">
        <h3>ZIP 은 보관용입니다</h3>
        <p>받아 둔 ZIP 을 티스토리에 그대로 올릴 수는 없습니다. 나중에 같은 스킨을 다시 설치할 때 이 절차를 반복하는 데 씁니다.</p>
        <p><span class="mono">index.xml</span> 은 스킨을 새로 등록할 때만 필요합니다.</p>
      </div>`;

    drawActions(step);
    drawStepList();
  }

  /** 지금 단계에서 누를 것. 복사, 받기, 완료 순으로 둔다. */
  function drawActions(step) {
    const acts = $('acts');

    if (step.copy) {
      const f = pasteFiles(files).find((x) => x.name === step.copy);
      const b = document.createElement('button');
      b.textContent = `${step.copy} 복사`;
      b.disabled = !f || !f.content;
      b.addEventListener('click', async () => {
        const ok = await copyToClipboard(f.content);
        toast(ok ? `${step.copy} 를 복사했습니다` : '복사가 막혔습니다. 직접 선택해 복사하세요', ok ? 'info' : 'bad');
      });
      acts.append(b);
    }

    if (step.download) {
      for (const f of uploadFiles(files)) {
        const b = document.createElement('button');
        b.textContent = `${f.basename} 받기`;
        b.disabled = !f.content;
        b.addEventListener('click', () => {
          downloadFile(f.name, f.content, 'text/javascript;charset=utf-8');
          toast(`${f.basename} 를 받았습니다`);
        });
        acts.append(b);
      }
    }

    const d = document.createElement('button');
    d.className = 'primary';
    d.textContent = DONE_LABEL[step.id] || '완료';
    d.addEventListener('click', () => {
      done.add(step.id);
      if (at < INSTALL_STEPS.length - 1) at += 1;
      draw();
    });
    acts.append(d);
  }

  /** 다섯 단계를 항상 띄워 둔다. 지금 어디쯤인지 알아야 한다. 다음 단계를 잠그지는 않는다. */
  function drawStepList() {
    const ul = $('steps');
    INSTALL_STEPS.forEach((s, i) => {
      const li = document.createElement('li');
      li.style.cursor = 'pointer';
      const now = i === at;
      li.innerHTML =
        `<span${now ? ' style="font-weight:600"' : ' class="dim"'}>${i + 1}. ${esc(s.title)}</span>` +
        (done.has(s.id) ? ' <span class="badge">완료</span>' : '');
      li.addEventListener('click', () => {
        at = i;
        draw();
      });
      ul.append(li);
    });
  }

  /** 가장 많이 빠뜨리는 단계라 파일 목록과 주의를 따로 크게 적는다. */
  function uploadExtra() {
    const rows = uploadFiles(files)
      .map(
        (f) =>
          `<div class="card" style="padding:8px">
            <div class="row"><span class="mono">${esc(f.basename)}</span>
            <span class="spacer"></span>
            <span class="tiny dim">${esc(f.content ? bytes(f.content) : '내용 없음')}</span></div>
            <div class="tiny dim" style="margin-top:2px">${esc(f.note || f.label)}</div>
          </div>`,
      )
      .join('');

    return (
      `<div style="margin-top:8px">${rows}</div>` +
      `<div class="card dashed small" style="margin-top:8px">
        <p style="margin:0 0 4px"><strong>덮어쓰기가 안 되는 경우가 있습니다.</strong></p>
        <p style="margin:0">파일업로드 탭에서 같은 이름 파일을 먼저 <strong>삭제</strong>한 뒤 새로 추가하세요.
        지우지 않고 올리면 고친 것이 반영되지 않고 예전 모습 그대로입니다.</p>
      </div>`
    );
  }

  /* ---------------------------------------------------------- 오른쪽 */

  function drawRight() {
    const step = INSTALL_STEPS[at];
    const box = $('right');

    // 마지막 단계에는 누를 곳이 없다. 대신 잘 된 모습과 빠뜨렸을 때를 대조시킨다
    if (!step.highlight) {
      $('right-head').textContent = '저장하고 확인';
      box.innerHTML = compare();
      return;
    }

    $('right-head').textContent = '티스토리 관리자';
    box.innerHTML =
      admin(step.highlight) +
      `<p class="small dim" style="margin:8px 0 0">${esc(SCHEMATIC_CAPTION[step.highlight] || '')}</p>` +
      mismatch(step.path) +
      `<p class="tiny dim" style="margin:8px 0 0">티스토리 관리자는 데스크탑에서 하는 편이 쉽습니다</p>`;
  }

  /** 그림이 틀렸을 때의 대처. 도식을 그리는 한 이 안내가 늘 붙어 있어야 한다. */
  function mismatch(path) {
    return `<div class="note small" style="margin-top:12px">
      <h3>화면이 그림과 다른가요</h3>
      <p>티스토리가 관리자 화면을 바꿨을 수 있습니다. 그림 대신 메뉴 경로로 찾아가세요.</p>
      <p class="mono">${esc(path || INSTALL_STEPS[0].path)}</p>
      <p class="tiny dim">그림은 ${esc(ADMIN_UI_ASOF)} 기준입니다. 달라진 점을 알려주시면 고칩니다.</p>
    </div>`;
  }

  /** 저장 뒤 대조용 그림과 증상 목록. 증상을 미리 알아야 나중에 스스로 원인을 찾는다. */
  function compare() {
    return (
      `<p class="small" style="margin:0 0 12px">저장한 뒤 블로그를 새로고침하고 아래와 대조해 보세요.</p>` +
      `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px">
        <div class="card">
          <div class="small" style="font-weight:600;margin-bottom:8px">잘 된 모습</div>
          ${miniGood()}
        </div>
        <div class="card">
          <div class="small" style="font-weight:600;margin-bottom:8px">파일 올리기를 빠뜨렸을 때</div>
          ${miniBroken()}
          <p class="tiny dim" style="margin:6px 0 0">4단계로 돌아가세요</p>
        </div>
      </div>` +
      `<div class="note small" style="margin-top:12px">
        <h3>이렇게 보이면 어디를 빠뜨린 것입니다</h3>
        <ul class="list">
          ${SYMPTOMS.map(
            (s) =>
              `<li><strong>${esc(s.when)}</strong><br><span class="dim">${esc(s.looks)}</span><br>${esc(s.fix)}</li>`,
          ).join('')}
        </ul>
      </div>`
    );
  }

  /* ---------------------------------------------------------- 그리기 */

  function draw() {
    $('count').textContent = `${at + 1} / ${INSTALL_STEPS.length}`;
    drawTodo();
    drawRight();
  }

  return {
    update(state) {
      // 만든 파일이 없으면 설치할 것도 없다. 작업 화면으로 돌려보낸다
      if (!state.files) {
        actions.go('W1');
        return;
      }
      if (state.files !== files) {
        files = state.files;
        draw();
      }
    },
  };
}

/** 메뉴 경로. 도식이 틀려도 이 문자열로 찾아갈 수 있어야 한다. */
function pathBox(path) {
  return `<div class="card dashed" style="padding:8px">
    <div class="tiny dim">메뉴 경로</div>
    <span class="mono small">${esc(path)}</span>
  </div>`;
}

/* ------------------------------------------------------------ 관리자 도식 */

/*
 * 남의 화면이라 세부를 그릴수록 빨리 틀린다. 위치 관계와 탭 이름만 남기고
 * 버튼 모양이나 색은 그리지 않는다. shell.css 에 도식용 클래스가 없어
 * 이 부분만 인라인 style 을 쓴다.
 */

const CELL = 'border:1px solid var(--border);border-radius:3px';

function frame(inner) {
  return `<div style="${CELL};background:var(--bg);padding:8px;font-size:11px">
    <div style="${CELL};padding:2px 6px;margin-bottom:8px;color:var(--dim)">관리자</div>
    ${inner}
  </div>`;
}

/** 지금 누를 곳에 굵은 테두리. 그것 하나만 강조한다. */
function pick(on) {
  return on
    ? 'border:2px solid var(--text);font-weight:600'
    : 'border:1px solid var(--border);color:var(--dim)';
}

function tabs(active) {
  return (
    `<div class="row" style="gap:4px;margin-bottom:8px">` +
    [
      ['HTML', 'tab-html'],
      ['CSS', 'tab-css'],
      ['파일업로드', 'tab-upload'],
    ]
      .map(([label, id]) => `<span style="padding:3px 7px;border-radius:3px;${pick(active === id)}">${label}</span>`)
      .join('') +
    `</div>`
  );
}

function admin(highlight) {
  if (highlight === 'menu') {
    const menu = ['콘텐츠', '꾸미기', '플러그인', '관리']
      .map(
        (m) =>
          `<div style="padding:2px 5px;margin-bottom:3px;border-radius:3px;${pick(m === '꾸미기')}">${m}</div>`,
      )
      .join('');
    return frame(
      `<div style="display:flex;gap:8px;align-items:stretch">
        <div style="flex:0 0 84px">${menu}</div>
        <div style="flex:1;${CELL};background:var(--surface);color:var(--dim);
          display:flex;align-items:center;justify-content:center;text-align:center;padding:8px;min-height:110px">
          꾸미기를 누르면<br>스킨 편집이 나옵니다
        </div>
      </div>`,
    );
  }

  if (highlight === 'tab-upload') {
    return frame(
      tabs(highlight) +
        `<div style="${CELL};padding:8px;min-height:110px">
          <div class="tiny dim" style="margin-bottom:6px">올라간 파일</div>
          <div class="row" style="border-bottom:1px solid var(--border);padding-bottom:4px">
            <span class="mono">script.js</span>
            <span class="spacer"></span>
            <span style="padding:0 5px;border-radius:3px;border:2px solid var(--text)">삭제</span>
          </div>
          <div style="margin-top:8px;padding:8px;text-align:center;color:var(--dim);
            border:1px dashed var(--border);border-radius:3px">파일 추가</div>
        </div>`,
    );
  }

  return frame(
    tabs(highlight) +
      `<div style="${CELL};background:var(--surface);color:var(--dim);min-height:110px;
        display:flex;align-items:center;justify-content:center">편집칸</div>`,
  );
}

/* ------------------------------------------------------------ 결과 그림 */

function bar(width, color = 'var(--border)', h = 4) {
  return `<div style="height:${h}px;width:${width};background:${color};border-radius:1px;margin-bottom:4px"></div>`;
}

function miniGood() {
  return `<div style="${CELL};background:var(--bg);padding:6px">
    <div style="display:flex;gap:4px;align-items:center;padding-bottom:5px;margin-bottom:6px;border-bottom:1px solid var(--border)">
      <div style="height:5px;width:24%;background:var(--text);border-radius:1px"></div>
    </div>
    <div style="display:flex;gap:6px;align-items:flex-start">
      <div style="flex:0 0 28%;background:var(--surface);border-radius:2px;padding:4px">
        ${bar('70%')}${bar('90%')}${bar('60%')}
      </div>
      <div style="flex:1;min-width:0">
        ${bar('80%', 'var(--text)')}${bar('100%')}${bar('55%')}
        ${bar('80%', 'var(--text)')}${bar('100%')}
      </div>
    </div>
  </div>`;
}

function miniBroken() {
  return `<div style="${CELL};background:var(--bg);padding:6px">
    <div style="${CELL};padding:2px 4px;margin-bottom:5px;color:var(--dim);font-size:10px">제목</div>
    <div class="tiny dim" style="line-height:1.5">
      사이드바 내용<br>카테고리<br>글 목록<br>전부 세로로 흘러내림
    </div>
  </div>`;
}

/* ------------------------------------------------------------ 도구 */

function bytes(text) {
  const n = new Blob([text]).size;
  return n < 1024 ? `${n} B` : `${Math.round(n / 1024)} KB`;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
