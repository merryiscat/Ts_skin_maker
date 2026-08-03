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
 *
 * 자리 배치
 *   왼쪽 대화   지금 할 일 하나와 누를 버튼. 다섯 단계 목록은 그 아래
 *   캔버스      티스토리 관리자 도식. 마지막 단계에서는 결과 대조 그림
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
  const { actions, toast, panes } = ctx;

  let at = 0;
  const done = new Set(); // 완료 표시는 화면 안에서만 들고 있는다. 새로고침 후 유지하지 않는다
  let files = null;

  panes.foot.innerHTML = `
    <div class="composer">
      <input type="text" placeholder="다 끝났습니다" disabled>
      <div class="row">
        <button class="sm" id="back">작업으로 돌아가기</button>
        <span class="spacer"></span>
        <button class="primary sm" id="zip">ZIP 받기</button>
      </div>
    </div>`;

  const $ = (id) =>
    root.querySelector('#' + id) ||
    panes.foot.querySelector('#' + id) ||
    panes.canvasHead.querySelector('#' + id) ||
    panes.canvasBody.querySelector('#' + id);

  $('back').addEventListener('click', () => actions.go('W1'));
  $('zip').addEventListener('click', () => {
    if (!files) return;
    downloadZip(files);
    toast('ZIP 을 받았습니다. 보관용이라 이것만 올려서는 설치되지 않습니다');
  });

  /* ---------------------------------------------------------- 왼쪽 대화 */

  function drawTodo() {
    const step = INSTALL_STEPS[at];

    root.innerHTML =
      `<div class="msg">
        <div class="msg-role">${at + 1} / ${INSTALL_STEPS.length}</div>
        <div class="msg-body">
          <span class="strong">${esc(step.title)}</span>
          <p class="small dim" style="margin:4px 0 8px">${esc(step.body)}</p>
          ${step.path ? `<div class="path">${esc(step.path)}</div>` : ''}
          <div class="msg-actions" id="acts"></div>
          ${step.id === 'upload' ? uploadExtra() : ''}
          ${step.warning ? `<p class="tiny" style="margin:8px 0 0;color:var(--danger)">${esc(step.warning)}</p>` : ''}
        </div>
      </div>

      <div class="msg sys">
        <div class="msg-body">
          <span class="strong">다섯 단계</span>
          <ul class="list" id="steps" style="margin-top:6px"></ul>
        </div>
      </div>

      <div class="msg sys">
        <div class="msg-body">
          <span class="strong">ZIP 은 보관용입니다</span>
          <p class="small" style="margin:4px 0 0">받아 둔 ZIP 을 티스토리에 그대로 올릴 수는 없습니다. 나중에 같은 스킨을 다시 설치할 때 이 절차를 반복하는 데 씁니다.</p>
          <p class="tiny dim" style="margin:4px 0 0"><span class="token">index.xml</span> 은 스킨을 새로 등록할 때만 필요합니다.</p>
        </div>
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
      b.className = 'sm';
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
        b.className = 'sm';
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
    d.className = 'primary sm';
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
        `<span${now ? ' class="strong"' : ' class="dim"'}>${i + 1}. ${esc(s.title)}</span>` +
        (done.has(s.id) ? ' <span class="badge ok">완료</span>' : '');
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
          `<div>
            <span class="token">${esc(f.basename)}</span>
            <span class="spacer"></span>
            <span class="tiny dim">${esc(f.content ? bytes(f.content) : '내용 없음')}</span>
          </div>`,
      )
      .join('');

    return (
      `<div class="admin-files" style="margin-top:8px">${rows}</div>` +
      `<div class="card dashed" style="margin-top:8px">
        <p class="small" style="margin:0 0 4px"><span class="strong">덮어쓰기가 안 되는 경우가 있습니다.</span></p>
        <p class="small" style="margin:0">파일업로드 탭에서 같은 이름 파일을 먼저 <span class="strong">삭제</span>한 뒤 새로 추가하세요.
        지우지 않고 올리면 고친 것이 반영되지 않고 예전 모습 그대로입니다.</p>
      </div>`
    );
  }

  /* ---------------------------------------------------------- 오른쪽 */

  function drawRight() {
    const step = INSTALL_STEPS[at];

    // 마지막 단계에는 누를 곳이 없다. 대신 잘 된 모습과 빠뜨렸을 때를 대조시킨다
    if (!step.highlight) {
      panes.canvasHead.innerHTML =
        '<span class="badge">저장하고 확인</span><span class="spacer"></span>' +
        `<span>${esc(ADMIN_UI_ASOF)} 기준</span>`;
      panes.canvasBody.innerHTML = compare();
      return;
    }

    panes.canvasHead.innerHTML =
      '<span class="badge">티스토리 관리자</span><span class="spacer"></span>' +
      `<span>${esc(ADMIN_UI_ASOF)} 기준 · 데스크탑에서 하는 편이 쉽습니다</span>`;

    panes.canvasBody.innerHTML =
      `<div style="max-width:560px">` +
      admin(step.highlight) +
      `<p class="small dim" style="margin:8px 0 0">${esc(SCHEMATIC_CAPTION[step.highlight] || '')}</p>` +
      mismatch(step.path) +
      `</div>`;
  }

  /** 그림이 틀렸을 때의 대처. 도식을 그리는 한 이 안내가 늘 붙어 있어야 한다. */
  function mismatch(path) {
    return `<div class="card dashed" style="margin-top:16px">
      <span class="strong">화면이 그림과 다른가요</span>
      <p class="small" style="margin:4px 0">티스토리가 관리자 화면을 바꿨을 수 있습니다. 그림 대신 메뉴 경로로 찾아가세요.</p>
      <div class="path">${esc(path || INSTALL_STEPS[0].path)}</div>
      <p class="tiny dim" style="margin:6px 0 0">그림은 ${esc(ADMIN_UI_ASOF)} 기준입니다. 달라진 점을 알려주시면 고칩니다.</p>
    </div>`;
  }

  /** 저장 뒤 대조용 그림과 증상 목록. 증상을 미리 알아야 나중에 스스로 원인을 찾는다. */
  function compare() {
    return (
      `<p class="small" style="margin:0 0 14px">저장한 뒤 블로그를 새로고침하고 아래와 대조해 보세요.</p>` +
      `<div class="split">
        <div>
          <div class="eyebrow" style="margin-bottom:8px">잘 된 모습</div>
          ${miniGood()}
        </div>
        <div>
          <div class="eyebrow" style="margin-bottom:8px">파일 올리기를 빠뜨렸을 때</div>
          ${miniBroken()}
          <p class="tiny dim" style="margin:6px 0 0">4단계로 돌아가세요</p>
        </div>
      </div>` +
      `<div class="card" style="margin-top:16px">
        <span class="strong">이렇게 보이면 어디를 빠뜨린 것입니다</span>
        <ul class="list" style="margin-top:6px">
          ${SYMPTOMS.map(
            (s) =>
              `<li><span class="strong">${esc(s.when)}</span><br><span class="dim small">${esc(s.looks)}</span><br><span class="small">${esc(s.fix)}</span></li>`,
          ).join('')}
        </ul>
      </div>`
    );
  }

  /* ---------------------------------------------------------- 그리기 */

  function draw() {
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

/* ------------------------------------------------------------ 관리자 도식 */

/*
 * 남의 화면이라 세부를 그릴수록 빨리 틀린다. 위치 관계와 탭 이름만 남기고
 * 버튼 모양이나 색은 그리지 않는다. 클래스는 design.css 의 .admin 계열이고,
 * 지금 누를 곳에는 .now 를 붙인다(굵은 테두리와 꺾쇠 표시가 붙는다).
 */

function admin(highlight) {
  if (highlight === 'menu') {
    const menu = ['콘텐츠', '꾸미기', '플러그인', '관리']
      .map((m) => `<span${m === '꾸미기' ? ' class="now"' : ''}>${m}</span>`)
      .join('');
    return `<div class="admin">
      <div class="admin-top">관리자</div>
      <div class="admin-row">
        <div class="admin-nav">${menu}</div>
        <div class="admin-body">
          <div class="admin-canvas">꾸미기를 누르면<br>스킨 편집이 나옵니다</div>
        </div>
      </div>
    </div>`;
  }

  if (highlight === 'tab-upload') {
    return `<div class="admin">
      <div class="admin-top">스킨 편집</div>
      <div class="admin-body">
        ${tabs(highlight)}
        <div class="admin-canvas" style="display:block;text-align:left">
          <div class="eyebrow" style="margin-bottom:6px">올라간 파일</div>
          <div class="admin-files">
            <div><span class="token">script.js</span><span class="spacer"></span><span class="now">삭제</span></div>
          </div>
          <div class="admin-drop">파일 추가</div>
        </div>
      </div>
    </div>`;
  }

  return `<div class="admin">
    <div class="admin-top">스킨 편집</div>
    <div class="admin-body">
      ${tabs(highlight)}
      <div class="admin-canvas">편집칸</div>
    </div>
  </div>`;
}

function tabs(active) {
  return (
    '<div class="admin-tabs">' +
    [
      ['HTML', 'tab-html'],
      ['CSS', 'tab-css'],
      ['파일업로드', 'tab-upload'],
    ]
      .map(([label, id]) => `<span${active === id ? ' class="now"' : ''}>${label}</span>`)
      .join('') +
    '</div>'
  );
}

/* ------------------------------------------------------------ 결과 그림 */

/*
 * 설치가 제대로 됐는지 눈으로 대조하는 그림 둘. 스킨 도식(ui/schematic.js)과
 * 달리 "깨진 모습"을 그려야 해서 여기서만 쓰는 마크업을 따로 둔다.
 */

function miniGood() {
  return `<div class="shot">
    <div class="shot-bar"><i class="w"></i><u></u><b></b></div>
    <div class="shot-row">
      <div class="shot-side"><div class="avatar"></div><l class="xs"></l><l class="s"></l><l class="s"></l></div>
      <div class="shot-col">
        <div class="item"><l class="t"></l><l></l><l class="s"></l></div>
        <div class="item"><l class="t2"></l><l></l></div>
      </div>
    </div>
  </div>`;
}

function miniBroken() {
  return `<div class="shot">
    <div class="shot-bar"><i class="w"></i><u></u></div>
    <div class="shot-col">
      <l class="t"></l><l class="s"></l><l class="t2"></l><l></l><l class="s"></l><l class="t"></l>
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
