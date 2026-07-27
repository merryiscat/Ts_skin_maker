/**
 * 미리보기 렌더러 테스트
 *
 * 실행: node webapp/test/render.test.mjs [시각확인용_출력경로]
 *
 * 렌더러가 틀리면 사용자가 잘못된 것을 보고 판단하게 된다. 루프의 확인 지점이라
 * 여기서 새는 것이 가장 비싸다.
 *
 * 세 가지를 본다.
 *   1. 치환자와 그룹 태그가 하나도 남지 않는가
 *   2. 페이지 타입마다 나와야 할 것이 나오고 나오면 안 되는 것이 안 나오는가
 *   3. 사이드바 없음 같은 조합에서도 무너지지 않는가
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const baseDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../presets/base');

import { renderPreview, PREVIEW_PAGES } from '../loop/render.js';
import { PREVIEW_EXTRA_CSS } from '../loop/mock-data.js';
import { defaultDetails, detailsToPreset } from '../harness/spec.js';
import { buildSkinHtml } from '../presets/base/skeleton.js';

let failures = 0;
function ok(cond, label, extra = '') {
  if (!cond) {
    console.log(`FAIL  ${label}${extra ? '  :: ' + extra : ''}`);
    failures++;
  }
  return cond;
}

const preset = detailsToPreset({
  ...defaultDetails(),
  sidebarBlocks: ['profile', 'categories', 'tags', 'notice', 'menu'],
  listItems: ['thumbnail', 'summary', 'tags', 'commentCount'],
  features: ['toc', 'search', 'subscribe', 'syntax'],
});
const skin = buildSkinHtml(preset);

/** 렌더 결과에 남으면 안 되는 것들. */
function leftovers(html) {
  const out = [];
  const ph = html.match(/\[##_[a-zA-Z0-9_]+_##\]/g);
  if (ph) out.push(`치환자 잔존: ${[...new Set(ph)].join(', ')}`);
  // 여는 태그든 닫는 태그든 s_ 로 시작하는 티스토리 태그가 남으면 안 된다
  const tags = html.match(/<\/?s_[a-zA-Z0-9_]+\s*\/?>/g);
  if (tags) out.push(`그룹 태그 잔존: ${[...new Set(tags)].join(', ')}`);
  return out;
}

console.log('--- 페이지 타입별 렌더 ---');

const rendered = {};
for (const page of PREVIEW_PAGES) {
  const html = renderPreview(skin, {
    pageType: page.id,
    css: '/* css */',
    js: '/* js */',
    extraCss: PREVIEW_EXTRA_CSS,
  });
  rendered[page.id] = html;

  const l = leftovers(html);
  ok(l.length === 0, `${page.label} (${page.id}) 잔존 없음`, l.join(' | '));
  ok(html.includes(`id="${page.id}"`), `${page.label} body id 주입`);
  ok(html.length > 1500, `${page.label} 내용이 비지 않음`, `${html.length}자`);
}

console.log('--- 페이지 타입마다 맞는 것이 나오는가 ---');

const index = rendered['tt-body-index'];
const permalink = rendered['tt-body-page'];
const guestbook = rendered['tt-body-guestbook'];
const tagPage = rendered['tt-body-tag'];
const category = rendered['tt-body-category'];
const notice = rendered['tt-body-notice'];

ok(index.includes('티스토리 스킨을 직접 만들면서'), '홈에 글 목록이 나온다');
ok(!index.includes('class="post-title"'), '홈에 글 상세가 안 나온다');
ok(index.includes('class="paging"'), '홈에 페이지네이션이 나온다');
// 실제 블로그에서 확인한 사항. 홈에서도 s_list 가 렌더된다
ok(index.includes('class="list-header"'), '홈에도 목록 머리말이 나온다');

ok(permalink.includes('class="post-title"'), '상세에 글 제목이 나온다');
// 티스토리가 본문에 씌우는 래퍼는 재현하지 않는다. 가짜 데이터에는 그 클래스가 없으므로
// 문단 여백 문제 같은 것은 미리보기로 못 잡는다. 실제 업로드 확인이 여전히 필요하다.
ok(
  !/class="[^"]*tt_article_useless_p_margin/.test(permalink),
  '상세는 티스토리 본문 래퍼를 흉내내지 않는다',
);
ok(permalink.includes('본문이 붙어 보이는 이유'), '상세에 본문이 들어간다');
ok(permalink.includes('mock-comments'), '상세에 댓글 영역이 나온다');
ok(!permalink.includes('class="paging"'), '상세에는 페이지네이션이 없다');

ok(category.includes('class="list-header"'), '카테고리에 목록 머리말이 나온다');
ok(category.includes('티스토리 스킨을 직접 만들면서'), '카테고리에 글 목록이 나온다');

ok(guestbook.includes('방명록'), '방명록 제목이 나온다');
ok(guestbook.includes('mock-comments'), '방명록에 댓글 UI 가 나온다');
ok(!guestbook.includes('class="post-title"'), '방명록에 글 상세가 안 나온다');

ok(tagPage.includes('tag-cloud-item'), '태그 페이지에 태그가 나온다');
ok(tagPage.includes('cloud1'), '태그 빈도 클래스가 들어간다');

ok(notice.includes('공지'), '공지 페이지가 나온다');

console.log('--- 반복이 실제로 여러 번 도는가 ---');
{
  const items = (index.match(/class="card"/g) || []).length;
  ok(items >= 5, '홈 글 목록이 여러 건', `${items}건`);

  // 구조만 반복되고 내용이 비는 버그가 있었다. 항목마다 다른 값이 들어갔는지 본다.
  const titles = [...index.matchAll(/class="card-title">\s*<a[^>]*>([^<]+)<\/a>/g)]
    .map((m) => m[1].trim())
    .filter(Boolean);
  ok(titles.length >= 5, '목록 항목마다 제목이 채워진다', `${titles.length}개`);
  ok(new Set(titles).size === titles.length, '항목마다 서로 다른 제목', titles.join(' / '));
  const tags = (tagPage.match(/tag-cloud-item/g) || []).length;
  ok(tags >= 8, '태그가 여러 개', `${tags}개`);
  const pages = (index.match(/class="paging-num"/g) || []).length;
  ok(pages >= 3, '페이지 번호가 여러 개', `${pages}개`);
}

console.log('--- 빈 화면 문구가 페이지마다 다른가 ---');
{
  // 글이 없는 홈에서 "다른 검색어로 시도해 보세요" 가 뜨면 말이 안 된다.
  // 새로 스킨을 깐 사람이 처음 보는 화면이라 특히 중요하다.
  const css = fs.readFileSync(path.join(baseDir, 'style.css'), 'utf8');

  ok(skin.includes('on-index') && skin.includes('on-search'), '문구를 페이지별로 나눠 넣었다');
  ok(/\.empty-desc\s*>\s*span\s*\{\s*display:\s*none/.test(css.replace(/\s+/g, ' ')), '기본은 전부 감춤');

  for (const [page, cls] of [
    ['tt-body-index', 'on-index'],
    ['tt-body-search', 'on-search'],
    ['tt-body-category', 'on-category'],
    ['tt-body-tag', 'on-tag'],
  ]) {
    ok(
      new RegExp(`#${page}[^{]*\\.${cls}`).test(css),
      `${page} 에 맞는 문구를 고르는 규칙이 있다`,
    );
  }
}

console.log('--- 조건부 변수 ---');
{
  const off = renderPreview(skin, {
    pageType: 'tt-body-index',
    css: '', js: '',
    vars: { enableSearch: false },
  });
  ok(!off.includes('id="search-input"'), '검색 끄면 검색창이 사라진다');
  ok(leftovers(off).length === 0, '검색 끈 상태에도 잔존 없음', leftovers(off).join(' | '));

  const on = renderPreview(skin, { pageType: 'tt-body-index', css: '', js: '', vars: { enableSearch: true } });
  ok(on.includes('id="search-input"'), '검색 켜면 검색창이 나온다');
}

console.log('--- 사이드바 없는 조합 ---');
{
  const noSide = buildSkinHtml(detailsToPreset({ ...defaultDetails(), sidebar: 'none' }));
  const html = renderPreview(noSide, { pageType: 'tt-body-index', css: '', js: '' });
  ok(leftovers(html).length === 0, '사이드바 없음 잔존 없음', leftovers(html).join(' | '));
  ok(!html.includes('id="sidebar"'), '사이드바가 실제로 없다');
  ok(html.includes('class="top-nav"'), '대신 상단 메뉴가 나온다');
}

console.log('--- 외부 파일이 인라인으로 들어가는가 ---');
{
  const html = renderPreview(skin, {
    pageType: 'tt-body-index',
    css: '.marker-css{color:red}',
    js: 'window.MARKER_JS=1;',
  });
  ok(html.includes('.marker-css'), 'CSS 가 인라인으로 들어간다');
  ok(html.includes('window.MARKER_JS'), 'JS 가 인라인으로 들어간다');
  ok(!html.includes('href="./style.css"'), '외부 CSS 링크가 남지 않는다');
  ok(!html.includes('src="./images/script.js"'), '외부 JS 링크가 남지 않는다');
}

// 시각 확인용 파일을 요청하면 만들어 준다
const outPath = process.argv[2];
if (outPath) {
  const tabs = PREVIEW_PAGES.map(
    (p, i) =>
      `<button class="tab${i === 0 ? ' on' : ''}" data-t="${p.id}">${p.label}</button>`,
  ).join('');
  const frames = PREVIEW_PAGES.map(
    (p, i) =>
      `<iframe class="fr${i === 0 ? ' on' : ''}" data-t="${p.id}" srcdoc="${rendered[p.id]
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')}"></iframe>`,
  ).join('');
  fs.writeFileSync(
    outPath,
    `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>미리보기 확인</title>
<style>
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans KR',sans-serif;background:#eee}
.bar{display:flex;gap:4px;padding:8px;background:#fff;border-bottom:1px solid #ccc;flex-wrap:wrap}
.tab{padding:5px 10px;border:1px solid #ccc;background:#fff;font:inherit;font-size:12px;cursor:pointer;border-radius:3px}
.tab.on{background:#222;color:#fff;border-color:#222}
.fr{display:none;width:100%;height:calc(100vh - 45px);border:0;background:#fff}
.fr.on{display:block}
</style></head><body>
<div class="bar">${tabs}</div>${frames}
<script>
document.querySelectorAll('.tab').forEach(function(b){b.addEventListener('click',function(){
  document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('on')});
  document.querySelectorAll('.fr').forEach(function(x){x.classList.remove('on')});
  b.classList.add('on');
  document.querySelector('.fr[data-t="'+b.dataset.t+'"]').classList.add('on');
})});
</script></body></html>`,
    'utf8',
  );
  console.log(`\n시각 확인용 생성: ${outPath}`);
}

console.log(failures === 0 ? '\n전체 통과' : `\n실패 ${failures}건`);
process.exit(failures === 0 ? 0 : 1);
