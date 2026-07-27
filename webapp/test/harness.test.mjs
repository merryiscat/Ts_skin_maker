/**
 * 하네스 검사기 테스트
 *
 * 실행: node webapp/test/harness.test.mjs   (저장소 루트에서)
 *
 * 두 방향으로 검사한다.
 *   긍정 - 이미 디버깅이 끝난 src/1.9.0 은 전부 통과해야 한다.
 *          검사기가 과하면 여기서 걸린다.
 *   부정 - 일부러 망가뜨린 것은 반드시 잡혀야 한다.
 *          검사기가 무르면 여기서 걸린다.
 *
 * 부정 검사 항목은 대부분 이 프로젝트에서 실제로 겪은 사고를 재현한 것이다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkPitfalls } from '../harness/pitfalls.js';
import {
  auditPlaceholders,
  auditGroupTags,
  extractVarConditionNames,
  contractSummary,
} from '../harness/contract.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const ref = path.resolve(here, '../../src/1.9.0');
const read = (p) => fs.readFileSync(path.join(ref, p), 'utf8');

const files = {
  'skin.html': read('skin.html'),
  'style.css': read('style.css'),
  'index.xml': read('index.xml'),
  'images/script.js': read('images/script.js'),
};

let failures = 0;
function ok(cond, label, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? '  :: ' + extra : ''}`);
  if (!cond) failures++;
}

/** auditPlaceholders 결과를 테스트에서 다루기 쉬운 형태로 편다. */
function audit(html) {
  const r = auditPlaceholders(html);
  return {
    unknown: r.unknown,
    blacklisted: r.blacklisted.map((x) => x.name),
    scopeErrors: r.scopeErrors.map((x) => x.name),
  };
}

console.log('--- 긍정: 검증된 1.9.0 은 통과해야 한다 ---');

const clean = checkPitfalls(files);
ok(clean.length === 0, '함정 검사 0건', clean.map((f) => `${f.id}: ${f.message}`).join(' | '));

const a = audit(files['skin.html']);
ok(a.unknown.length === 0, '미등록 치환자 없음', a.unknown.join(', '));
ok(a.blacklisted.length === 0, '블랙리스트 위반 없음', a.blacklisted.join(', '));
ok(a.scopeErrors.length === 0, '스코프 위반 없음', a.scopeErrors.join(', '));
ok(extractVarConditionNames(files['skin.html']).includes('enableSearch'), '조건부 변수 추출');

const g = auditGroupTags(files['skin.html']);
ok(g.unknown.length === 0, '미등록 그룹 태그 없음', g.unknown.join(', '));
ok(g.unbalanced.length === 0, '그룹 태그 여닫이 균형',
  g.unbalanced.map((x) => `${x.tag} ${x.open}/${x.close}`).join(', '));
ok(g.parentErrors.length === 0, '그룹 태그 부모 관계',
  g.parentErrors.map((x) => x.message).join(' | '));

console.log('\n--- 부정: 망가뜨린 것은 잡아야 한다 ---');

// 1.4.0 에서 실제로 나온 환각. 존재하지 않는 조회수 치환자.
ok(
  audit(
    files['skin.html'].replace(
      '[##_article_rep_date_##]</time>',
      '[##_article_rep_date_##] 조회 [##_article_rep_log_cnt_##]</time>',
    ),
  ).blacklisted.includes('article_rep_log_cnt'),
  '없는 조회수 치환자',
);

ok(
  audit(files['skin.html'].replace('[##_article_rep_title_##]', '[##_article_rep_titel_##]'))
    .unknown.includes('article_rep_titel'),
  '오타 치환자',
);

// 공지 블록 안에서 article_rep_* 를 쓰면 값이 비어서 렌더된다.
// s_notice_rep 안에도 s_permalink_article_rep 이 중첩되므로 스코프만으로는 못 잡는다.
ok(
  audit(files['skin.html'].replace('[##_notice_rep_desc_##]', '[##_article_rep_desc_##]'))
    .scopeErrors.includes('article_rep_desc'),
  '공지 블록 안의 article_rep_*',
);

ok(
  audit(files['skin.html'].replace('[##_article_rep_summary_##]', '[##_article_rep_desc_##]'))
    .scopeErrors.includes('article_rep_desc'),
  '목록에서 상세 전용 치환자',
);

// 페이징은 속성 치환자다. href 로 감싸면 링크가 깨진다.
ok(
  checkPitfalls({
    ...files,
    'skin.html': files['skin.html'].replace('<a [##_prev_page_##]', '<a href="[##_prev_page_##]"'),
  }).some((f) => f.id === 'paging-attr'),
  '페이징 치환자를 href 로 감싼 경우',
);

ok(
  checkPitfalls({ ...files, 'skin.html': files['skin.html'].replace(/<\/?s_t3>/g, '') })
    .some((f) => f.id === 's-t3'),
  's_t3 래퍼 누락',
);

ok(
  checkPitfalls({ ...files, 'style.css': files['style.css'].replace(/!important/g, '') })
    .some((f) => f.id === 'p-margin'),
  '문단 여백 !important 누락',
);

ok(
  checkPitfalls({
    ...files,
    'style.css': ':root{--x:[##_var_accentColor_##];}\n' + files['style.css'],
  }).some((f) => f.id === 'skin-var-scope'),
  'CSS 안의 스킨 변수 치환자',
);

ok(
  checkPitfalls({
    ...files,
    'skin.html': files['skin.html'].replace('id="[##_body_id_##]"', 'id="blog"'),
  }).some((f) => f.id === 'body-id'),
  'body_id 누락',
);

// 없는 그룹 태그를 지어낸 경우. 티스토리는 이 블록을 렌더하지 않는다.
ok(
  auditGroupTags(files['skin.html'].replace('<s_paging>', '<s_article_views><s_paging>')
    .replace('</s_paging>', '</s_paging></s_article_views>')).unknown.includes('s_article_views'),
  '없는 그룹 태그',
);

// 부모가 필요한 태그를 밖으로 꺼낸 경우.
ok(
  auditGroupTags('<s_t3><s_paging_rep><a>1</a></s_paging_rep></s_t3>')
    .parentErrors.some((e) => e.tag === 's_paging_rep'),
  '부모 없는 s_paging_rep',
);

// 닫는 태그 누락.
ok(
  auditGroupTags(files['skin.html'].replace('</s_guest>', ''))
    .unbalanced.some((x) => x.tag === 's_guest'),
  '닫는 태그 누락',
);

// self-closing 그룹 태그(<s_x />)는 그 자리에서 열리고 닫힌 것이다.
// 예전에는 open 만 세어 self-closing 이 하나라도 있으면 항상 불균형으로
// 오검출됐다. scopesAt 은 self-closing 을 no-op 으로 보므로 모순이었다.
{
  const r = auditGroupTags('<s_t3><s_ad_div /></s_t3>');
  ok(r.unbalanced.length === 0, 'self-closing 태그는 불균형이 아니다',
    r.unbalanced.map((x) => `${x.tag} ${x.open}/${x.close}`).join(', '));
}
ok(
  auditGroupTags('<s_t3><s_article_views /></s_t3>').unknown.includes('s_article_views'),
  'self-closing 이어도 없는 그룹 태그는 잡는다',
);
ok(
  auditGroupTags('<s_t3><s_paging_rep /></s_t3>').parentErrors.some((e) => e.tag === 's_paging_rep'),
  'self-closing 이어도 부모 필요 검사는 받는다',
);

// 회귀 방지: 주석 안에서 치환자를 설명하는 것은 정상이다.
// 1.8.0 은 각 블록 위 주석에 치환자를 적어 두는데, 마스킹하지 않으면 오탐이 9건 난다.
{
  const r = audit('<!-- [##_article_rep_desc_##] 는 상세에서만 쓴다 -->\n<s_t3></s_t3>');
  ok(r.scopeErrors.length === 0 && r.unknown.length === 0, '주석 안의 언급은 무시');
}

const summary = contractSummary();
console.log(`\n계약서 요약 ${summary.length}자 (약 ${Math.round(summary.length / 2.2)} 토큰)`);
console.log(failures === 0 ? '\n전체 통과' : `\n실패 ${failures}건`);
process.exit(failures === 0 ? 0 : 1);
