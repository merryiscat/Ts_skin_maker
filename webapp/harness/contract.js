/**
 * 티스토리 치환자 계약서
 *
 * 모델이 만들어낼 수 있는 것의 경계를 정의한다. 전체 가이드(70KB)를 넣지 않고
 * 생성에 실제로 쓰이는 것만 추린다. 핵심은 세 가지다.
 *
 *   1. 화이트리스트 - 존재하는 치환자
 *   2. 스코프       - 어느 블록 안에서만 유효한지
 *   3. 블랙리스트   - 존재하지 않는데 그럴듯해서 모델이 지어내는 것
 *
 * 2번과 3번이 이 파일의 존재 이유다. 1.4.0에서 [##_article_rep_log_cnt_##]라는
 * 없는 치환자가 나왔고 라이브 확인 전까지 안 잡혔다. 1.8.0 골격에서는 공지 블록
 * 안에 article_rep_*를 쓰면 안 되고 notice_rep_*를 써야 하는데, 이건 문법적으로
 * 멀쩡해 보여서 정적 검사 없이는 티스토리에 올려야만 드러난다.
 *
 * 참고 출처: 티스토리 스킨 공식 가이드 https://tistory.github.io/document-tistory-skin/
 * (치환자의 실존 여부가 의심되면 이 문서를 기준으로 판정한다)
 */

/** 페이지 타입. body_id 값과 1:1 대응한다. */
export const PAGE_TYPES = [
  'tt-body-index',      // 홈
  'tt-body-page',       // 글 상세
  'tt-body-category',   // 카테고리 목록
  'tt-body-tag',        // 태그 목록
  'tt-body-search',     // 검색 결과
  'tt-body-guestbook',  // 방명록
  'tt-body-notice',     // 공지
];

/**
 * 스코프. 치환자가 유효한 영역을 가리킨다.
 * 'anywhere'는 skin.html 어디서나 쓸 수 있다는 뜻.
 */
export const SCOPES = {
  anywhere: '문서 전체',
  head: '<head> 안',
  article: '<s_article_rep> 안',
  list: '<s_index_article_rep> 안 (목록)',
  permalink: '<s_permalink_article_rep> 안 (상세)',
  notice: '<s_notice_rep> 안 (공지)',
  rctNotice: '<s_rct_notice> 안 (사이드바 최근 공지)',
  guestbook: '<s_guest> 안 (방명록 페이지)',
  tagPage: '<s_tag> 안 (태그 클라우드 페이지)',
  randomTags: '<s_random_tags> 안 (사이드바 태그)',
  paging: '<s_paging> 안',
  admin: '<s_ad_div> 안 (관리자에게만 렌더)',
  protectedArticle: '<s_article_protected> 안 (보호글)',
};

/**
 * 값 치환자 화이트리스트.
 * scope: 유효한 스코프 배열. 여러 개면 그중 하나에만 들어 있어도 통과.
 */
export const VALUE_PLACEHOLDERS = {
  // --- 블로그 정보 (어디서나) ---
  title:        { scope: ['anywhere'], desc: '블로그 제목' },
  desc:         { scope: ['anywhere'], desc: '블로그 설명' },
  blogger:      { scope: ['anywhere'], desc: '블로그 소유자 필명' },
  image:        { scope: ['anywhere'], desc: '블로그 대표 이미지 URL' },
  blog_image:   { scope: ['anywhere'], desc: '대표 이미지를 감싼 IMG 태그 전체' },

  // --- URL ---
  blog_link:      { scope: ['anywhere'], desc: '블로그 메인 URL' },
  rss_url:        { scope: ['anywhere'], desc: 'RSS 피드 URL' },
  taglog_link:    { scope: ['anywhere'], desc: '태그 클라우드 페이지 URL' },
  guestbook_link: { scope: ['anywhere'], desc: '방명록 페이지 URL' },

  // --- 페이지 정보 ---
  page_title: { scope: ['anywhere'], desc: '현재 페이지 제목 (SEO용)' },
  body_id:    { scope: ['anywhere'], desc: '페이지 타입 ID. body 태그의 id에만 쓸 것' },
  blog_menu:  { scope: ['anywhere'], desc: '블로그 메뉴 리스트 (자동 생성)' },

  // --- 사이드바 자동 생성 블록 ---
  category_list:       { scope: ['anywhere'], desc: '카테고리 트리 전체 (자동 생성)' },
  recent_article:      { scope: ['anywhere'], desc: '최근 글 목록 (자동 생성)' },
  recent_comment:      { scope: ['anywhere'], desc: '최근 댓글 목록 (자동 생성)' },
  recent_notice:       { scope: ['anywhere'], desc: '최근 공지 목록 (자동 생성)' },
  subscription_button: { scope: ['anywhere'], desc: '구독 버튼. 비로그인 방문자에게만 렌더됨' },

  // --- 목록 페이지 헤더 ---
  list_conform: { scope: ['anywhere'], desc: '카테고리 이름 또는 검색어. s_list 안에서 쓸 것' },
  list_count:   { scope: ['anywhere'], desc: '해당 글 개수. s_list 안에서 쓸 것' },

  // --- 글 (목록/상세 공통) ---
  article_rep_link:          { scope: ['article', 'list', 'permalink'], desc: '글 URL' },
  article_rep_title:         { scope: ['article', 'list', 'permalink'], desc: '글 제목' },
  article_rep_category:      { scope: ['article', 'list', 'permalink'], desc: '카테고리 이름' },
  article_rep_category_link: { scope: ['article', 'list', 'permalink'], desc: '카테고리 URL' },
  article_rep_date:          { scope: ['article', 'list', 'permalink'], desc: '발행 일시 (yyyy. m. d. HH:MM)' },
  article_rep_simple_date:   { scope: ['article', 'list', 'permalink'], desc: '발행 날짜 (yyyy. m. d.)' },
  article_rep_author:        { scope: ['article', 'list', 'permalink'], desc: '작성자 이름 (팀블로그)' },
  article_rep_rp_cnt:        { scope: ['article', 'list', 'permalink'], desc: '댓글 개수. s_rp_count 안에서만' },

  // 목록 전용
  article_rep_summary: { scope: ['list'], desc: '글 요약. 목록에서만 유효 (상세에서는 desc를 쓸 것)' },

  // 상세 전용
  article_rep_desc: { scope: ['permalink'], desc: '글 본문 전체. 상세에서만 유효' },
  tag_label_rep:    { scope: ['permalink'], desc: '태그 목록. s_tag_label 안에서만' },

  // 썸네일 (s_article_rep_thumbnail 안)
  article_rep_thumbnail_url:     { scope: ['article', 'list', 'permalink'], desc: '썸네일 URL. s_article_rep_thumbnail 안에서만' },
  article_rep_thumbnail_raw_url: { scope: ['article', 'list', 'permalink'], desc: '썸네일 원본 URL. s_article_rep_thumbnail 안에서만' },

  // 이전/다음 글
  article_prev_link:           { scope: ['permalink'], desc: '이전 글 URL. s_article_prev 안에서만' },
  article_prev_title:          { scope: ['permalink'], desc: '이전 글 제목. s_article_prev 안에서만' },
  article_prev_thumbnail_link: { scope: ['permalink'], desc: '이전 글 썸네일. s_article_prev_thumbnail 안에서만' },
  article_next_link:           { scope: ['permalink'], desc: '다음 글 URL. s_article_next 안에서만' },
  article_next_title:          { scope: ['permalink'], desc: '다음 글 제목. s_article_next 안에서만' },
  article_next_thumbnail_link: { scope: ['permalink'], desc: '다음 글 썸네일. s_article_next_thumbnail 안에서만' },

  // 관련 글
  article_related_rep_link:           { scope: ['permalink'], desc: '관련 글 URL. s_article_related_rep 안에서만' },
  article_related_rep_title:          { scope: ['permalink'], desc: '관련 글 제목. s_article_related_rep 안에서만' },
  article_related_rep_type:           { scope: ['permalink'], desc: 'text_type 또는 thumb_type' },
  article_related_rep_thumbnail_link: { scope: ['permalink'], desc: '관련 글 썸네일' },

  // --- 공지 (s_notice_rep 안. article_rep_*가 아니라 notice_rep_*를 써야 함) ---
  notice_rep_link:        { scope: ['notice', 'rctNotice'], desc: '공지 URL' },
  notice_rep_title:       { scope: ['notice', 'rctNotice'], desc: '공지 제목' },
  notice_rep_desc:        { scope: ['notice'], desc: '공지 본문. 공지 상세에서만' },
  notice_rep_summary:     { scope: ['notice'], desc: '공지 요약. 공지 목록에서만' },
  notice_rep_date:        { scope: ['notice'], desc: '공지 일시' },
  notice_rep_simple_date: { scope: ['notice'], desc: '공지 날짜' },

  // --- 댓글 ---
  comment_group:   { scope: ['permalink', 'notice'], desc: '글 댓글 UI. s_rp 안에서만' },
  guestbook_group: { scope: ['guestbook'], desc: '방명록 UI. s_guest 안에서만' },

  // --- 태그 ---
  tag_link:  { scope: ['tagPage', 'randomTags', 'article', 'list'], desc: '태그 URL' },
  tag_name:  { scope: ['tagPage', 'randomTags', 'article', 'list'], desc: '태그 이름' },
  tag_class: { scope: ['tagPage'], desc: '빈도별 클래스 cloud1~cloud5. 태그 페이지에서만' },
  // [##_tag_##] 은 존재하지 않는다. 공식 가이드에 없을 뿐 아니라 라이브 블로그에서
  // meta keywords 가 리터럴 그대로 출력되는 것을 확인했다(2026-07, src 1.9.0 에서 제거).
  // meta keywords 는 검색엔진이 무시한 지 오래라 대체 치환자도 두지 않는다.

  // --- 보호글 ---
  article_password: { scope: ['protectedArticle'], desc: '비밀번호 입력창의 id/name' },
  article_dissolve: { scope: ['protectedArticle'], desc: '비밀번호 확인 스크립트. onsubmit에 넣을 것' },

  // --- 페이징 (번호 텍스트) ---
  paging_rep_link_num: { scope: ['paging'], desc: '페이지 번호 텍스트' },

  // --- 관리자 영역 ---
  s_ad_m_link:    { scope: ['admin'], desc: '글 수정 링크' },
  s_ad_m_onclick: { scope: ['admin'], desc: '글 수정 온클릭' },
  s_ad_d_onclick: { scope: ['admin'], desc: '글 삭제 온클릭' },
  s_ad_s1_label:  { scope: ['admin'], desc: '현재 상태 라벨' },
  s_ad_s2_label:  { scope: ['admin'], desc: '다음 상태 라벨' },
  s_ad_s2_onclick:{ scope: ['admin'], desc: '상태 변경 온클릭' },
};

/**
 * 속성 위치 치환자.
 * href="[##_prev_page_##]"가 아니라 <a [##_prev_page_##]> 형태로 태그 속성 자리에
 * 통째로 들어간다. href로 감싸면 링크가 깨진다. 1.1.0에서 이걸 틀렸다.
 */
export const ATTRIBUTE_PLACEHOLDERS = {
  prev_page:        { scope: ['paging'], desc: '이전 페이지. <a [##_prev_page_##]> 형태' },
  next_page:        { scope: ['paging'], desc: '다음 페이지. <a [##_next_page_##]> 형태' },
  paging_rep_link:  { scope: ['paging'], desc: '페이지 번호 링크. <a [##_paging_rep_link_##]> 형태' },
  no_more_prev:     { scope: ['paging'], desc: '이전 없음 클래스. class="..." 안에 넣을 것' },
  no_more_next:     { scope: ['paging'], desc: '다음 없음 클래스. class="..." 안에 넣을 것' },
};

/**
 * 그룹 치환자 화이트리스트. <s_xxx>...</s_xxx> 형태.
 * requiresParent가 있으면 그 안에 들어 있어야 한다.
 */
export const GROUP_TAGS = {
  s_t3:                    { scope: 'anywhere', desc: '필수 최상위 래퍼. 모든 콘텐츠가 이 안에 있어야 함' },
  s_ad_div:                { scope: 'anywhere', desc: '관리자 전용 영역. head에서는 빈 태그로 광고 슬롯' },

  s_article_rep:           { scope: 'anywhere', desc: '글 공통 래퍼' },
  s_index_article_rep:     { scope: 'anywhere', requiresParent: ['s_article_rep', 's_notice_rep'], desc: '목록형 반복' },
  s_permalink_article_rep: { scope: 'anywhere', requiresParent: ['s_article_rep', 's_notice_rep', 's_article_protected'], desc: '상세 페이지' },
  s_not_index_article_rep: { scope: 'anywhere', requiresParent: ['s_article_rep'], desc: '글이 없을 때' },

  s_article_rep_thumbnail: { scope: 'anywhere', desc: '썸네일이 있을 때만' },
  s_article_rep_tag:       { scope: 'anywhere', desc: '글의 태그 반복. 목록/상세 양쪽에서 쓸 수 있다' },
  s_rp_count:              { scope: 'anywhere', desc: '댓글 수가 있을 때만' },
  s_rp:                    { scope: 'anywhere', desc: '글 댓글 영역' },
  s_tag_label:             { scope: 'anywhere', requiresParent: ['s_permalink_article_rep'], desc: '글 태그' },

  s_article_prev:          { scope: 'anywhere', desc: '이전 글' },
  s_article_next:          { scope: 'anywhere', desc: '다음 글' },
  s_article_prev_thumbnail:{ scope: 'anywhere', desc: '이전 글 썸네일' },
  s_article_next_thumbnail:{ scope: 'anywhere', desc: '다음 글 썸네일' },
  s_article_related:       { scope: 'anywhere', desc: '관련 글 래퍼' },
  s_article_related_rep:   { scope: 'anywhere', requiresParent: ['s_article_related'], desc: '관련 글 반복' },
  s_article_related_rep_thumbnail: { scope: 'anywhere', desc: '관련 글 썸네일' },

  s_list:                  { scope: 'anywhere', desc: '목록성 페이지 헤더' },
  s_list_empty:            { scope: 'anywhere', requiresParent: ['s_list'], desc: '결과 없음' },

  s_notice_rep:            { scope: 'anywhere', desc: '공지 페이지' },
  s_rct_notice:            { scope: 'anywhere', desc: '사이드바 최근 공지 래퍼' },
  s_rct_notice_rep:        { scope: 'anywhere', requiresParent: ['s_rct_notice'], desc: '최근 공지 반복' },

  s_guest:                 { scope: 'anywhere', desc: '방명록 페이지' },
  s_article_protected:     { scope: 'anywhere', desc: '보호글' },

  s_tag:                   { scope: 'anywhere', desc: '태그 클라우드 페이지' },
  s_tag_rep:               { scope: 'anywhere', requiresParent: ['s_tag'], desc: '태그 반복' },
  s_random_tags:           { scope: 'anywhere', desc: '사이드바 랜덤 태그' },

  s_paging:                { scope: 'anywhere', desc: '페이지네이션' },
  s_paging_rep:            { scope: 'anywhere', requiresParent: ['s_paging'], desc: '페이지 번호 반복' },

  s_cover_group:           { scope: 'anywhere', desc: '홈 커버 래퍼' },
  s_cover_rep:             { scope: 'anywhere', requiresParent: ['s_cover_group'], desc: '커버 반복' },
  s_cover_item:            { scope: 'anywhere', desc: '커버 아이템' },
  s_cover_item_thumbnail:  { scope: 'anywhere', desc: '커버 아이템 썸네일' },
  s_cover_item_article_info: { scope: 'anywhere', desc: '커버 아이템이 글일 때' },
};

/**
 * 스코프를 만들어내는 그룹 태그. 검증기가 위치를 판정할 때 쓴다.
 */
export const SCOPE_TAGS = {
  s_article_rep: 'article',
  s_index_article_rep: 'list',
  s_permalink_article_rep: 'permalink',
  s_notice_rep: 'notice',
  s_rct_notice: 'rctNotice',
  s_guest: 'guestbook',
  s_tag: 'tagPage',
  s_random_tags: 'randomTags',
  s_paging: 'paging',
  s_ad_div: 'admin',
  s_article_protected: 'protectedArticle',
};

/**
 * 블랙리스트. 존재하지 않는데 그럴듯해서 모델이 지어내는 치환자.
 * 이 프로젝트에서 실제로 나왔거나, 다른 블로그 플랫폼에는 있어서 혼동되는 것들.
 */
export const BLACKLIST = {
  article_rep_log_cnt:  '조회수 치환자는 존재하지 않는다. 티스토리는 스킨에 조회수를 제공하지 않으며 관리자 통계에서만 확인된다. (1.4.0에서 실제로 나온 환각)',
  article_rep_view_cnt: '위와 동일. 조회수 치환자는 없다.',
  article_rep_hit:      '위와 동일. 조회수 치환자는 없다.',
  page_rep:             '<s_page_rep>는 페이지(고정 문서) 기능용이며 현재 골격은 미지원이다. 필요해지면 골격에 먼저 추가할 것.',
  article_rep_content:  'article_rep_desc가 올바른 이름이다.',
  article_rep_excerpt:  'article_rep_summary가 올바른 이름이다.',
  category_rep_name:    '카테고리는 개별 치환자가 없고 [##_category_list_##]가 트리 전체를 자동 생성한다.',
  article_rep_comment_cnt: 'article_rep_rp_cnt가 올바른 이름이며 s_rp_count 안에서만 쓴다.',
  search_keyword:       '검색어는 s_list 안의 [##_list_conform_##]로 얻는다.',
  article_rep_modify_date: '수정일 치환자는 없다.',
};

/** 치환자 이름을 뽑는 정규식. [##_name_##] */
const PLACEHOLDER_RE = /\[##_([a-zA-Z0-9_]+)_##\]/g;

/** 스킨 변수 치환자. [##_var_이름_##] */
const VAR_RE = /^var_(.+)$/;

/**
 * HTML 주석 내용을 같은 길이의 공백으로 덮는다.
 *
 * 주석 안에서 치환자를 설명하는 것은 흔하고 정상이다. 1.8.0도 각 블록 위에
 * "[##_guestbook_group_##]: 티스토리 기본 방명록 UI" 식으로 적어 뒀다. 마스킹하지
 * 않으면 그 언급을 실제 사용으로 세어 엉뚱한 스코프 위반이 잡힌다.
 *
 * 길이를 보존하는 이유는 scopesAt(html, index) 가 원본 오프셋을 그대로 쓰기 때문이다.
 * 줄바꿈은 남겨서 오류 메시지의 줄 번호가 어긋나지 않게 한다.
 */
export function maskComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, (block) =>
    block.replace(/[^\n]/g, ' '),
  );
}

/**
 * HTML에서 쓰인 치환자 이름을 전부 뽑는다. 주석 안의 언급은 제외한다.
 * @returns {{name: string, index: number}[]}
 */
export function extractPlaceholders(html) {
  const masked = maskComments(html);
  const out = [];
  PLACEHOLDER_RE.lastIndex = 0;
  let m;
  while ((m = PLACEHOLDER_RE.exec(masked)) !== null) {
    out.push({ name: m[1], index: m.index });
  }
  return out;
}

/**
 * 치환자 이름이 스킨 변수([##_var_xxx_##])인지 판정하고 변수명을 돌려준다.
 * @returns {string|null}
 */
export function asVarName(name) {
  const m = VAR_RE.exec(name);
  return m ? m[1] : null;
}

/**
 * 조건부 변수 태그(<s_if_var_x>, <s_not_var_x>)에서 변수명을 뽑는다.
 */
export function extractVarConditionNames(html) {
  const masked = maskComments(html);
  const names = new Set();
  const re = /<s_(?:if|not)_var_([a-zA-Z0-9_]+)>/g;
  let m;
  while ((m = re.exec(masked)) !== null) names.add(m[1]);
  return [...names];
}

/**
 * 문자열 위치가 어떤 스코프 안에 있는지 판정한다.
 * 여는 태그/닫는 태그를 순서대로 훑어 스택을 만들고, 주어진 index에서의 스택을 본다.
 * @returns {string[]} 활성 스코프 목록 ('anywhere'는 항상 포함)
 */
export function scopesAt(html, index) {
  const masked = maskComments(html);
  const stack = [];
  const re = /<(\/?)(s_[a-zA-Z0-9_]+)\s*(\/?)>/g;
  let m;
  while ((m = re.exec(masked)) !== null) {
    if (m.index >= index) break;
    const isClose = m[1] === '/';
    const selfClosing = m[3] === '/';
    const tag = m[2];
    if (selfClosing) continue;
    if (isClose) {
      const at = stack.lastIndexOf(tag);
      if (at !== -1) stack.splice(at, 1);
    } else {
      stack.push(tag);
    }
  }
  const scopes = new Set(['anywhere']);
  for (const tag of stack) {
    const s = SCOPE_TAGS[tag];
    if (s) scopes.add(s);
  }

  // head 는 s_ 태그로 표현되지 않으므로 따로 판정한다.
  const headOpen = masked.search(/<head[\s>]/i);
  const headClose = masked.search(/<\/head>/i);
  if (headOpen !== -1 && index > headOpen && (headClose === -1 || index < headClose)) {
    scopes.add('head');
  }

  return [...scopes];
}

/**
 * 공지 블록(s_notice_rep) 안에서는 article_rep_* 계열을 쓰면 안 된다.
 *
 * 공지 블록 안에도 s_permalink_article_rep 이 중첩되기 때문에 스코프만 보면
 * article_rep_desc 가 통과해 버린다. 그런데 실제로는 값이 비어서 렌더된다.
 * 문법이 멀쩡해 보여서 업로드 전에는 드러나지 않는, 정확히 잡아야 할 종류다.
 */
for (const name of Object.keys(VALUE_PLACEHOLDERS)) {
  if (/^(article_rep_|article_prev_|article_next_|article_related_|tag_label_rep)/.test(name)) {
    VALUE_PLACEHOLDERS[name].forbiddenScope = ['notice'];
  }
}

/**
 * skin.html 의 치환자 사용을 계약서와 대조한다.
 * 검증기와 테스트가 같은 판정을 쓰도록 여기에 둔다.
 *
 * @returns {{unknown:string[], blacklisted:{name:string,why:string}[], scopeErrors:{name:string,message:string}[]}}
 */
export function auditPlaceholders(html) {
  const unknown = new Set();
  const blacklisted = new Map();
  const scopeErrors = [];

  for (const { name, index } of extractPlaceholders(html)) {
    if (BLACKLIST[name]) {
      blacklisted.set(name, BLACKLIST[name]);
      continue;
    }
    if (asVarName(name)) continue; // 스킨 옵션 변수는 index.xml 쪽에서 따로 검증한다

    const meta = VALUE_PLACEHOLDERS[name] || ATTRIBUTE_PLACEHOLDERS[name];
    if (!meta) {
      unknown.add(name);
      continue;
    }

    const active = scopesAt(html, index);

    if (meta.forbiddenScope && meta.forbiddenScope.some((s) => active.includes(s))) {
      const where = meta.forbiddenScope.filter((s) => active.includes(s));
      scopeErrors.push({
        name,
        message:
          `[##_${name}_##] 를 ${where.map((s) => SCOPES[s] || s).join(', ')} 안에서 썼다. ` +
          `이 위치에서는 값이 비어서 렌더된다.` +
          (where.includes('notice') ? ' 공지 블록 안에서는 notice_rep_* 를 쓸 것.' : ''),
      });
      continue;
    }

    if (!meta.scope.includes('anywhere') && !meta.scope.some((s) => active.includes(s))) {
      scopeErrors.push({
        name,
        message:
          `[##_${name}_##] 는 ${meta.scope.map((s) => SCOPES[s] || s).join(' 또는 ')} 안에서만 유효한데 ` +
          `그 밖에서 썼다.`,
      });
    }
  }

  return {
    unknown: [...unknown],
    blacklisted: [...blacklisted].map(([name, why]) => ({ name, why })),
    scopeErrors,
  };
}

/**
 * 그룹 태그 사용을 계약서와 대조한다.
 *
 * 치환자만 검사하면 구멍이 남는다. 모델이 <s_article_views> 같은 그럴듯한 그룹 태그를
 * 지어내면 티스토리는 그 블록을 통째로 무시하거나 날려 버리는데, 치환자 검사는
 * 아무것도 잡지 못한다.
 *
 * @returns {{unknown:string[], unbalanced:{tag:string,open:number,close:number}[], parentErrors:{tag:string,message:string}[]}}
 */
export function auditGroupTags(html) {
  const masked = maskComments(html);
  const unknown = new Set();
  const counts = new Map(); // tag -> {open, close}
  const parentErrors = [];
  const stack = [];

  const re = /<(\/?)(s_[a-zA-Z0-9_]+)\s*(\/?)>/g;
  let m;
  while ((m = re.exec(masked)) !== null) {
    const isClose = m[1] === '/';
    const selfClosing = m[3] === '/';
    const tag = m[2];

    // 조건부 변수 태그는 index.xml 쪽에서 따로 검증한다
    if (/^s_(?:if|not)_var_/.test(tag)) continue;

    if (!GROUP_TAGS[tag]) unknown.add(tag);

    // <s_x /> 같은 self-closing 은 그 자리에서 열리고 닫힌 것이다. 예전에는 open 만
    // +1 해서 self-closing 이 하나라도 있으면 항상 불균형으로 오검출됐다.
    // scopesAt 이 self-closing 을 스택에 안 올리는 것(no-op)과 맞추어, 여기서도
    // 열림/닫힘을 동시에 센 것으로 본다.
    if (!counts.has(tag)) counts.set(tag, { open: 0, close: 0 });
    if (selfClosing) {
      counts.get(tag).open++;
      counts.get(tag).close++;
    } else {
      counts.get(tag)[isClose ? 'close' : 'open']++;
    }

    if (isClose) {
      const at = stack.lastIndexOf(tag);
      if (at !== -1) stack.splice(at, 1);
    } else {
      // self-closing 도 여는 태그처럼 부모 필요 검사는 받는다. 스택에는 올리지
      // 않는다 - 그 자리에서 닫혔으므로 자식을 가질 수 없다.
      const meta = GROUP_TAGS[tag];
      if (meta?.requiresParent && !meta.requiresParent.some((par) => stack.includes(par))) {
        parentErrors.push({
          tag,
          message:
            `<${tag}> 는 ${meta.requiresParent.map((x) => `<${x}>`).join(' 또는 ')} 안에 있어야 하는데 ` +
            `밖에 있다. 티스토리가 이 블록을 렌더하지 않는다.`,
        });
      }
      if (!selfClosing) stack.push(tag);
    }
  }

  const unbalanced = [];
  for (const [tag, c] of counts) {
    // <s_ad_div></s_ad_div> 처럼 빈 태그로 쓰이는 경우도 open/close 가 맞아야 한다
    if (c.open !== c.close) unbalanced.push({ tag, open: c.open, close: c.close });
  }

  return { unknown: [...unknown], unbalanced, parentErrors };
}

/**
 * 모델에게 보여줄 계약서 요약. 시스템 프롬프트에 들어간다.
 * 전체 객체를 JSON으로 던지면 토큰이 낭비되므로 필요한 줄만 만든다.
 */
export function contractSummary() {
  const lines = [];

  lines.push('## 사용 가능한 값 치환자');
  for (const [name, meta] of Object.entries(VALUE_PLACEHOLDERS)) {
    const where = meta.scope.includes('anywhere')
      ? ''
      : ` (${meta.scope.map((s) => SCOPES[s] || s).join(' 또는 ')})`;
    lines.push(`[##_${name}_##] - ${meta.desc}${where}`);
  }

  lines.push('');
  lines.push('## 속성 위치 치환자 (href로 감싸지 말 것)');
  for (const [name, meta] of Object.entries(ATTRIBUTE_PLACEHOLDERS)) {
    lines.push(`[##_${name}_##] - ${meta.desc}`);
  }

  lines.push('');
  lines.push('## 사용 가능한 그룹 태그');
  for (const [name, meta] of Object.entries(GROUP_TAGS)) {
    const parent = meta.requiresParent ? ` (반드시 ${meta.requiresParent.join(' 또는 ')} 안)` : '';
    lines.push(`<${name}> - ${meta.desc}${parent}`);
  }

  lines.push('');
  lines.push('## 존재하지 않는 치환자 (절대 쓰지 말 것)');
  for (const [name, why] of Object.entries(BLACKLIST)) {
    lines.push(`[##_${name}_##] - ${why}`);
  }

  return lines.join('\n');
}
