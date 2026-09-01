/**
 * 미리보기 렌더러
 *
 * skin.html 의 치환자와 그룹 태그를 가짜 데이터로 펼쳐서, 티스토리가 실제로
 * 내보내는 것과 같은 모양의 HTML 을 만든다. 티스토리 서버를 쓰지 않는다.
 *
 * 한계를 분명히 해 둔다. 이 렌더러는 티스토리가 본문을 감싸는
 * .tt_article_useless_p_margin 같은 래퍼를 재현하지 않는다. 그래서 미리보기가
 * 멀쩡해도 실제 업로드에서 깨지는 문제는 남는다. 그 종류는 함정 검사(pitfalls.js)와
 * 실제 업로드 확인으로 잡는다.
 */

import { mockDefault, categoryListHtml, commentsHtml } from './mock-data.js';

/**
 * 미리보기 안에서의 이동을 막는 가드.
 *
 * 미리보기는 srcdoc iframe 이라 문서 URL 이 about:srcdoc 이다. 그 안의 상대 링크
 * (<a href="#"> 등)는 부모 페이지 주소로 해석돼, 클릭하면 iframe 안에서 이 앱이
 * 통째로 다시 로드돼 첫 화면으로 튄다. 검색창 엔터는 script.js 가 location.href
 * 로 /search 로 보낸다. 미리보기는 보여 주기 전용이므로 이동을 전부 막는다.
 * (capture 단계에서 막되 stopPropagation 은 안 해서, 메뉴 토글·복사 같은 다른 클릭
 *  동작은 그대로 산다. 검색만은 script.js 로 넘어가기 전에 끊는다.)
 */
const PREVIEW_GUARD = `
<script>
(function () {
  addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a');
    if (a) e.preventDefault();
  }, true);
  addEventListener('submit', function (e) { e.preventDefault(); }, true);
  addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target && e.target.closest &&
        e.target.closest('#search-input, #search-input-side')) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
})();
</script>`;

/** 미리보기에서 고를 수 있는 페이지 타입. */
export const PREVIEW_PAGES = [
  { id: 'tt-body-index', label: '홈' },
  { id: 'tt-body-page', label: '글 상세' },
  { id: 'tt-body-category', label: '카테고리' },
  { id: 'tt-body-search', label: '검색 결과' },
  { id: 'tt-body-tag', label: '태그 클라우드' },
  { id: 'tt-body-guestbook', label: '방명록' },
  { id: 'tt-body-notice', label: '공지' },
];

const LIST_PAGES = ['tt-body-index', 'tt-body-category', 'tt-body-search'];

/** 여는 태그에 대응하는 닫는 태그 위치를 깊이를 세며 찾는다. */
function findClose(html, tag, fromIndex) {
  const open = new RegExp(`<${tag}>`, 'g');
  const close = new RegExp(`</${tag}>`, 'g');
  let depth = 1;
  let i = fromIndex;
  while (depth > 0) {
    open.lastIndex = i;
    close.lastIndex = i;
    const o = open.exec(html);
    const c = close.exec(html);
    if (!c) return -1;
    if (o && o.index < c.index) {
      depth++;
      i = o.index + o[0].length;
    } else {
      depth--;
      if (depth === 0) return c.index;
      i = c.index + c[0].length;
    }
  }
  return -1;
}

/** 그룹 태그를 만나면 어떻게 처리할지 결정한다. */
function groupPlan(tag, ctx) {
  const { ARTICLES, NOTICES, TAGS } = ctx.mock;
  const page = ctx.pageType;
  const isList = LIST_PAGES.includes(page);
  const isPermalink = page === 'tt-body-page';
  const isNotice = page === 'tt-body-notice';

  switch (tag) {
    case 's_t3':
      return { mode: 'unwrap' };

    // 관리자에게만 보이는 영역. 방문자 시점을 보여 주는 게 목적이므로 지운다.
    case 's_ad_div':
      return { mode: 'drop' };

    case 's_article_rep':
      return { mode: isList || isPermalink ? 'unwrap' : 'drop' };

    case 's_index_article_rep':
      if (ctx.inNotice) return { mode: 'repeat', items: NOTICES.map((n) => ({ notice: n })) };
      return isList ? { mode: 'repeat', items: ARTICLES.map((a) => ({ item: a })) } : { mode: 'drop' };

    case 's_permalink_article_rep':
      if (ctx.inNotice) return isNotice ? { mode: 'once', item: { notice: NOTICES[0] } } : { mode: 'drop' };
      if (ctx.inProtected) return { mode: 'drop' };
      return isPermalink ? { mode: 'once', item: { item: ARTICLES[0], permalink: true } } : { mode: 'drop' };

    case 's_list':
      // 홈에서도 나온다. 카테고리와 검색에서만 나올 것이라고 보면 안 된다.
      // 실제 블로그에 올려 보고서야 확인한 사항이고, 그전까지 미리보기가
      // 현실과 달랐다.
      return isList ? { mode: 'unwrap' } : { mode: 'drop' };

    case 's_list_empty':
      return { mode: 'drop' }; // 결과가 있는 상태를 보여 준다

    case 's_notice_rep':
      return isNotice ? { mode: 'unwrap', flag: 'inNotice' } : { mode: 'drop' };

    case 's_rct_notice':
      return { mode: 'unwrap' };
    case 's_rct_notice_rep':
      return { mode: 'repeat', items: NOTICES.map((n) => ({ notice: n })) };

    case 's_guest':
      return page === 'tt-body-guestbook' ? { mode: 'unwrap' } : { mode: 'drop' };

    case 's_tag':
      return page === 'tt-body-tag' ? { mode: 'unwrap' } : { mode: 'drop' };
    case 's_tag_rep':
      return { mode: 'repeat', items: TAGS.map((t) => ({ tag: t })) };

    case 's_random_tags':
      return { mode: 'repeat', items: TAGS.slice(0, 8).map((t) => ({ tag: t })) };


    case 's_article_rep_thumbnail':
      return ctx.item?.thumb ? { mode: 'unwrap' } : { mode: 'drop' };

    case 's_rp_count':
      return { mode: 'unwrap' };

    case 's_rp':
      return { mode: 'unwrap' };

    case 's_tag_label':
      return { mode: 'unwrap' };

    case 's_article_prev':
    case 's_article_next':
      return { mode: 'unwrap' };
    case 's_article_prev_thumbnail':
    case 's_article_next_thumbnail':
      return { mode: 'drop' };

    case 's_article_related':
    case 's_article_related_rep':
    case 's_article_related_rep_thumbnail':
      return { mode: 'drop' };

    case 's_article_protected':
      // 보호글은 별도 페이지 타입이 없어 미리보기에서는 감춘다
      return { mode: 'drop', flag: 'inProtected' };

    case 's_paging':
      return isList ? { mode: 'unwrap' } : { mode: 'drop' };
    case 's_paging_rep':
      return { mode: 'repeat', items: [1, 2, 3, 4, 5].map((n) => ({ page: n })) };

    case 's_cover_group':
    case 's_cover_rep':
    case 's_cover':
    case 's_cover_item':
    case 's_cover_item_thumbnail':
    case 's_cover_item_article_info':
      return { mode: 'drop' };

    default:
      return { mode: 'unwrap' };
  }
}

/** <s_if_var_x> / <s_not_var_x> 를 스킨 변수 값으로 판정한다. */
function resolveVarConditions(html, vars) {
  let out = html;
  const re = /<s_(if|not)_var_([a-zA-Z0-9_]+)>/;
  let guard = 0;
  while (guard++ < 200) {
    const m = re.exec(out);
    if (!m) break;
    const kind = m[1];
    const name = m[2];
    const tag = `s_${kind}_var_${name}`;
    const start = m.index;
    const innerStart = start + m[0].length;
    const closeAt = findClose(out, tag, innerStart);
    if (closeAt === -1) {
      // 닫는 태그가 없으면 여는 태그만 지우고 넘어간다
      out = out.slice(0, start) + out.slice(innerStart);
      continue;
    }
    const inner = out.slice(innerStart, closeAt);
    const value = vars[name];
    const truthy = value !== undefined && value !== '' && value !== false && value !== 'false';
    const keep = kind === 'if' ? truthy : !truthy;
    out = out.slice(0, start) + (keep ? inner : '') + out.slice(closeAt + tag.length + 3);
  }
  return out;
}

/** 값 치환자를 실제 값으로 바꾼다. */
function fillPlaceholders(html, ctx) {
  const { BLOG, ARTICLES, ARTICLE_BODY, NOTICES, CATEGORIES } = ctx.mock;
  const a = ctx.item;
  const n = ctx.notice;
  const t = ctx.tag;
  const vars = ctx.vars;

  return html.replace(/\[##_([a-zA-Z0-9_]+)_##\]/g, (whole, name) => {
    // 스킨 옵션
    if (name.startsWith('var_')) {
      const key = name.slice(4);
      return vars[key] !== undefined ? String(vars[key]) : '';
    }

    switch (name) {
      // 블로그
      case 'title': return BLOG.title;
      case 'desc': return BLOG.desc;
      case 'blogger': return BLOG.blogger;
      case 'image': return BLOG.image;
      case 'blog_image': return `<img src="${BLOG.image}" alt="${BLOG.blogger}">`;
      case 'blog_link': return '#';
      case 'rss_url': return '#';
      case 'taglog_link': return '#';
      case 'guestbook_link': return '#';
      case 'body_id': return ctx.pageType;
      case 'tag': return BLOG.tag;
      case 'blog_menu': return '<ul><li><a href="#">홈</a></li><li><a href="#">태그</a></li></ul>';

      case 'page_title':
        if (ctx.pageType === 'tt-body-page') return `${ARTICLES[0].title} - ${BLOG.title}`;
        return BLOG.title;

      // 사이드바 자동 생성
      case 'category_list': return categoryListHtml(CATEGORIES);
      case 'recent_article': return '<ul>' + ARTICLES.slice(0, 5).map((x) => `<li><a href="#">${x.title}</a></li>`).join('') + '</ul>';
      case 'recent_comment': return '<ul><li><a href="#">좋은 글 잘 봤습니다</a></li></ul>';
      case 'recent_notice': return '<ul>' + NOTICES.map((x) => `<li><a href="#">${x.title}</a></li>`).join('') + '</ul>';
      case 'subscription_button':
        return '<button type="button" class="btn_subscription">구독하기</button>';

      // 목록 머리말
      case 'list_conform':
        if (ctx.pageType === 'tt-body-search') return '검색 결과';
        if (ctx.pageType === 'tt-body-category') return CATEGORIES[0]?.name || '전체';
        return '전체';
      case 'list_count': return String(ARTICLES.length);

      // 글
      case 'article_rep_link': return '#';
      case 'article_rep_title': return a ? a.title : '';
      case 'article_rep_summary': return a ? a.summary : '';
      case 'article_rep_desc': return ARTICLE_BODY;
      case 'article_rep_category': return a ? a.category : '';
      case 'article_rep_category_link': return '#';
      case 'article_rep_date': return a ? a.date : '';
      case 'article_rep_simple_date': return a ? a.simple_date : '';
      case 'article_rep_author': return BLOG.blogger;
      case 'article_rep_rp_cnt': return a ? String(a.rp) : '0';
      case 'article_rep_thumbnail_url':
      case 'article_rep_thumbnail_raw_url': return a ? a.thumb : '';

      case 'tag_label_rep':
        return (a?.tags || []).map((x) => `<a href="#">#${x}</a>`).join(' ');

      // 이전/다음 글
      case 'article_prev_link':
      case 'article_next_link': return '#';
      case 'article_prev_title': return ARTICLES[1].title;
      case 'article_next_title': return ARTICLES[2].title;

      // 공지
      case 'notice_rep_link': return '#';
      case 'notice_rep_title': return n ? n.title : '';
      case 'notice_rep_summary': return n ? n.summary : '';
      case 'notice_rep_desc': return ARTICLE_BODY;
      case 'notice_rep_date': return n ? n.date : '';
      case 'notice_rep_simple_date': return n ? n.simple_date : '';

      // 댓글 / 방명록
      case 'comment_group':
      case 'guestbook_group': return commentsHtml();

      // 태그
      case 'tag_link': return '#';
      case 'tag_name': return t ? t.name : '';
      case 'tag_class': return t ? t.cls : '';

      // 페이징
      case 'paging_rep_link_num': return String(ctx.page ?? 1);
      case 'prev_page': return 'href="#"';
      case 'next_page': return 'href="#"';
      case 'paging_rep_link': return ctx.page === 1 ? 'href="#" class="selected"' : 'href="#"';
      case 'no_more_prev': return 'no_more_prev';
      case 'no_more_next': return '';

      // 보호글
      case 'article_password': return 'preview-password';
      case 'article_dissolve': return 'return false;';

      // 관리자 영역 (드롭되므로 도달하지 않는다)
      default:
        return '';
    }
  });
}

/**
 * 그룹 태그를 재귀적으로 펼치면서 그 자리의 문맥으로 치환자를 채운다.
 *
 * 펼치기와 채우기를 분리하면 안 된다. 반복 블록은 항목마다 다른 값을 넣어야 하는데,
 * 다 펼친 뒤에 한 번만 채우면 그 시점에는 어느 항목의 자리였는지가 사라져서
 * 글 제목과 요약이 전부 빈칸으로 들어간다. 구조는 여러 벌 나오는데 내용이 없는,
 * 눈으로는 멀쩡해 보이지만 완전히 잘못된 결과가 된다.
 */
function expandGroups(html, ctx) {
  const re = /<(s_[a-zA-Z0-9_]+)>/;
  let out = '';
  let rest = html;
  let guard = 0;

  while (guard++ < 5000) {
    const m = re.exec(rest);
    if (!m) {
      out += fillPlaceholders(rest, ctx);
      break;
    }
    const tag = m[1];

    // 조건부 변수 태그는 이 단계 전에 이미 처리됐다. 남아 있으면 그냥 지운다.
    if (/^s_(?:if|not)_var_/.test(tag)) {
      out += fillPlaceholders(rest.slice(0, m.index), ctx);
      rest = rest.slice(m.index + m[0].length);
      continue;
    }

    out += fillPlaceholders(rest.slice(0, m.index), ctx);
    const innerStart = m.index + m[0].length;
    const closeAt = findClose(rest, tag, innerStart);

    if (closeAt === -1) {
      // 닫는 태그가 없다. 검증기가 따로 잡으므로 여기서는 태그만 버린다.
      rest = rest.slice(innerStart);
      continue;
    }

    const inner = rest.slice(innerStart, closeAt);
    const after = rest.slice(closeAt + tag.length + 3);
    const plan = groupPlan(tag, ctx);

    if (plan.mode === 'drop') {
      rest = after;
      continue;
    }

    const childCtx = plan.flag ? { ...ctx, [plan.flag]: true } : ctx;

    if (plan.mode === 'unwrap') {
      out += expandGroups(inner, childCtx);
    } else if (plan.mode === 'once') {
      out += expandGroups(inner, { ...childCtx, ...plan.item });
    } else if (plan.mode === 'repeat') {
      for (const it of plan.items) {
        out += expandGroups(inner, { ...childCtx, ...it });
      }
    }

    rest = after;
  }

  return out;
}

/**
 * skin.html 을 미리보기 HTML 로 만든다.
 *
 * @param {string} skinHtml
 * @param {object} opts
 * @param {string} opts.pageType   PREVIEW_PAGES 의 id
 * @param {string} opts.css        공유 style.css 내용
 * @param {string} opts.js         공유 script.js 내용
 * @param {object} [opts.vars]     스킨 옵션 값
 * @param {string} [opts.extraCss] 미리보기 전용 보조 스타일
 * @returns {string}
 */
export function renderPreview(skinHtml, opts) {
  const vars = {
    accentColor: '',
    codeFont: "'JetBrains Mono', 'D2Coding', Consolas, monospace",
    enableSearch: true,
    ...(opts.vars || {}),
  };

  // 미리보기 채움. 용도별 LLM 샘플이 있으면 그걸, 없으면 기본 목업을 쓴다.
  const mock = opts.mock || mockDefault();
  const ctx = { pageType: opts.pageType, vars, mock };

  let html = resolveVarConditions(skinHtml, vars);
  // 펼치기와 채우기가 한 번에 일어난다. 분리하면 반복 문맥이 사라진다.
  html = expandGroups(html, ctx);

  // 스킨 옵션에서 accentColor 를 비워 두면 CSS 변수가 빈 값이 되어 색이 깨진다.
  // 실제 티스토리에서는 관리자 기본값이 들어오므로, 미리보기에서도 빈 선언은 지운다.
  html = html.replace(/^\s*--[a-z-]+:\s*;\s*$/gm, '');

  // 외부 파일 링크를 인라인으로 바꾼다. iframe srcdoc 에서 상대 경로가 안 먹는다.
  html = html.replace(
    /<link\s+rel="stylesheet"\s+href="\.\/style\.css">/,
    `<style>\n${opts.css || ''}\n${opts.extraCss || ''}\n</style>`,
  );
  html = html.replace(
    /<script\s+src="\.\/images\/script\.js"\s+defer><\/script>/,
    `<script>\n${opts.js || ''}\n</script>`,
  );

  // 미리보기 안에서 링크·검색이 실제로 이동하지 않게 가드를 맨 끝에 심는다.
  const guarded = html.replace('</body>', `${PREVIEW_GUARD}\n</body>`);
  html = guarded !== html ? guarded : html + PREVIEW_GUARD;

  return html;
}
