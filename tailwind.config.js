/**
 * Tailwind CSS 빌드 설정
 *
 * 과거에는 skin.html에서 CDN(cdn.tailwindcss.com)으로 Tailwind를 불러왔지만,
 * 1.2.0부터는 이 설정으로 "미리 빌드한 CSS"(images/tailwind.css)를 사용합니다.
 * (CDN 방식은 방문자 브라우저가 매번 CSS를 실시간 생성해서 느리고,
 *  Tailwind 공식이 프로덕션 사용을 금지하는 방식이었음)
 *
 * 빌드 방법: npm run build:css
 * 주의: 새 버전 폴더(예: src/1.5.0)를 만들면
 *       아래 content 경로와 package.json의 출력 경로도 함께 바꿔야 합니다.
 */
module.exports = {
  // 이 파일들에서 실제로 쓰인 클래스만 골라 CSS를 생성합니다
  content: [
    './src/1.9.0/skin.html',
    './src/1.9.0/preview.html',
    './src/1.9.0/images/script.js'
  ],

  // 다크 모드: body의 dark 클래스 기준 (이 스킨은 다크 전용이라 항상 켜져 있음)
  darkMode: 'class',

  theme: {
    extend: {
      colors: {
        // accent를 CSS 변수로 연결:
        // 관리자 페이지에서 바꾼 강조 색상(accentColor)이
        // focus:ring-accent 같은 Tailwind 클래스에도 반영되게 함
        accent: 'var(--color-accent)',
        'editor-bg': '#1e1e1e',
        'sidebar-bg': '#252526',
        'editor-text': '#d4d4d4'
      },
      fontFamily: {
        code: ['JetBrains Mono', 'monospace']
      }
    }
  }
};
