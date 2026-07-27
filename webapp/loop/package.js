/**
 * 산출물 묶기
 *
 * 완성된 스킨을 사용자가 가져갈 수 있는 형태로 만든다.
 *
 * 여기서 분명히 해 둘 것이 있다. **ZIP 만으로는 설치가 되지 않는다.**
 * 티스토리는 스킨 압축 파일을 올리는 경로를 주지 않는다. skin.html 과 style.css 는
 * 스킨 편집 화면에 붙여넣고, images 아래 파일은 파일업로드 탭에서 따로 올려야 한다.
 * ZIP 은 보관용이고, 실제 설치는 D1 화면의 절차를 따라야 한다.
 *
 * 이 사실을 사용자에게 말하지 않으면 받아 두고 왜 안 되는지 모른 채 끝난다.
 */

/** 스킨을 이루는 파일 목록. 설치 방법이 파일마다 다르므로 그것도 같이 적는다. */
export const FILE_ROLES = {
  'skin.html': {
    where: 'editor',
    tab: 'HTML',
    label: '스킨 편집 화면의 HTML 탭에 붙여넣기',
    required: true,
  },
  'style.css': {
    where: 'editor',
    tab: 'CSS',
    label: '스킨 편집 화면의 CSS 탭에 붙여넣기',
    required: true,
  },
  'images/script.js': {
    where: 'upload',
    tab: '파일업로드',
    label: '파일업로드 탭에서 올리기',
    required: true,
    note: '같은 이름 파일을 먼저 지우고 올릴 것',
  },
  'index.xml': {
    where: 'register',
    tab: null,
    label: '스킨을 새로 등록할 때만 필요',
    required: false,
  },
};

/** 붙여넣을 파일. D1 이 복사 버튼을 다는 대상. */
export function pasteFiles(files) {
  return Object.entries(FILE_ROLES)
    .filter(([, r]) => r.where === 'editor')
    .map(([name, r]) => ({ name, tab: r.tab, label: r.label, content: files[name] || '' }));
}

/** 업로드할 파일. D1 이 개별 받기 버튼을 다는 대상. */
export function uploadFiles(files) {
  return Object.entries(FILE_ROLES)
    .filter(([, r]) => r.where === 'upload')
    .map(([name, r]) => ({
      name,
      basename: name.split('/').pop(),
      label: r.label,
      note: r.note,
      content: files[name] || '',
    }));
}

/**
 * 설치 절차. D1 이 이 배열을 그대로 그린다.
 *
 * 화면 도식은 티스토리 관리자 화면을 흉내 낸 것이라 티스토리가 UI 를 바꾸면 틀린다.
 * 그래서 단계마다 `path` 를 같이 둔다. 그림이 틀려도 메뉴 경로로 찾아갈 수 있다.
 */
export const INSTALL_STEPS = [
  {
    id: 'open',
    title: '스킨 편집 열기',
    body: '티스토리 관리자에서 스킨 편집 화면으로 갑니다.',
    path: '꾸미기 - 스킨 편집 - html 편집',
    highlight: 'menu',
  },
  {
    id: 'html',
    title: 'HTML 붙여넣기',
    body: '기존 내용을 전부 지우고 붙여넣습니다.',
    path: 'HTML 탭',
    highlight: 'tab-html',
    copy: 'skin.html',
  },
  {
    id: 'css',
    title: 'CSS 붙여넣기',
    body: 'CSS 탭으로 옮겨 같은 방식으로 붙여넣습니다.',
    path: 'CSS 탭',
    highlight: 'tab-css',
    copy: 'style.css',
  },
  {
    id: 'upload',
    title: '파일 올리기',
    body: '파일업로드 탭에서 기존 파일을 지우고 새로 올립니다. 덮어쓰기가 안 되는 경우가 있습니다.',
    path: '파일업로드 탭',
    highlight: 'tab-upload',
    download: 'images/script.js',
    warning: '이 단계를 빠뜨리면 목록과 사이드바가 겹쳐 보이고 메뉴가 열리지 않습니다.',
  },
  {
    id: 'save',
    title: '저장하고 확인',
    body: '저장한 뒤 블로그를 새로고침하고 화면을 확인합니다.',
    path: null,
    highlight: null,
  },
];

/** 도식이 어느 시점 기준인지. 티스토리가 관리자 화면을 바꾸면 이 날짜가 근거가 된다. */
export const ADMIN_UI_ASOF = '2026-07';

/** 설치가 잘못됐을 때의 증상. 원인을 스스로 찾을 수 있게 미리 알려 준다. */
export const SYMPTOMS = [
  {
    id: 'missing-upload',
    when: '파일 올리기를 빠뜨렸을 때',
    looks: '사이드바 내용과 글 목록이 전부 세로로 흘러내리고 메뉴 버튼이 열리지 않습니다.',
    fix: '4단계 파일 올리기로 돌아가세요.',
  },
  {
    id: 'missing-css',
    when: 'CSS 를 붙여넣지 않았을 때',
    looks: '글자만 있는 문서처럼 보이고 색과 여백이 전혀 없습니다.',
    fix: '3단계 CSS 붙여넣기로 돌아가세요.',
  },
  {
    id: 'stale-file',
    when: '같은 이름 파일을 지우지 않고 올렸을 때',
    looks: '고친 것이 반영되지 않고 예전 모습 그대로입니다.',
    fix: '파일업로드 탭에서 기존 파일을 지우고 다시 올리세요.',
  },
];

/** 파일 하나를 내려받게 한다. */
export function downloadFile(name, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  triggerDownload(blob, name.split('/').pop());
}

/** 클립보드에 복사한다. 보안 컨텍스트가 아니면 옛 방식으로 넘어간다. */
export async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 권한이 없거나 사용자 제스처가 아닌 경우. 아래로 넘어간다
    }
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  let okFlag = false;
  try {
    okFlag = document.execCommand('copy');
  } catch {
    okFlag = false;
  }
  document.body.removeChild(ta);
  return okFlag;
}

/**
 * ZIP 을 만든다.
 *
 * 압축하지 않고 저장(stored)만 한다. 스킨 파일은 다 합쳐도 100KB 안팎이라
 * 압축 이득이 거의 없는데, deflate 를 직접 구현하려면 코드가 몇 배로 늘어난다.
 * 라이브러리를 하나 끼워 넣는 것보다 이쪽이 낫다고 봤다.
 * 저장 방식 ZIP 은 표준이라 어느 압축 프로그램에서나 열린다.
 */
/*
   ZIP 항목의 DOS 날짜/시간.
   0x0000 을 그대로 두면 "1980년 0월 0일" 이 되는데 월/일 0 은 규격상 무효한 값이라
   일부 압축 도구가 이상하게 표시하거나 거부할 수 있다. 그렇다고 Date.now 를 쓰면
   같은 입력에서도 만들 때마다 바이트가 달라져 산출물 비교(빌드 재현성)가 깨진다.
   그래서 유효한 고정 상수 2026-01-01 00:00:00 을 쓴다.
   DOS 형식: 날짜 = (연-1980)<<9 | 월<<5 | 일, 시간 = 시<<11 | 분<<5 | 초/2
*/
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1; // 2026-01-01
const DOS_TIME = 0; // 00:00:00 (시간은 0 이 유효하다)

export function makeZip(files) {
  const enc = new TextEncoder();
  const entries = [];
  let offset = 0;
  const chunks = [];

  for (const [name, content] of Object.entries(files)) {
    const nameBytes = enc.encode(name);
    const data = typeof content === 'string' ? enc.encode(content) : content;
    const crc = crc32(data);

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); // 로컬 헤더 서명
    lv.setUint16(4, 20, true); // 필요 버전
    lv.setUint16(6, 0x0800, true); // 파일명 UTF-8 표시
    lv.setUint16(8, 0, true); // 압축 없음
    lv.setUint16(10, DOS_TIME, true); // 시간 (고정, 위 주석 참고)
    lv.setUint16(12, DOS_DATE, true); // 날짜 (고정, 위 주석 참고)
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);

    chunks.push(local, data);
    entries.push({ nameBytes, crc, size: data.length, offset });
    offset += local.length + data.length;
  }

  const centralStart = offset;
  for (const e of entries) {
    const central = new Uint8Array(46 + e.nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); // 중앙 디렉터리 서명
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, DOS_TIME, true); // 시간 (로컬 헤더와 같은 고정값)
    cv.setUint16(14, DOS_DATE, true); // 날짜 (로컬 헤더와 같은 고정값)
    cv.setUint32(16, e.crc, true);
    cv.setUint32(20, e.size, true);
    cv.setUint32(24, e.size, true);
    cv.setUint16(28, e.nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, e.offset, true);
    central.set(e.nameBytes, 46);
    chunks.push(central);
    offset += central.length;
  }

  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); // 끝 레코드 서명
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, offset - centralStart, true);
  ev.setUint32(16, centralStart, true);
  chunks.push(end);

  return chunks;
}

/** ZIP 을 만들어 내려받게 한다. 브라우저 전용. */
export function downloadZip(files, filename = 'tistory-skin.zip') {
  const blob = new Blob(makeZip(files), { type: 'application/zip' });
  triggerDownload(blob, filename);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 클릭 직후 바로 해제하면 일부 브라우저에서 저장이 취소된다
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

let CRC_TABLE = null;

function crc32(bytes) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[i] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
