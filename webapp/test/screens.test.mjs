/**
 * 화면 모듈 통합 검사
 *
 * 실행: node webapp/test/screens.test.mjs   (저장소 루트에서)
 *
 * 화면은 브라우저에서만 완전히 돌지만, 여기서 잡을 수 있는 것이 꽤 있다.
 *   - import 경로 오타. 화면을 열어야만 드러나는 종류다
 *   - mount 를 안 내보내는 실수
 *   - 모듈 최상단에서 DOM 을 건드리는 실수. 그러면 Node 에서 바로 터진다
 *   - 이모지 혼입
 *
 * 아직 안 만든 화면은 건너뛰고 무엇이 비었는지만 알린다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const screensDir = path.resolve(here, '../screens');
// s1 은 단계 흐름에 없는 설정 서랍이지만, 화면 모듈 규약은 똑같이 지켜야 한다
// p2 는 2026-08-30 제거(W1 과 미리보기가 같아 사용자가 구분 못 함). C1 다음 바로 W1.
const EXPECTED = ['e1', 'c1', 'p1', 'w1', 'd1', 's1'];

let failures = 0;
function ok(cond, label, extra = '') {
  if (!cond) {
    console.log(`FAIL  ${label}${extra ? '  :: ' + extra : ''}`);
    failures++;
  }
  return cond;
}

// 이모지 범위. 화살표와 일반 기호는 뺀다
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2700}-\u{27BF}\u{FE0F}\u{2049}\u{203C}]/u;

const missing = [];
const found = [];

for (const id of EXPECTED) {
  const file = path.join(screensDir, `${id}.js`);
  if (!fs.existsSync(file)) {
    missing.push(id);
    continue;
  }
  found.push(id);

  const src = fs.readFileSync(file, 'utf8');

  ok(!EMOJI.test(src), `${id}: 이모지 없음`, (src.match(EMOJI) || [])[0]);

  // 최상단에서 DOM 을 건드리면 Node 에서 import 만으로 터진다.
  // mount 안에서 쓰는 것은 정상이므로 import 성공 여부로 판정한다.
  let mod = null;
  try {
    mod = await import(`../screens/${id}.js`);
  } catch (e) {
    ok(false, `${id}: import 성공`, String(e.message).split('\n')[0]);
    continue;
  }

  ok(typeof mod.mount === 'function', `${id}: mount 를 내보냄`);
  ok(mod.mount.length >= 2, `${id}: mount(root, ctx) 서명`, `인자 ${mod.mount.length}개`);

  // 화면은 상태를 직접 고치면 안 된다. state.js 의 내부 set 을 쓰는 흔적이 없어야 한다
  ok(!/\bfrom\s+['"].*app\/state\.js['"]/.test(src), `${id}: state.js 를 직접 import 하지 않음`, 'ctx.actions 로 받아야 한다');
}

// 라우팅 표와 실제 파일이 맞는지. 한쪽만 고치면 화면이 안 뜬다
{
  const appSrc = fs.readFileSync(path.resolve(here, '../app/app.js'), 'utf8');
  for (const id of EXPECTED) {
    ok(
      appSrc.includes(`screens/${id}.js`),
      `app.js 라우팅에 ${id} 가 있음`,
    );
  }
}

// 공용 스타일에 없는 클래스를 새로 쓰면 화면마다 모양이 갈린다.
// 완전한 검사는 어려우므로 style 태그를 새로 박는 것만 막는다
for (const id of found) {
  const src = fs.readFileSync(path.join(screensDir, `${id}.js`), 'utf8');
  ok(!/<style[\s>]/.test(src), `${id}: 화면 안에 style 태그를 넣지 않음`, 'shell.css 를 쓸 것');
}

console.log(`\n확인한 화면: ${found.join(', ') || '없음'}`);
if (missing.length) console.log(`아직 없는 화면: ${missing.join(', ')}`);

console.log(failures === 0 ? '\n전체 통과' : `\n실패 ${failures}건`);
process.exit(failures === 0 ? 0 : 1);
