/**
 * 본문 글꼴 카탈로그
 *
 * 무료·오픈소스(SIL OFL) 한국어 웹폰트를 모아 둔다. 사용자가 검색형 입력칸에서
 * 고르면 그 글꼴의 CDN 스타일시트를 스킨 <head> 에 넣고 --font-body 에 적용한다.
 *
 * 시스템 글꼴(url 없음)은 웹폰트를 안 받아 가장 빠르다. 나머지는 로딩이 붙지만
 * 종류가 많고 무료다. 대부분 Google Fonts, Pretendard 는 jsDelivr.
 *
 * family - CSS font-family 값 그대로
 * url    - 넣을 스타일시트 링크(없으면 시스템 글꼴)
 * cat    - 검색칸에서 묶어 보여줄 갈래
 */

// Google Fonts css2 링크. 여러 굵기가 있으면 wght 를 준다.
const g = (name, wght) =>
  `https://fonts.googleapis.com/css2?family=${name.replace(/ /g, '+')}` +
  (wght ? `:wght@${wght}` : '') +
  '&display=swap';

export const FONT_CATALOG = [
  // 시스템 (웹폰트 안 받음)
  { id: 'sans', label: '시스템 고딕', cat: '시스템', family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif", url: null },
  { id: 'serif', label: '시스템 명조', cat: '시스템', family: "Georgia, 'Times New Roman', serif", url: null },
  { id: 'mono', label: '시스템 고정폭', cat: '시스템', family: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace", url: null },

  // 고딕(산세리프)
  { id: 'pretendard', label: 'Pretendard', cat: '고딕', family: "'Pretendard', sans-serif", url: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css' },
  { id: 'noto-sans-kr', label: '본고딕 (Noto Sans KR)', cat: '고딕', family: "'Noto Sans KR', sans-serif", url: g('Noto Sans KR', '400;500;700') },
  { id: 'nanum-gothic', label: '나눔고딕', cat: '고딕', family: "'Nanum Gothic', sans-serif", url: g('Nanum Gothic', '400;700;800') },
  { id: 'gothic-a1', label: 'Gothic A1', cat: '고딕', family: "'Gothic A1', sans-serif", url: g('Gothic A1', '400;500;700') },
  { id: 'ibm-plex-sans-kr', label: 'IBM Plex Sans KR', cat: '고딕', family: "'IBM Plex Sans KR', sans-serif", url: g('IBM Plex Sans KR', '400;500;700') },
  { id: 'gowun-dodum', label: '고운돋움', cat: '고딕', family: "'Gowun Dodum', sans-serif", url: g('Gowun Dodum') },
  { id: 'sunflower', label: 'Sunflower', cat: '고딕', family: "'Sunflower', sans-serif", url: g('Sunflower', '300;500;700') },
  { id: 'do-hyeon', label: '도현', cat: '고딕', family: "'Do Hyeon', sans-serif", url: g('Do Hyeon') },
  { id: 'jua', label: '주아', cat: '고딕', family: "'Jua', sans-serif", url: g('Jua') },
  { id: 'black-han-sans', label: '검은고딕 (Black Han Sans)', cat: '고딕', family: "'Black Han Sans', sans-serif", url: g('Black Han Sans') },
  { id: 'stylish', label: 'Stylish', cat: '고딕', family: "'Stylish', sans-serif", url: g('Stylish') },

  // 명조(세리프)
  { id: 'noto-serif-kr', label: '본명조 (Noto Serif KR)', cat: '명조', family: "'Noto Serif KR', serif", url: g('Noto Serif KR', '400;500;700') },
  { id: 'nanum-myeongjo', label: '나눔명조', cat: '명조', family: "'Nanum Myeongjo', serif", url: g('Nanum Myeongjo', '400;700;800') },
  { id: 'gowun-batang', label: '고운바탕', cat: '명조', family: "'Gowun Batang', serif", url: g('Gowun Batang', '400;700') },
  { id: 'song-myung', label: '송명 (Song Myung)', cat: '명조', family: "'Song Myung', serif", url: g('Song Myung') },
  { id: 'hahmlet', label: 'Hahmlet', cat: '명조', family: "'Hahmlet', serif", url: g('Hahmlet', '400;500;700') },
  { id: 'diphylleia', label: 'Diphylleia', cat: '명조', family: "'Diphylleia', serif", url: g('Diphylleia') },

  // 손글씨
  { id: 'nanum-pen', label: '나눔손글씨 펜', cat: '손글씨', family: "'Nanum Pen Script', cursive", url: g('Nanum Pen Script') },
  { id: 'nanum-brush', label: '나눔손글씨 붓', cat: '손글씨', family: "'Nanum Brush Script', cursive", url: g('Nanum Brush Script') },
  { id: 'gaegu', label: '개구 (Gaegu)', cat: '손글씨', family: "'Gaegu', cursive", url: g('Gaegu', '300;400;700') },
  { id: 'gamja-flower', label: '감자꽃', cat: '손글씨', family: "'Gamja Flower', cursive", url: g('Gamja Flower') },
  { id: 'hi-melody', label: 'Hi Melody', cat: '손글씨', family: "'Hi Melody', cursive", url: g('Hi Melody') },
  { id: 'kirang-haerang', label: '기랑해랑', cat: '손글씨', family: "'Kirang Haerang', cursive", url: g('Kirang Haerang') },
  { id: 'poor-story', label: '푸어스토리', cat: '손글씨', family: "'Poor Story', cursive", url: g('Poor Story') },
  { id: 'single-day', label: 'Single Day', cat: '손글씨', family: "'Single Day', cursive", url: 'https://fonts.googleapis.com/css2?family=Single+Day&display=swap' },
  { id: 'cute-font', label: 'Cute Font', cat: '손글씨', family: "'Cute Font', cursive", url: g('Cute Font') },
  { id: 'dokdo', label: '독도 (Dokdo)', cat: '손글씨', family: "'Dokdo', cursive", url: g('Dokdo') },
  { id: 'yeon-sung', label: '연성 (Yeon Sung)', cat: '손글씨', family: "'Yeon Sung', cursive", url: g('Yeon Sung') },

  // 장식·개성
  { id: 'gugi', label: 'Gugi', cat: '장식', family: "'Gugi', cursive", url: g('Gugi') },
  { id: 'gasoek-one', label: '가속 (Gasoek One)', cat: '장식', family: "'Gasoek One', sans-serif", url: g('Gasoek One') },
  { id: 'bagel-fat-one', label: 'Bagel Fat One', cat: '장식', family: "'Bagel Fat One', system-ui", url: g('Bagel Fat One') },
  { id: 'moirai-one', label: 'Moirai One', cat: '장식', family: "'Moirai One', system-ui", url: g('Moirai One') },
  { id: 'orbit', label: 'Orbit', cat: '장식', family: "'Orbit', sans-serif", url: g('Orbit') },

  // 고정폭
  { id: 'nanum-gothic-coding', label: '나눔고딕코딩', cat: '고정폭', family: "'Nanum Gothic Coding', monospace", url: g('Nanum Gothic Coding', '400;700') },
  { id: 'jetbrains-mono', label: 'JetBrains Mono', cat: '고정폭', family: "'JetBrains Mono', monospace", url: g('JetBrains Mono', '400;700') },
];

export const FONT_BY_ID = Object.fromEntries(FONT_CATALOG.map((f) => [f.id, f]));

/** id 로 글꼴을 찾는다. 모르면 시스템 고딕. */
export function fontById(id) {
  return FONT_BY_ID[id] || FONT_BY_ID.sans;
}
