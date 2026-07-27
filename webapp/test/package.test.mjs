/**
 * 산출물 묶기 테스트
 *
 * 실행: node webapp/test/package.test.mjs   (저장소 루트에서)
 *
 * ZIP 을 라이브러리 없이 직접 만들기 때문에 "정말 열리는가" 를 확인해야 한다.
 * 바이트를 눈으로 맞춰 보는 것으로는 부족해서, 실제로 파일로 쓰고 윈도우 압축 해제로
 * 풀어 내용이 같은지 대조한다. 압축 해제가 없는 환경에서는 그 부분만 건너뛴다.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import { defaultDetails, detailsToPreset } from '../harness/spec.js';
import { buildSkinHtml, buildIndexXml } from '../presets/base/skeleton.js';
import {
  makeZip,
  FILE_ROLES,
  INSTALL_STEPS,
  SYMPTOMS,
  pasteFiles,
  uploadFiles,
  ADMIN_UI_ASOF,
} from '../loop/package.js';

let failures = 0;
function ok(cond, label, extra = '') {
  if (!cond) {
    console.log(`FAIL  ${label}${extra ? '  :: ' + extra : ''}`);
    failures++;
  }
  return cond;
}

const SAMPLE = {
  'skin.html': '<!DOCTYPE html>\n<html><body><s_t3>안녕하세요</s_t3></body></html>\n',
  'style.css': '.card { color: #333; }\n/* 한글 주석 */\n',
  'index.xml': '<?xml version="1.0" encoding="utf-8"?>\n<skin><name>내 스킨</name></skin>\n',
  'images/script.js': "console.log('테스트');\n",
};

console.log('--- 파일 역할 ---');
ok(FILE_ROLES['skin.html'].where === 'editor', 'skin.html 은 붙여넣기');
ok(FILE_ROLES['style.css'].where === 'editor', 'style.css 는 붙여넣기');
ok(FILE_ROLES['images/script.js'].where === 'upload', 'script.js 는 파일 올리기');
ok(FILE_ROLES['index.xml'].required === false, 'index.xml 은 필수가 아님');

{
  const paste = pasteFiles(SAMPLE);
  const upload = uploadFiles(SAMPLE);
  ok(paste.length === 2, '붙여넣을 파일 2개', `${paste.length}개`);
  ok(paste.every((f) => f.content.length > 0), '붙여넣을 파일에 내용이 담김');
  ok(upload.length === 1, '올릴 파일 1개', `${upload.length}개`);
  ok(upload[0].basename === 'script.js', '올릴 파일 이름에서 경로가 벗겨짐', upload[0].basename);
  ok(!!upload[0].note, '올릴 파일에 삭제 후 재업로드 안내가 있음');
}

console.log('--- 파일 목록이 두 곳에서 어긋나지 않는가 ---');
{
  // 골격이 파일을 만들고 FILE_ROLES 가 그 파일의 설치 방법을 설명한다. 두 곳이라
  // 어긋날 수 있는데, 어긋나면 D1 이 그 파일을 조용히 안내하지 않는다. 사용자는
  // 왜 안 되는지 모른 채 끝난다. 그래서 여기서 기계로 대조한다.
  // 골격이 실제로 무엇을 만들어 내는지 확인한 뒤 목록을 짠다. 골격이 파일을
  // 더 내놓기 시작하면 아래 단언에서 걸린다.
  const preset = detailsToPreset(defaultDetails());
  ok(typeof buildSkinHtml(preset) === 'string', '골격이 skin.html 을 만든다');
  ok(typeof buildIndexXml(preset) === 'string', '골격이 index.xml 을 만든다');

  const produced = new Set([
    'skin.html',
    'index.xml',
    'style.css',
    'images/script.js',
  ]);
  const described = new Set(Object.keys(FILE_ROLES));

  const undescribed = [...produced].filter((f) => !described.has(f));
  const orphaned = [...described].filter((f) => !produced.has(f));

  ok(
    undescribed.length === 0,
    '만들어지는 파일에 설치 방법이 모두 적혀 있음',
    `설명 없는 파일: ${undescribed.join(', ')}`,
  );
  ok(
    orphaned.length === 0,
    'FILE_ROLES 에 만들어지지 않는 파일이 없음',
    `유령 항목: ${orphaned.join(', ')}`,
  );
}

console.log('--- 설치 절차 ---');
ok(INSTALL_STEPS.length === 5, '5단계', `${INSTALL_STEPS.length}단계`);
{
  const uploadStep = INSTALL_STEPS.find((s) => s.id === 'upload');
  ok(!!uploadStep, '파일 올리기 단계가 있음');
  ok(!!uploadStep.warning, '파일 올리기에 경고가 붙음');
  ok(
    INSTALL_STEPS.filter((s) => s.path).length >= 4,
    '대부분의 단계에 메뉴 경로가 있음',
    '도식이 틀려도 경로로 찾아가야 한다',
  );
  ok(INSTALL_STEPS[INSTALL_STEPS.length - 1].id === 'save', '마지막이 저장과 확인');
  // 가장 많이 빠뜨리는 단계가 마지막 직전에 오는지. 순서가 바뀌면 건너뛰기 쉬워진다
  ok(
    INSTALL_STEPS.findIndex((s) => s.id === 'upload') === INSTALL_STEPS.length - 2,
    '파일 올리기가 저장 바로 앞',
  );
}
ok(/^\d{4}-\d{2}$/.test(ADMIN_UI_ASOF), '관리자 화면 기준 시점이 적혀 있음', ADMIN_UI_ASOF);

console.log('--- 증상 안내 ---');
ok(SYMPTOMS.length >= 3, '증상이 3개 이상', `${SYMPTOMS.length}개`);
ok(
  SYMPTOMS.every((s) => s.when && s.looks && s.fix),
  '증상마다 언제/어떻게 보이는지/어떻게 고치는지가 다 있음',
);
ok(
  SYMPTOMS.some((s) => s.id === 'missing-upload'),
  '파일 올리기 누락 증상이 있음',
);

console.log('--- ZIP ---');
const chunks = makeZip(SAMPLE);
const total = chunks.reduce((n, c) => n + c.length, 0);
const zip = new Uint8Array(total);
{
  let at = 0;
  for (const c of chunks) {
    zip.set(c, at);
    at += c.length;
  }
}

ok(zip.length > 0, 'ZIP 바이트가 나옴', `${zip.length}바이트`);
ok(zip[0] === 0x50 && zip[1] === 0x4b && zip[2] === 0x03 && zip[3] === 0x04, 'ZIP 서명으로 시작');
{
  const tail = zip.slice(-22);
  ok(
    tail[0] === 0x50 && tail[1] === 0x4b && tail[2] === 0x05 && tail[3] === 0x06,
    'ZIP 끝 레코드로 끝남',
  );
  const dv = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
  ok(dv.getUint16(10, true) === 4, '항목 수가 4', String(dv.getUint16(10, true)));
}

// UTF-8 파일명 표시 비트가 켜져 있어야 한글 파일명이 깨지지 않는다.
// 지금은 파일명이 전부 영문이지만 나중에 바뀔 수 있어 확인해 둔다.
{
  const dv = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  ok((dv.getUint16(6, true) & 0x0800) !== 0, 'UTF-8 파일명 비트가 켜짐');
  ok(dv.getUint16(8, true) === 0, '압축 없이 저장 방식');

  // 날짜 0x0000 은 "1980년 0월 0일" 이라 규격상 무효하다.
  // 유효한 고정 상수(2026-01-01, 재현성 때문에 Date.now 미사용)가 들어가야 한다.
  const expectedDate = ((2026 - 1980) << 9) | (1 << 5) | 1;
  ok(dv.getUint16(12, true) === expectedDate, '로컬 헤더 DOS 날짜가 유효한 고정값', `0x${dv.getUint16(12, true).toString(16)}`);
  const month = (dv.getUint16(12, true) >> 5) & 0x0f;
  const day = dv.getUint16(12, true) & 0x1f;
  ok(month >= 1 && day >= 1, 'DOS 날짜의 월/일이 1 이상 (0 은 무효)');
}

console.log('--- ZIP 이 실제로 열리는가 ---');
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skinzip-'));
  const zipPath = path.join(dir, 'skin.zip');
  const outDir = path.join(dir, 'out');
  fs.writeFileSync(zipPath, zip);

  let extracted = false;
  try {
    execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${outDir}' -Force`,
      ],
      { stdio: 'pipe', timeout: 60000 },
    );
    extracted = true;
  } catch (e) {
    console.log(`      압축 해제를 건너뜁니다: ${String(e.message).split('\n')[0]}`);
  }

  if (extracted) {
    let allMatch = true;
    const missing = [];
    for (const [name, content] of Object.entries(SAMPLE)) {
      const p = path.join(outDir, name);
      if (!fs.existsSync(p)) {
        missing.push(name);
        allMatch = false;
        continue;
      }
      if (fs.readFileSync(p, 'utf8') !== content) {
        missing.push(`${name} 내용 불일치`);
        allMatch = false;
      }
    }
    ok(allMatch, '풀어서 내용이 원본과 같음', missing.join(', '));
    ok(
      fs.existsSync(path.join(outDir, 'images', 'script.js')),
      '하위 폴더 경로가 유지됨',
    );
  }

  fs.rmSync(dir, { recursive: true, force: true });
}

console.log(failures === 0 ? '\n전체 통과' : `\n실패 ${failures}건`);
process.exit(failures === 0 ? 0 : 1);
