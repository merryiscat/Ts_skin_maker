#!/usr/bin/env python3
"""로컬 개발 서버 (브라우저 캐시 끔).

`python -m http.server` 는 Cache-Control 헤더를 안 보낸다. 그래서 코드를 고쳐도
브라우저가 옛 ES 모듈(webapp/screens/*.js 등)을 캐시로 서빙해서, 화면에는 수정이
안 보이고 "안 고쳤네?" 로 보이는 일이 잦았다(실제로 여러 번 겪음).

이 서버는 모든 응답에 no-store 를 붙여 매번 새로 받게 한다. 그러면 저장만 하면
새로고침으로 바로 반영된다.

실행 (저장소 루트에서):
    python serve.py            # 포트 8000
    python serve.py 8002       # 포트 지정
그다음 브라우저:  http://localhost:8000/webapp/
(윈도우에서는 serve.cmd 를 더블클릭하거나 PowerShell 에서  .\\serve.cmd  로 실행해도 된다.)
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    """모든 응답에 캐시 금지 헤더를 붙인다."""

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f"no-cache 개발 서버: http://localhost:{port}/webapp/   (Ctrl+C 로 종료)")
    ThreadingHTTPServer(("", port), NoCacheHandler).serve_forever()


if __name__ == "__main__":
    main()
