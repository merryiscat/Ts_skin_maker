@echo off
REM 캐시 끄는 로컬 개발 서버. 더블클릭하거나 PowerShell 에서  .\serve.cmd [포트]  로 실행.
REM python -m http.server 대신 이걸 쓰면 코드 수정이 새로고침으로 바로 반영된다.
cd /d "%~dp0"
python serve.py %*
