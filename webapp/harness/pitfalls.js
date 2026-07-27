/**
 * 티스토리 실전 함정 목록
 *
 * src/0.9.8 -> 1.8.0을 만들면서 실제로 걸렸던 것들. 대부분 문법은 멀쩡한데
 * 티스토리에 올려야만 드러나는 종류라서, 모델에게 미리 알려주지 않으면
 * 사용자가 업로드하고 나서야 발견한다.
 *
 * detect가 있는 항목은 정적으로 잡을 수 있다. 나머지는 프롬프트로만 전달한다.
 *
 * severity:
 *   'error' - 결과물이 확실히 깨진다
 *   'warn'  - 깨질 가능성이 높다
 *   'info'  - 알고 있어야 하지만 자동 판정은 불가
 */

export const PITFALLS = [
  {
    id: 'p-margin',
    title: '본문 문단 여백이 0으로 강제된다',
    severity: 'error',
    why:
      '티스토리는 글 본문을 .tt_article_useless_p_margin 으로 감싸고 p 여백을 0으로 만든다. ' +
      '이 규칙이 크로스 오리진 스타일시트에서 오므로 같은 특이도의 일반 규칙으로는 못 이긴다. ' +
      '마크다운으로 쓴 글은 문단이 연속 p로 나와서 전부 벽처럼 붙어버린다. (1.8.0)',
    rule: '.article-content p 에 margin-bottom 을 !important 로 지정할 것.',
    detect(files) {
      const css = files['style.css'] || '';
      if (!/\.article-content\s+p\s*\{[^}]*margin-bottom[^}]*!important/s.test(css)) {
        return '.article-content p 의 margin-bottom 에 !important 가 없다. 티스토리에서 문단이 전부 붙어 보인다.';
      }
      return null;
    },
  },

  {
    id: 'empty-p',
    title: '에디터의 빈 줄이 사라진다',
    severity: 'warn',
    why:
      '티스토리 에디터에서 엔터로 만든 빈 줄은 빈 <p></p>로 출력되는데, ' +
      '빈 요소는 높이 0으로 접혀서 줄바꿈이 통째로 사라진다. (1.7.0)',
    rule: '.article-content p:empty 에 min-height 를 줄 것.',
    detect(files) {
      const css = files['style.css'] || '';
      if (!/\.article-content\s+p:empty\s*\{[^}]*min-height/s.test(css)) {
        return '.article-content p:empty 의 min-height 가 없다. 글의 빈 줄이 사라진다.';
      }
      return null;
    },
  },

  {
    id: 'prose-width',
    title: 'prose 클래스가 본문 폭을 좁힌다',
    severity: 'warn',
    why:
      'Tailwind typography 의 .prose 는 max-width: 65ch 를 갖는다. 커스텀 CSS가 ' +
      'Tailwind보다 뒤에 로드되면 같은 특이도에서 커스텀이 이겨, HTML에 max-w-none 을 ' +
      '붙여도 본문이 560px로 좁아진다. (1.4.0에서 실제로 발생)',
    rule: '.prose 를 재정의할 때 max-width: none 을 명시할 것.',
    detect(files) {
      const css = files['style.css'] || '';
      const html = files['skin.html'] || '';
      if (!/\bprose\b/.test(html)) return null;
      const m = css.match(/\.prose\s*\{[^}]*\}/s);
      if (m && /max-width\s*:\s*65ch/.test(m[0])) {
        return '.prose 에 max-width: 65ch 가 남아 있다. 본문이 좁아진다. max-width: none 으로 바꿀 것.';
      }
      return null;
    },
  },

  {
    id: 'codeblock-wrap',
    title: '코드블록이 가로로 넘친다',
    severity: 'info',
    why:
      'Prism 테마가 code 요소에 white-space: pre 를 걸어서, pre 쪽만 pre-wrap 으로 ' +
      '바꾸면 안 먹는다. code 쪽도 같이 덮어써야 한다. (1.3.0)',
    rule: 'pre 와 pre code 양쪽에 white-space: pre-wrap 을 지정할 것.',
  },

  {
    id: 'paging-attr',
    title: '페이지네이션 치환자는 속성 자리에 들어간다',
    severity: 'error',
    why:
      '[##_prev_page_##] 등은 값이 아니라 속성 치환자다. href="[##_prev_page_##]" 로 쓰면 ' +
      '링크가 깨진다. <a [##_prev_page_##]> 처럼 태그 속성 자리에 통째로 넣어야 한다.',
    rule: '<a [##_prev_page_##] class="... [##_no_more_prev_##]">이전</a> 형태로 쓸 것.',
    detect(files) {
      const html = files['skin.html'] || '';
      const bad = /(?:href|src)\s*=\s*["'][^"']*\[##_(prev_page|next_page|paging_rep_link)_##\]/;
      const m = html.match(bad);
      if (m) {
        return `[##_${m[1]}_##] 를 ${m[0].split('=')[0].trim()} 속성 값으로 감쌌다. 속성 자리에 그대로 넣어야 한다.`;
      }
      return null;
    },
  },

  {
    id: 's-t3',
    title: 's_t3 래퍼 누락',
    severity: 'error',
    why: '티스토리가 공통 스크립트를 주입하는 지점이다. 없으면 댓글, 광고, 관리 기능이 전부 동작하지 않는다.',
    rule: '모든 body 콘텐츠는 <s_t3> 안에 있어야 한다.',
    detect(files) {
      const html = files['skin.html'] || '';
      if (!/<s_t3>/.test(html) || !/<\/s_t3>/.test(html)) {
        return '<s_t3> 래퍼가 없다. 티스토리 공통 기능이 전부 동작하지 않는다.';
      }
      return null;
    },
  },

  {
    id: 'body-id',
    title: 'body_id 누락',
    severity: 'error',
    why: '페이지 타입별 스타일링과 스크립트 분기가 전부 이 값에 의존한다.',
    rule: '<body id="[##_body_id_##]"> 로 쓸 것.',
    detect(files) {
      const html = files['skin.html'] || '';
      if (!/<body[^>]*id\s*=\s*["']\[##_body_id_##\]["']/.test(html)) {
        return '<body> 의 id 가 [##_body_id_##] 가 아니다. 페이지 타입 감지가 동작하지 않는다.';
      }
      return null;
    },
  },

  {
    id: 'skin-var-scope',
    title: '스킨 옵션 치환자는 skin.html에서만 치환된다',
    severity: 'error',
    why:
      '[##_var_xxx_##] 는 style.css 나 script.js 에서는 치환되지 않고 문자 그대로 남는다. ' +
      '관리자 옵션을 스타일에 반영하려면 skin.html 의 인라인 <style> 에서 CSS 변수로 넘겨야 한다.',
    rule: 'skin.html head 의 <style> 안에서 :root { --color-accent: [##_var_accentColor_##]; } 식으로 주입하고, style.css 는 그 변수를 읽을 것.',
    detect(files) {
      const css = files['style.css'] || '';
      const m = css.match(/\[##_var_[a-zA-Z0-9_]+_##\]/);
      if (m) return `style.css 에 ${m[0]} 가 있다. CSS 파일에서는 치환되지 않는다.`;
      const js = files['images/script.js'] || '';
      const mj = js.match(/\[##_var_[a-zA-Z0-9_]+_##\]/);
      if (mj) return `script.js 에 ${mj[0]} 가 있다. JS 파일에서는 치환되지 않는다.`;
      return null;
    },
  },

  {
    id: 'no-observer',
    title: 'MutationObserver 로 검색을 구현하지 말 것',
    severity: 'info',
    why:
      '과거 이 프로젝트에서 observer 기반 검색이 무한 루프를 일으켰다. ' +
      '티스토리가 DOM을 계속 건드리기 때문에 observer 콜백이 스스로를 다시 트리거한다.',
    rule: '검색은 엔터 입력 시 location.href = "/search/" + encodeURIComponent(q) 로 단순 이동시킬 것.',
  },

  {
    id: 'subscription-visibility',
    title: '구독 버튼은 소유자에게 보이지 않는다',
    severity: 'info',
    why:
      '[##_subscription_button_##] 는 비로그인 방문자와 타계정 방문자에게만 렌더된다. ' +
      '블로그 소유자가 로그인한 상태로 자기 블로그를 보면 버튼이 안 나오는 것이 정상이다.',
    rule: '버튼이 안 보인다고 마크업을 고치지 말 것. 로그아웃 상태에서 확인할 것.',
  },

  {
    id: 'no-view-count',
    title: '조회수는 스킨에서 제공되지 않는다',
    severity: 'info',
    why:
      '티스토리는 조회수 치환자를 제공하지 않고, 오픈 API도 2024년에 종료됐다. ' +
      '관리자 통계 화면에서만 확인 가능하다. 자체 수집이 필요하면 Google Analytics 삽입이 유일한 방법이다.',
    rule: '조회수 표기를 넣지 말 것. 존재하지 않는 치환자를 지어내게 되는 주된 원인이다.',
  },

  {
    id: 'empty-notice',
    title: '공지가 없어도 래퍼가 출력될 수 있다',
    severity: 'info',
    why: '공지 글이 하나도 없을 때 s_rct_notice 래퍼만 남아 빈 영역이 생기는 경우가 있다. (1.4.0)',
    rule: '최근 공지 블록에 id 를 주고, 스크립트에서 항목이 없으면 숨길 것.',
  },

  {
    id: 'notice-scope',
    title: '공지 블록 안에서는 notice_rep_* 를 써야 한다',
    severity: 'error',
    why:
      's_notice_rep 안에서 article_rep_* 를 쓰면 문법은 통과하지만 값이 비어서 나온다. ' +
      '검증 없이는 업로드해야만 드러난다.',
    rule: 's_notice_rep 안에서는 notice_rep_title / notice_rep_desc / notice_rep_link 등을 쓸 것.',
  },

  {
    id: 'upload-two-places',
    title: 'images/ 아래 파일은 따로 업로드해야 한다',
    severity: 'info',
    why:
      'skin.html 과 style.css 는 스킨 편집 화면에서 갱신되지만, images/script.js 와 ' +
      'images/tailwind.css 는 "파일업로드" 탭에서 별도로 올려야 한다. 기존 파일을 지우고 다시 올려야 한다. ' +
      '이걸 빠뜨리면 404가 나면서 레이아웃 전체가 깨진다. (1.3.0)',
    rule: '설치 안내에 파일업로드 탭 단계를 반드시 포함할 것.',
  },

  {
    id: 'editor-blocks',
    title: '에디터 특수 블록에 스타일이 필요하다',
    severity: 'info',
    why:
      '티스토리 에디터는 인용 3종(data-ke-style), 구분선 8종, 파일 첨부, 더보기(moreless), ' +
      '이미지 블록/그리드/슬라이드, 오픈그래프 카드를 고유 마크업으로 출력한다. ' +
      '스타일이 없으면 글 안에서 이 요소들만 무너져 보인다.',
    rule: '공유 style.css 의 에디터 블록 섹션을 지우지 말 것.',
  },
];

/**
 * 생성된 파일 묶음에 정적 검사가 가능한 함정을 전부 적용한다.
 * @param {Record<string,string>} files - { 'skin.html': ..., 'style.css': ..., ... }
 * @returns {{id:string, severity:string, title:string, message:string, rule:string}[]}
 */
export function checkPitfalls(files) {
  const found = [];
  for (const p of PITFALLS) {
    if (typeof p.detect !== 'function') continue;
    let msg = null;
    try {
      msg = p.detect(files);
    } catch {
      // 검사 자체가 실패해도 생성을 막지 않는다
      continue;
    }
    if (msg) {
      found.push({ id: p.id, severity: p.severity, title: p.title, message: msg, rule: p.rule });
    }
  }
  return found;
}

/**
 * 모델에게 보여줄 함정 요약. 정적으로 못 잡는 것일수록 중요하다.
 */
export function pitfallsSummary() {
  return PITFALLS.map((p) => `- ${p.title}\n  이유: ${p.why}\n  규칙: ${p.rule}`).join('\n');
}
