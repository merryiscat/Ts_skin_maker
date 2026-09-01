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

/**
 * iframe 에 와이어를 넣고, 내용 높이에 맞춰 iframe 높이를 자동으로 맞춘다.
 * 고정 높이면 큰 레이아웃(그리드·히어로)이 잘리므로, 로드 후 scrollHeight 로 늘린다.
 *
 * sandbox 는 allow-same-origin 만 준다(스크립트는 소독으로 이미 제거됨 + allow-scripts
 * 없음). 그래야 부모가 contentDocument 로 높이를 잴 수 있다.
 */
export function mountWire(iframe, wireHtml) {
  iframe.setAttribute('sandbox', 'allow-same-origin');
  const fit = () => {
    try {
      const doc = iframe.contentDocument;
      if (doc) iframe.style.height = Math.max(120, doc.documentElement.scrollHeight) + 'px';
    } catch {
      // 높이를 못 재면 인라인 초기 높이를 그대로 둔다
    }
  };
  iframe.addEventListener('load', fit, { once: true });
  iframe.srcdoc = renderWireDoc(wireHtml);
}
