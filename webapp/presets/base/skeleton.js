/**
 * 공유 치환자 골격
 *
 * 모든 프리셋이 이 파일 하나에서 skin.html 을 만들어낸다. 치환자와 그룹 태그는
 * 전부 여기에만 있고, 프리셋은 레이아웃 플래그와 목록 마크업 조각만 넘긴다.
 * src/0.9.8 -> 1.8.0 에 걸쳐 실제 티스토리에서 검증된 구조를 옮겨 온 것이다.
 *
 * Tailwind 를 쓰지 않는다.
 * 1.2.0 에서 CDN 을 버리고 미리 빌드한 tailwind.css 로 바꾼 이유는 성능이었지만,
 * 그 방식은 사람이 저장소에서 npm run build:css 를 돌릴 수 있어야 성립한다.
 * 브라우저에서 스킨을 뽑아 가는 사용자는 빌드를 돌릴 수 없다. 모델이 클래스를
 * 하나만 새로 지어내도 그 클래스는 빌드된 CSS 에 없어서 결과물이 조용히 깨진다.
 * 그래서 여기서는 손으로 쓴 평범한 CSS 클래스만 쓴다.
 */

/** 레이아웃 모드. body 클래스로 나가고 style.css 가 이 값으로 분기한다. */
export const LAYOUTS = {
  SIDEBAR_LEFT: 'layout-sidebar-left',
  SIDEBAR_RIGHT: 'layout-sidebar-right',
  NO_SIDEBAR: 'layout-no-sidebar',
};

/** 글 목록 표시 방식. */
export const LIST_STYLES = {
  LIST: 'list-standard',   // 제목 + 요약
  PLAIN: 'list-plain',     // 제목 + 발췌, 썸네일 없음
  GRID: 'list-grid',       // 카드 그리드, 썸네일 우선
  DENSE: 'list-dense',     // 작은 썸네일 + 요약, 밀집
  HERO: 'list-hero',       // 첫 글을 대표 이미지로 크게, 제목을 얹는다
  // 중립. base 에 이 클래스용 규칙이 없어, 생성된 디자인 CSS 가 목록 배치를 온전히
  // 소유한다(base .list-* .card 규칙에 안 눌린다). 생성 흐름의 기본값이다.
  CUSTOM: 'list-custom',
};

/** 프리셋이 값을 안 주면 쓰는 기본값. */
const DEFAULTS = {
  layout: LAYOUTS.SIDEBAR_LEFT,
  listStyle: LIST_STYLES.LIST,
  showThumbnail: true,
  showSummary: true,
  showCommentCount: true,
  showToc: false,
  syntaxHighlight: false,
  showSearch: true,
  showProfile: true,
  showCategories: true,
  showTagCloud: true,
  showRecentNotice: true,
  showMenu: true,
  showSubscribe: true,
  showPrevNext: true,
  bodyFont: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif",
  headFont: null,
  headFontUrl: null,
  codeFont: "'JetBrains Mono', 'D2Coding', Consolas, monospace",
  themeCss: null,
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 프리셋의 tokens 를 CSS 사용자 정의 속성 문자열로 만든다. */
function tokensToCss(tokens) {
  return Object.entries(tokens)
    .map(([k, v]) => `      --${k}: ${v};`)
    .join('\n');
}

/**
 * 글 목록 한 건의 마크업.
 * s_index_article_rep 안이므로 article_rep_* 와 article_rep_summary 를 쓸 수 있다.
 */
function articleListItem(p) {
  const thumb = p.showThumbnail
    ? `
            <s_article_rep_thumbnail>
              <a class="card-thumb" href="[##_article_rep_link_##]">
                <img src="[##_article_rep_thumbnail_url_##]" alt="" loading="lazy">
              </a>
            </s_article_rep_thumbnail>`
    : '';

  const summary = p.showSummary
    ? `
            <p class="card-summary">[##_article_rep_summary_##]</p>`
    : '';

  /*
    목록 항목에는 태그를 넣지 않는다.

    티스토리는 목록 안에서 태그를 반복 출력하는 방법을 제공하지 않는다. 공식 문서의
    목록 페이지(list.html)에는 태그 관련 치환자가 아예 없고, 글 태그는 상세에서
    <s_tag_label> 과 [##_tag_label_rep_##] 로만 낸다.

    예전에는 여기서 <s_article_rep_tag> 를 썼는데 그런 태그는 존재하지 않는다.
    치환자 계약서에도 올라가 있어서 검사기가 통과시켜 줬고, 그래서 업로드해도
    조용히 아무것도 안 나오는 상태였다.
  */
  const tags = '';

  const rpCount = p.showCommentCount
    ? `
              <s_rp_count><span class="card-rp">댓글 [##_article_rep_rp_cnt_##]</span></s_rp_count>`
    : '';

  return `
          <article class="card">${thumb}
            <div class="card-body">
              <div class="card-meta">
                <a class="card-cat" href="[##_article_rep_category_link_##]">[##_article_rep_category_##]</a>
                <time datetime="[##_article_rep_simple_date_##]">[##_article_rep_simple_date_##]</time>${rpCount}
              </div>
              <h2 class="card-title">
                <a href="[##_article_rep_link_##]">[##_article_rep_title_##]</a>
              </h2>${summary}${tags}
            </div>
          </article>`;
}

/** 사이드바. layout 이 NO_SIDEBAR 면 호출되지 않는다. */
function sidebar(p) {
  const search = p.showSearch
    ? `
        <s_if_var_enableSearch>
        <div class="side-block side-search">
          <input type="text" id="search-input-side" class="search-input" placeholder="검색" aria-label="블로그 검색">
        </div>
        </s_if_var_enableSearch>`
    : '';

  const profile = p.showProfile
    ? `
        <div class="side-block profile">
          <img class="profile-img" src="[##_image_##]" alt="[##_blogger_##]">
          <p class="profile-name">[##_blogger_##]</p>
          <p class="profile-desc">[##_desc_##]</p>${
            p.showSubscribe ? `
          <div class="subscribe">[##_subscription_button_##]</div>` : ''}
        </div>`
    : '';

  // 공지가 하나도 없을 때 빈 래퍼만 남는 경우가 있어 script.js 가 id 로 찾아 숨긴다.
  const notice = p.showRecentNotice
    ? `
        <s_rct_notice>
        <div class="side-block" id="sidebar-notice">
          <h3 class="side-title">공지</h3>
          <ul class="side-list">
            <s_rct_notice_rep>
            <li><a href="[##_notice_rep_link_##]">[##_notice_rep_title_##]</a></li>
            </s_rct_notice_rep>
          </ul>
        </div>
        </s_rct_notice>`
    : '';

  const categories = p.showCategories
    ? `
        <div class="side-block">
          <h3 class="side-title">카테고리</h3>
          <div class="category-list">
            <a class="category-all" href="[##_blog_link_##]">전체보기</a>
            [##_category_list_##]
          </div>
        </div>`
    : '';

  const tagCloud = p.showTagCloud
    ? `
        <div class="side-block">
          <h3 class="side-title">태그</h3>
          <div class="tag-list">
            <s_random_tags>
              <a class="tag" href="[##_tag_link_##]">#[##_tag_name_##]</a>
            </s_random_tags>
          </div>
        </div>`
    : '';

  // 방명록/태그 클라우드 바로가기. spec 의 sidebarBlocks 'menu' 옵션이
  // detailsToPreset 에서 showMenu 로 넘어와 여기서 갈린다. 무조건 렌더하면
  // 사용자가 메뉴를 뺐는데도 산출물에 남는다.
  const menu = p.showMenu
    ? `
        <div class="side-block">
          <h3 class="side-title">메뉴</h3>
          <div class="side-menu">
            <a href="[##_guestbook_link_##]">방명록</a>
            <a href="[##_taglog_link_##]">태그 클라우드</a>
          </div>
        </div>`
    : '';

  return `
    <aside id="sidebar" class="sidebar">
      <nav class="sidebar-inner">${search}${profile}${notice}${menu}${categories}${tagCloud}
      </nav>
    </aside>
    <div id="sidebar-overlay" class="sidebar-overlay" hidden></div>`;
}

/** 상단 헤더. 사이드바가 없으면 카테고리 메뉴가 여기로 올라온다. */
function header(p) {
  const noSidebar = p.layout === LAYOUTS.NO_SIDEBAR;

  const menuButton = noSidebar
    ? ''
    : `
        <button id="mobile-menu-btn" class="icon-btn" aria-label="메뉴 열기" aria-expanded="false" aria-controls="sidebar">
          <span class="hamburger"></span>
        </button>`;

  const topNav = noSidebar
    ? `
      <nav class="top-nav">
        <a href="[##_blog_link_##]">홈</a>
        <a href="[##_taglog_link_##]">태그</a>
        <a href="[##_guestbook_link_##]">방명록</a>
      </nav>`
    : '';

  const search = p.showSearch
    ? `
      <s_if_var_enableSearch>
      <div class="header-search">
        <input type="text" id="search-input" class="search-input" placeholder="검색" aria-label="블로그 검색">
      </div>
      </s_if_var_enableSearch>`
    : '';

  return `
  <header class="site-header">
    <div class="header-inner">
      <div class="header-left">${menuButton}
        <a class="site-title" href="[##_blog_link_##]">[##_title_##]</a>
      </div>${topNav}${search}
    </div>
  </header>`;
}

/**
 * skin.html 전체를 만든다.
 * @param {object} preset
 * @returns {string}
 */
export function buildSkinHtml(preset) {
  const p = { ...DEFAULTS, ...preset };
  const tokens = p.tokens || {};

  const bodyClasses = [p.layout, p.listStyle, p.showToc ? 'has-toc' : ''].filter(Boolean).join(' ');

  // 웹폰트 스타일시트 링크. 본문·제목이 같은 웹폰트면 한 번만 넣는다.
  const fontUrls = [...new Set([p.bodyFontUrl, p.headFontUrl].filter(Boolean))];
  const fontLinks = fontUrls.length
    ? '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
      fontUrls.map((u) => `  <link rel="stylesheet" href="${u}">`).join('\n') +
      '\n'
    : '';

  const prevNext = p.showPrevNext
    ? `
            <nav class="post-nav">
              <s_article_prev>
                <a class="post-nav-prev" href="[##_article_prev_link_##]">
                  <span class="post-nav-label">이전 글</span>
                  <span class="post-nav-title">[##_article_prev_title_##]</span>
                </a>
              </s_article_prev>
              <s_article_next>
                <a class="post-nav-next" href="[##_article_next_link_##]">
                  <span class="post-nav-label">다음 글</span>
                  <span class="post-nav-title">[##_article_next_title_##]</span>
                </a>
              </s_article_next>
            </nav>`
    : '';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>[##_page_title_##]</title>
  <meta name="description" content="[##_desc_##]">
  <meta name="author" content="[##_blogger_##]">

  <meta property="og:title" content="[##_page_title_##]">
  <meta property="og:description" content="[##_desc_##]">
  <meta property="og:type" content="blog">
  <meta property="og:url" content="[##_blog_link_##]">
  <meta property="og:image" content="[##_image_##]">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="[##_page_title_##]">
  <meta name="twitter:description" content="[##_desc_##]">
  <meta name="twitter:image" content="[##_image_##]">

  <link rel="preconnect" href="https://t1.daumcdn.net">
  <link rel="preconnect" href="https://tistory1.daumcdn.net">
${
  p.syntaxHighlight
    ? `
  <!--
    구문 강조. Prism.manual = true 가 핵심이다.
    티스토리 코드블록에는 language-* 클래스가 없고 data-ke-language 속성만 있다.
    script.js 가 그 속성을 클래스로 바꾼 "뒤에" 수동으로 강조를 실행해야 한다.
    자동 실행되면 클래스가 붙기 전에 돌아서 아무 색도 입지 않는다.
  -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prism-themes@1.9.0/themes/prism-vsc-dark-plus.min.css">
  <script>window.Prism = window.Prism || {}; window.Prism.manual = true;</script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js" defer></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js" defer></script>`
    : ''
}
${p.fontFaceCss ? `  <style>${p.fontFaceCss}</style>\n` : ''}${fontLinks}  <link rel="stylesheet" href="./style.css">

  <!--
    스킨 옵션 주입.
    [##_var_이름_##] 는 skin.html 에서만 치환된다. style.css 에서는 문자 그대로 남으므로
    관리자 옵션을 스타일에 반영하려면 반드시 여기서 CSS 변수로 넘겨야 한다.
    style.css 의 :root 값은 폴백이다.
  -->
  <style>
    :root {
${tokensToCss(tokens)}
      --font-body: ${p.bodyFont};
      --font-head: ${p.headFont || 'var(--font-body)'};
      --font-code: [##_var_codeFont_##];
      --color-accent: [##_var_accentColor_##];
    }
  </style>
${
  // 생성된 테마 CSS 레이어. 반드시 가장 마지막에 얹혀 base 와 위 :root 주입을 덮는다.
  // 컨셉의 look 을 색·질감·모서리·hover 로 실제로 입히는 자리다(harness/theme-prompt.js).
  p.themeCss ? `\n  <style>\n${p.themeCss}\n  </style>\n` : ''
}
  <link rel="alternate" type="application/rss+xml" title="[##_title_##]" href="[##_rss_url_##]">
  <link rel="shortcut icon" href="[##_image_##]">

  <s_ad_div></s_ad_div>
</head>

<body id="[##_body_id_##]" class="${bodyClasses}">
<s_t3>
${header(p)}
  <div class="site-body">
${p.layout === LAYOUTS.NO_SIDEBAR ? '' : sidebar(p)}
    <main class="main">
      <div class="main-inner">

        <!-- 카테고리 / 검색 / 태그 등 목록성 페이지의 머리말 -->
        <!--
          목록성 페이지의 머리말.
          홈에서도 출력된다. 카테고리와 검색에서만 나올 것이라고 보면 안 된다.
          실제 블로그에 올려 보고서야 확인한 사항이다.

          빈 화면 문구는 페이지마다 달라야 한다. 글이 없는 홈에서 "다른 검색어로
          시도해 보세요" 가 뜨면 말이 안 된다. 치환자로는 페이지 타입을 알 수 없으므로
          전부 적어 두고 body id 로 CSS 가 하나만 보여준다.
        -->
        <s_list>
          <div class="list-header">
            <h1>[##_list_conform_##] <span class="list-count">[##_list_count_##]</span></h1>
          </div>
          <s_list_empty>
            <div class="empty">
              <p class="empty-title">
                <span class="on-index">아직 글이 없습니다</span>
                <span class="on-other">결과가 없습니다</span>
              </p>
              <p class="empty-desc">
                <span class="on-index">첫 글을 쓰면 여기에 나옵니다.</span>
                <span class="on-search">다른 검색어로 시도해 보세요.</span>
                <span class="on-category">이 카테고리에는 아직 글이 없습니다.</span>
                <span class="on-tag">이 태그가 붙은 글이 없습니다.</span>
              </p>
            </div>
          </s_list_empty>
        </s_list>

        <s_article_rep>

        <!--
          글이 없을 때는 위 <s_list_empty> 가 맡는다. 예전에는 여기에
          <s_not_index_article_rep> 을 뒀는데 그런 그룹 태그는 존재하지 않는다.
          s_list_empty 는 라이브 블로그에서 실제로 렌더되는 것을 확인했다.
        -->
        <s_index_article_rep>${articleListItem(p)}
        </s_index_article_rep>

        <s_permalink_article_rep>
          <article class="post">
            <header class="post-header">
              <div class="post-meta">
                <a href="[##_article_rep_category_link_##]">[##_article_rep_category_##]</a>
                <time datetime="[##_article_rep_date_##]">[##_article_rep_date_##]</time>
              </div>
              <h1 class="post-title">[##_article_rep_title_##]</h1>
            </header>

            <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              "headline": "[##_article_rep_title_##]",
              "datePublished": "[##_article_rep_date_##]",
              "author": { "@type": "Person", "name": "[##_article_rep_author_##]" },
              "mainEntityOfPage": "[##_article_rep_link_##]"
            }
            </script>

            <div class="article-content">
              [##_article_rep_desc_##]
            </div>

            <s_tag_label>
              <div class="post-tags">[##_tag_label_rep_##]</div>
            </s_tag_label>

            <s_ad_div>
              <div class="admin-links">
                <a href="[##_s_ad_m_link_##]">수정</a>
                <a href="#" onclick="[##_s_ad_d_onclick_##]">삭제</a>
              </div>
            </s_ad_div>
          </article>
${prevNext}
          <section class="comments">
            <h2 class="comments-title">댓글</h2>
            <s_rp>
              [##_comment_group_##]
            </s_rp>
          </section>
        </s_permalink_article_rep>

        </s_article_rep>

        <!-- 보호글. 비밀번호가 걸린 글에 접근했을 때만 출력된다. -->
        <s_article_protected>
          <s_permalink_article_rep>
            <article class="post">
              <header class="post-header">
                <div class="post-meta">
                  <span>[##_article_rep_category_##]</span>
                  <time datetime="[##_article_rep_date_##]">[##_article_rep_date_##]</time>
                </div>
                <h1 class="post-title">[##_article_rep_title_##]</h1>
              </header>
              <div class="protected">
                <p class="protected-title">보호되어 있는 글입니다</p>
                <p class="protected-desc">내용을 보려면 비밀번호를 입력하세요.</p>
                <form class="protected-form" onsubmit="[##_article_dissolve_##]">
                  <input type="password" id="[##_article_password_##]" name="[##_article_password_##]" value="" placeholder="비밀번호">
                  <button type="submit">확인</button>
                </form>
              </div>
            </article>
          </s_permalink_article_rep>
        </s_article_protected>

        <!--
          공지 페이지.
          이 블록 안에서는 article_rep_* 가 아니라 notice_rep_* 를 써야 한다.
          article_rep_* 를 쓰면 문법은 통과하지만 값이 비어서 렌더된다.
        -->
        <s_notice_rep>
          <s_index_article_rep>
            <article class="card">
              <div class="card-body">
                <div class="card-meta">
                  <span class="badge">공지</span>
                  <time datetime="[##_notice_rep_simple_date_##]">[##_notice_rep_simple_date_##]</time>
                </div>
                <h2 class="card-title">
                  <a href="[##_notice_rep_link_##]">[##_notice_rep_title_##]</a>
                </h2>
                <p class="card-summary">[##_notice_rep_summary_##]</p>
              </div>
            </article>
          </s_index_article_rep>

          <s_permalink_article_rep>
            <article class="post">
              <header class="post-header">
                <div class="post-meta">
                  <span class="badge">공지</span>
                  <time datetime="[##_notice_rep_date_##]">[##_notice_rep_date_##]</time>
                </div>
                <h1 class="post-title">[##_notice_rep_title_##]</h1>
              </header>
              <div class="article-content">
                [##_notice_rep_desc_##]
              </div>
            </article>

            <section class="comments">
              <h2 class="comments-title">댓글</h2>
              <s_rp>
                [##_comment_group_##]
              </s_rp>
            </section>
          </s_permalink_article_rep>
        </s_notice_rep>

        <!-- 방명록. 티스토리가 UI 전체를 렌더하므로 CSS 로만 손댈 수 있다. -->
        <s_guest>
          <div class="list-header"><h1>방명록</h1></div>
          <div class="guestbook">
            [##_guestbook_group_##]
          </div>
        </s_guest>

        <!-- 태그 클라우드 페이지. tag_class 는 빈도별로 cloud1~cloud5 가 붙는다. -->
        <s_tag>
          <div class="list-header"><h1>태그 클라우드</h1></div>
          <div class="tag-cloud">
            <s_tag_rep>
              <a href="[##_tag_link_##]" class="tag-cloud-item [##_tag_class_##]">#[##_tag_name_##]</a>
            </s_tag_rep>
          </div>
        </s_tag>

        <!--
          페이지네이션.
          [##_prev_page_##] 등은 속성 치환자다. href="..." 로 감싸면 링크가 깨진다.
          태그 속성 자리에 그대로 넣어야 한다.
        -->
        <s_paging>
          <nav class="paging">
            <a [##_prev_page_##] class="paging-btn [##_no_more_prev_##]">이전</a>
            <s_paging_rep>
              <a [##_paging_rep_link_##] class="paging-num">[##_paging_rep_link_num_##]</a>
            </s_paging_rep>
            <a [##_next_page_##] class="paging-btn [##_no_more_next_##]">다음</a>
          </nav>
        </s_paging>

      </div>
    </main>
  </div>

  <footer class="site-footer">
    <div class="footer-inner">
      <p><span id="footer-year"></span> [##_blogger_##]</p>
      <button id="scroll-to-top" class="icon-btn" title="맨 위로" aria-label="맨 위로">위로</button>
    </div>
  </footer>

</s_t3>

<script src="./images/script.js" defer></script>
</body>
</html>
`;
}

/** 프리셋 정의에서 index.xml 을 만든다. */
export function buildIndexXml(preset, meta = {}) {
  const p = { ...DEFAULTS, ...preset };
  const name = esc(meta.name || `${p.name} 스킨`);
  const version = esc(meta.version || '1.0.0');
  const author = esc(meta.author || 'Tistory Skin Maker');

  return `<?xml version="1.0" encoding="utf-8"?>
<skin>
  <information>
    <name>${name}</name>
    <version>${version}</version>
    <description>${esc(p.desc || '')}</description>
    <license>MIT</license>
  </information>
  <author>
    <name>${author}</name>
  </author>
  <default>
    <recentEntries>5</recentEntries>
    <recentComments>5</recentComments>
    <entriesOnPage>10</entriesOnPage>
    <sortInCategory>date_asc</sortInCategory>
    <expandComment>true</expandComment>
    <expandTree>true</expandTree>
  </default>
  <variables>
    <variablegroup name="디자인">
      <variable>
        <name>accentColor</name>
        <label>대표 색상</label>
        <type>COLOR</type>
        <default>${esc(p.tokens?.['color-accent'] || '#3b82f6')}</default>
      </variable>
      <variable>
        <name>codeFont</name>
        <label>코드 폰트</label>
        <type>STRING</type>
        <default>${esc(p.codeFont)}</default>
      </variable>
    </variablegroup>
    <variablegroup name="기능">
      <variable>
        <name>enableSearch</name>
        <label>검색창 표시</label>
        <type>BOOL</type>
        <default>true</default>
      </variable>
    </variablegroup>
  </variables>
</skin>
`;
}

export { DEFAULTS };
