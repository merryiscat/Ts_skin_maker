/**
 * 미리보기용 가짜 데이터
 *
 * 티스토리 서버 없이 치환자를 렌더하려면 값이 필요하다. Tidory 는 이 문제를
 * ts_session 쿠키로 티스토리 서버를 찔러서 푸는데, 공식 API 가 아니라 언제든
 * 깨질 수 있고 브라우저에서는 애초에 불가능하다. 대신 그럴듯한 가짜 값을 넣는다.
 *
 * 값은 일부러 한국어로, 그리고 길이를 제각각으로 뒀다. 짧은 제목만 넣으면
 * 제목이 두 줄로 넘칠 때 레이아웃이 깨지는 걸 못 본다.
 */

const IMG = (w, h, label) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<rect width="${w}" height="${h}" fill="#d8d5cf"/>` +
      `<text x="50%" y="50%" font-family="sans-serif" font-size="${Math.round(w / 14)}" ` +
      `fill="#8a857c" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`,
  );

const BLOG = {
  title: '작업 기록',
  desc: '만든 것과 고친 것을 남겨 두는 곳입니다.',
  blogger: '김하늘',
  image: IMG(160, 160, '프로필'),
  blog_link: '#',
  rss_url: '#',
  taglog_link: '#',
  guestbook_link: '#',
  page_title: '작업 기록',
  tag: '개발, 기록, 회고',
};

const ARTICLES = [
  {
    title: '티스토리 스킨을 직접 만들면서 알게 된 것들',
    summary:
      '치환자 문서만 보고 만들면 반드시 한 번은 깨진다. 실제로 올려 봐야만 드러나는 문제가 있고, ' +
      '그중 절반은 문법이 멀쩡해서 더 찾기 어렵다. 열네 번의 버전을 거치며 정리한 내용을 남긴다.',
    category: '개발',
    date: '2026. 7. 20. 14:32',
    simple_date: '2026. 7. 20.',
    tags: ['티스토리', '스킨', '프론트엔드'],
    rp: 12,
    thumb: IMG(640, 360, '이미지'),
  },
  {
    title: '작은 도구를 오래 쓰는 법',
    summary:
      '한 번 만들고 방치한 스크립트가 반년 뒤에도 돌아가려면 무엇이 필요한지 생각해 봤다.',
    category: '기록',
    date: '2026. 7. 14. 09:05',
    simple_date: '2026. 7. 14.',
    tags: ['도구', '유지보수'],
    rp: 3,
    thumb: IMG(640, 360, '이미지'),
  },
  {
    title: 'CSS 우선순위 때문에 이틀을 날린 이야기',
    summary:
      '분명히 맞게 썼는데 적용이 안 됐다. 원인은 로드 순서였고, 같은 특이도에서는 나중에 온 쪽이 이긴다는 ' +
      '당연한 규칙을 잊고 있었다.',
    category: '개발',
    date: '2026. 7. 2. 21:47',
    simple_date: '2026. 7. 2.',
    tags: ['CSS', '디버깅'],
    rp: 0,
    thumb: IMG(640, 360, '이미지'),
  },
  {
    title: '여름 밤 산책',
    summary: '별다른 일은 없었지만 기록해 둘 만한 저녁이었다.',
    category: '일상',
    date: '2026. 6. 28. 22:10',
    simple_date: '2026. 6. 28.',
    tags: ['일상'],
    rp: 5,
    thumb: IMG(640, 360, '이미지'),
  },
  {
    title: '읽고 나서 한참 생각한 문장',
    summary: '문장 하나가 오래 남을 때가 있다. 그 이유를 적어 두려고 한다.',
    category: '기록',
    date: '2026. 6. 19. 11:20',
    simple_date: '2026. 6. 19.',
    tags: ['독서', '기록'],
    rp: 1,
    thumb: IMG(640, 360, '이미지'),
  },
  {
    title: '정리하지 않으면 쌓이기만 한다',
    summary: '메모가 늘어날수록 찾는 시간이 길어졌다. 분류를 다시 세웠다.',
    category: '기록',
    date: '2026. 6. 11. 08:00',
    simple_date: '2026. 6. 11.',
    tags: ['정리', '메모'],
    rp: 2,
    thumb: IMG(640, 360, '이미지'),
  },
];

/** 글 본문. 에디터 특수 블록이 실제로 어떻게 나오는지 확인할 수 있게 섞어 뒀다. */
const ARTICLE_BODY = `
<p>티스토리 스킨은 HTML 파일 하나에 치환자를 박아 넣는 방식으로 만듭니다. 문서만 보면 단순해 보이는데, 실제로 올려 보면 문서에 안 적힌 것들이 계속 나옵니다.</p>
<p></p>
<p>가장 오래 붙잡은 것은 문단 여백이었습니다. 분명히 CSS 를 넣었는데 본문이 벽처럼 붙어 있었습니다.</p>
<h2>본문이 붙어 보이는 이유</h2>
<p>티스토리는 글 본문을 <code>.tt_article_useless_p_margin</code> 이라는 클래스로 감쌉니다. 이름 그대로 p 태그의 여백을 없애는 용도입니다.</p>
<blockquote data-ke-style="style1"><p>같은 특이도라면 나중에 로드된 쪽이 이깁니다. 그런데 이 규칙은 다른 도메인의 스타일시트에서 옵니다.</p></blockquote>
<p>그래서 일반 규칙으로는 이길 수 없고 <code>!important</code> 가 필요합니다.</p>
<pre data-ke-language="css"><code>.article-content p {
  margin-bottom: 0.875em !important;
}</code></pre>
<h3>확인 방법</h3>
<p>실제 글이 올라간 페이지에서 개발자 도구로 CSS 를 임시 주입해 봤습니다. 적용 전 <code>0px</code>, 적용 후 <code>27px</code> 이 나오는 걸 보고서야 확정할 수 있었습니다.</p>
<ul>
  <li>미리보기로는 이 문제를 못 잡습니다</li>
  <li>가짜 데이터에는 티스토리의 래퍼 클래스가 없기 때문입니다</li>
  <li>그래서 실제 업로드 확인이 여전히 필요합니다</li>
</ul>
<hr data-ke-style="style2">
<p>비슷한 종류의 문제가 몇 개 더 있었고, 전부 목록으로 정리해 두었습니다. 다음에 같은 것을 다시 겪지 않으려면 기록해 두는 수밖에 없습니다.</p>
<figure data-ke-type="imageblock" class="alignCenter">
  <img src="${IMG(720, 400, '본문 이미지')}" alt="예시 이미지">
  <figcaption>본문에 들어간 이미지와 설명</figcaption>
</figure>
<p>정리하면, 문서를 읽는 것과 실제로 올려 보는 것 사이에는 항상 간격이 있습니다.</p>
`;

const CATEGORIES = [
  { name: '개발', count: 24, children: [{ name: '프론트엔드', count: 11 }, { name: '도구', count: 6 }] },
  { name: '기록', count: 17, children: [] },
  { name: '일상', count: 9, children: [] },
];

const TAGS = [
  { name: '티스토리', cls: 'cloud1' },
  { name: '개발', cls: 'cloud1' },
  { name: 'CSS', cls: 'cloud2' },
  { name: '기록', cls: 'cloud2' },
  { name: '프론트엔드', cls: 'cloud3' },
  { name: '디버깅', cls: 'cloud3' },
  { name: '도구', cls: 'cloud4' },
  { name: '메모', cls: 'cloud4' },
  { name: '회고', cls: 'cloud5' },
  { name: '독서', cls: 'cloud5' },
];

const NOTICES = [
  { title: '블로그 운영 방침 안내', summary: '댓글과 인용에 대한 안내입니다.', date: '2026. 1. 5. 10:00', simple_date: '2026. 1. 5.' },
  { title: '검색 유입 관련 공지', summary: '일부 글의 주소가 변경되었습니다.', date: '2025. 12. 1. 09:00', simple_date: '2025. 12. 1.' },
];

/* ------------------------------------------------------------ 목업 조립 */

// 글마다 공유하는 날짜·댓글수. 테마가 달라도 이건 그대로 쓴다.
const POST_META = [
  ['2026. 7. 20. 14:32', '2026. 7. 20.', 12],
  ['2026. 7. 14. 09:05', '2026. 7. 14.', 3],
  ['2026. 7. 2. 21:47', '2026. 7. 2.', 0],
  ['2026. 6. 28. 22:10', '2026. 6. 28.', 5],
  ['2026. 6. 19. 11:20', '2026. 6. 19.', 1],
  ['2026. 6. 11. 08:00', '2026. 6. 11.', 2],
];
const THUMB = IMG(640, 360, '이미지');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 하드코딩 기본 목업. LLM 샘플이 아직 없을 때 쓴다. */
export function mockDefault() {
  return { BLOG, ARTICLES, ARTICLE_BODY, CATEGORIES, TAGS, NOTICES };
}

/**
 * LLM 이 만든 샘플(sample-prompt.js 스키마)을 미리보기 목업 구조로 옮긴다.
 * 값이 모자라면 기본 목업으로 메운다 - 미리보기가 깨지지 않게.
 */
export function mockFrom(sample) {
  if (!sample || !Array.isArray(sample.posts) || !sample.posts.length) return mockDefault();

  const cats = (sample.categories || []).length ? sample.categories : ['기록'];
  const tags = (sample.tags || []).length ? sample.tags : cats;

  const BLOG_S = {
    title: sample.blogTitle || '내 블로그',
    desc: sample.blogDesc || '',
    blogger: sample.blogger || '글쓴이',
    image: IMG(160, 160, '프로필'),
    blog_link: '#',
    rss_url: '#',
    taglog_link: '#',
    guestbook_link: '#',
    page_title: sample.blogTitle || '내 블로그',
    tag: tags.slice(0, 3).join(', '),
  };

  const ARTICLES_S = sample.posts.slice(0, 6).map((p, i) => {
    const meta = POST_META[i] || POST_META[POST_META.length - 1];
    return {
      title: p.title || '제목',
      summary: p.summary || '',
      category: p.category || cats[0],
      date: meta[0],
      simple_date: meta[1],
      tags: (p.tags || []).slice(0, 3),
      rp: meta[2],
      thumb: THUMB,
    };
  });

  const CATEGORIES_S = cats.slice(0, 4).map((name, i) => ({
    name,
    count: [24, 17, 9, 6][i] || 8,
    children: [],
  }));

  const TAGS_S = tags.slice(0, 10).map((name, i) => ({ name, cls: 'cloud' + ((i % 5) + 1) }));

  const paras = (sample.bodyParagraphs || []).length
    ? sample.bodyParagraphs
    : ['미리보기용 본문입니다.'];
  // 본문에 소제목과 이미지 한 장을 섞어 특수 블록 스타일도 함께 보이게 한다
  const ARTICLE_BODY_S =
    `<p>${esc(paras[0])}</p>` +
    (paras[1] ? `<h2>${esc(ARTICLES_S[0]?.title || '자세히')}</h2><p>${esc(paras[1])}</p>` : '') +
    paras.slice(2).map((p) => `<p>${esc(p)}</p>`).join('') +
    `<figure data-ke-type="imageblock" class="alignCenter">` +
    `<img src="${IMG(720, 400, '본문 이미지')}" alt="예시 이미지">` +
    `<figcaption>본문에 들어간 이미지와 설명</figcaption></figure>`;

  return {
    BLOG: BLOG_S,
    ARTICLES: ARTICLES_S,
    ARTICLE_BODY: ARTICLE_BODY_S,
    CATEGORIES: CATEGORIES_S,
    TAGS: TAGS_S,
    NOTICES,
  };
}

/** 카테고리 트리 HTML. 티스토리가 자동 생성하는 마크업을 흉내 낸다. */
export function categoryListHtml(categories = CATEGORIES) {
  const li = (c) =>
    `<li><a href="#">${c.name}<span class="cnt"> (${c.count})</span></a>` +
    (c.children && c.children.length
      ? `<ul>${c.children.map(li).join('')}</ul>`
      : '') +
    '</li>';
  return `<ul>${categories.map(li).join('')}</ul>`;
}

/** 댓글 영역. 티스토리가 React 로 렌더하는 부분이라 형태만 흉내 낸다. */
export function commentsHtml() {
  return `
  <div class="mock-comments">
    <p class="mock-comment-count">댓글 2</p>
    <div class="mock-comment">
      <strong>이재현</strong>
      <p>잘 봤습니다. 다음 글도 기대할게요.</p>
      <span class="mock-comment-date">2026. 7. 21. 09:12</span>
    </div>
    <div class="mock-comment">
      <strong>박서영</strong>
      <p>공감이 많이 가네요. 감사합니다.</p>
      <span class="mock-comment-date">2026. 7. 20. 18:40</span>
    </div>
    <p class="mock-note">실제 댓글 UI 는 티스토리가 렌더합니다. 미리보기에서는 형태만 보여 줍니다.</p>
  </div>`;
}

/** 미리보기에서만 쓰는 보조 스타일. 가짜 댓글 영역 등. */
export const PREVIEW_EXTRA_CSS = `
.mock-comments { border: 1px dashed var(--color-border); border-radius: var(--radius); padding: 1rem; }
.mock-comment-count { margin: 0 0 0.75rem; font-weight: 600; font-size: 0.875rem; }
.mock-comment { padding: 0.75rem 0; border-top: 1px solid var(--color-border); font-size: 0.875rem; }
.mock-comment strong { display: block; margin-bottom: 0.25rem; }
.mock-comment p { margin: 0 0 0.25rem; }
.mock-comment-date { color: var(--color-text-dim); font-size: 0.75rem; }
.mock-note { margin: 0.75rem 0 0; color: var(--color-text-dim); font-size: 0.75rem; }
`;

export { IMG };
