/**
 * 와이어프레임 안전 소독 + 티스토리 실현가능성 린트
 *
 * P1 이 모델에게 자유 와이어 HTML 을 짓게 하면서 두 보증이 사라진다.
 *
 *   1. 안전 - 예전엔 고정 렌더러가 그려서 모델 HTML 을 화면에 넣을 일이 없었다.
 *             이제 모델 HTML 을 iframe 에 넣으므로 소독이 필요하다(sanitizeWireHtml).
 *             theme-prompt.js 의 sanitizeThemeCss 와 같은 계열이다.
 *   2. 실현가능성 - 예전 15칸 팔레트는 전부 티스토리가 줄 수 있는 것뿐이었다. 자유
 *             생성은 "조회수 정렬" 처럼 티스토리가 데이터를 안 주는 화면을 그릴 수
 *             있다. 고르고 나서 P2 가 실현 못 하면 헛약속이 된다(lintWireFeasibility).
 *
 * 계약서(contract.js)의 auditPlaceholders/auditGroupTags 는 치환자가 박힌 완성
 * skin.html 전용이라, 치환자 없는 와이어에는 못 쓴다. 그래서 와이어용 기능 린트를
 * 따로 둔다. red-flag 의 근거는 새로 만들지 않고 contract.js / pitfalls.js 에서 가져온다.
 */

/* --------------------------------------------------------- 소독 */

/**
 * 와이어 HTML 을 iframe 에 넣기 전에 위험한 조각을 걷어낸다.
 * iframe 은 sandbox 로 한 번 더 막지만(스크립트 실행 차단), 이중으로 막는다.
 */
export function sanitizeWireHtml(html) {
  let s = String(html || '');
  // 스크립트/스타일/링크/프레임 통째로 제거
  s = s.replace(/<\s*(script|style|link|iframe|object|embed|meta|base)\b[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, '');
  s = s.replace(/<\s*(script|style|link|iframe|object|embed|meta|base)\b[^>]*\/?>/gi, '');
  // on* 이벤트 핸들러 제거 (on click= 등)
  s = s.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '');
  s = s.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '');
  s = s.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '');
  // javascript: URL
  s = s.replace(/javascript:/gi, '');
  // 원격 리소스: 배경/이미지 url(), src/href 의 http(s)·프로토콜상대 URL 을 무력화
  s = s.replace(/url\(\s*['"]?\s*(?:https?:)?\/\/[^)]*\)/gi, 'none');
  s = s.replace(/\b(src|href)\s*=\s*"(?:https?:)?\/\/[^"]*"/gi, '$1="#"');
  s = s.replace(/\b(src|href)\s*=\s*'(?:https?:)?\/\/[^']*'/gi, "$1='#'");
  // 인라인 style 은 통째로 제거한다. 레이아웃은 wire kit(ui/wire.js) 클래스가 다 해결하므로,
  // 모델이 넣는 인라인 크기 조작(width:38% 등)이 렌더를 깨뜨리는 것을 막는다(fixed/absolute 도 함께).
  s = s.replace(/\sstyle\s*=\s*"[^"]*"/gi, '');
  s = s.replace(/\sstyle\s*=\s*'[^']*'/gi, '');
  return s.trim();
}

/* --------------------------------------------------------- 실현가능성 린트 */

/**
 * 티스토리가 못 주는 기능 신호.
 *
 * test 는 "와이어 텍스트 + hint + desc" 를 합친 문자열에 돌린다. why 의 근거는
 * 괄호 안 출처를 참고(계약서/함정 목록의 사실을 인용, 여기서 새로 만들지 않는다).
 */
const RED_FLAGS = [
  {
    id: 'view-count',
    // 근거: pitfalls.js no-view-count, contract.js BLACKLIST article_rep_log_cnt/view_cnt/hit
    test: /조회\s*수|조회\s*순|조회\s*[\d,]|인기\s*순|인기\s*글|많이\s*본|view\s*count|most\s*viewed/i,
    message: '조회수·인기순은 티스토리가 스킨에 조회수 데이터를 주지 않아 만들 수 없다. 이 요소를 빼라.',
  },
  {
    id: 'list-tags',
    // 근거: contract.js TAG_BLACKLIST s_article_rep_tag (목록 항목엔 태그 반복 치환자가 없다)
    test: /목록[^.\n]{0,12}(태그|해시태그)[^.\n]{0,8}(나열|표시|반복)|글\s*카드[^.\n]{0,8}태그/i,
    message: '글 목록에서 항목마다 태그를 나열하는 치환자는 없다. 태그는 글 상세에서만 낼 수 있다. 목록에서 태그를 빼라.',
  },
  {
    id: 'geo',
    // 근거: contract.js 시스템 프롬프트 "글별 지도 좌표" (데이터 없음)
    test: /지도|좌표|위치\s*정보|地圖|\bmap\b|geolocat/i,
    message: '글별 지도/좌표/위치 정보는 티스토리가 주지 않는다. 지도 요소를 빼라.',
  },
  {
    id: 'fixed-page',
    // 근거: contract.js BLACKLIST/TAG_BLACKLIST s_page_rep (페이지 기능 미지원)
    test: /고정\s*(페이지|문서)|독립\s*문서|정적\s*페이지/i,
    message: '고정 페이지(독립 문서) 기능은 현재 골격이 지원하지 않는다. 그 메뉴/영역을 빼라.',
  },
  {
    id: 'auto-meta',
    // 근거: concept-prompt.js "재료 인식" 등 티스토리가 안 주는 자동 메타
    test: /영양\s*정보|재료\s*(목록|인식|자동)|평점\s*자동|별점\s*집계/i,
    message: '재료·영양·평점 같은 자동 메타 데이터는 티스토리가 주지 않는다. 자동 집계 요소를 빼라.',
  },
];

/**
 * 와이어가 티스토리 안에서 실현 가능한지 본다.
 * @param {string} wireHtml
 * @param {{hint?:string, desc?:string, name?:string}} [meta]
 * @returns {{violations:{id:string,message:string}[]}}
 */
export function lintWireFeasibility(wireHtml, meta = {}) {
  const text = [
    stripTags(String(wireHtml || '')),
    meta.name || '',
    meta.hint || '',
    meta.desc || '',
  ].join('\n');

  const violations = [];
  for (const f of RED_FLAGS) {
    if (f.test.test(text)) violations.push({ id: f.id, message: f.message });
  }
  return { violations };
}

/** 태그를 벗겨 라벨 텍스트만 남긴다. 린트는 텍스트에만 돌린다. */
function stripTags(html) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
