/**
 * 와이어프레임 iframe 문서 조립
 *
 * P1 이 모델에게 받은(소독된) 와이어 HTML 을, 흑백 kit(ui/wire.js)과 함께 하나의
 * 문서로 묶어 iframe srcdoc 으로 넣는다. render.js 가 미리보기를 iframe 에 넣는 것과
 * 같은 방식이다. <style> 을 쓰므로 화면 모듈(screens/*)이 아니라 여기(loop/)에 둔다 -
 * screens.test.mjs 가 화면 안의 <style> 을 막는다.
 */

import { WIRE_CSS } from '../ui/wire.js';

/**
 * @param {string} wireHtml - sanitizeWireHtml 을 이미 통과한 HTML
 * @returns {string} iframe.srcdoc 에 넣을 완결된 문서
 */
export function renderWireDoc(wireHtml) {
  return (
    '<!doctype html><html lang="ko"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    `<style>\n${WIRE_CSS}\n</style></head><body>` +
    (wireHtml || '') +
    '</body></html>'
  );
}
