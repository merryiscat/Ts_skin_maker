# 개발 전달 안내

티스토리 스킨 생성기 화면 디자인. 아래 파일만 옮기면 된다.

## 옮길 것 (필수 2개)

| 파일 | 역할 |
|------|------|
| `design.css` | 공용 스타일 전부. 현행 `shell.css` 를 대체한다 |
| `theme.js` | 테마 세 가지 전환. `<html data-theme>` 하나만 바꾸고 localStorage 에 기억한다 |

`shell.css` 를 지우고 `design.css` 를 link 한 뒤, `theme.js` 를 body 끝에서 로드한다.
외부 의존 없음 — 웹폰트·프레임워크·아이콘 라이브러리 전부 쓰지 않는다.

```html
<link rel="stylesheet" href="./design.css">
...
<script src="./theme.js"></script>
```

테마 버튼을 놓을 자리에 빈 `<div class="themebar"></div>` 하나만 두면 `theme.js` 가 채운다.

## 참고용 (마크업 베끼는 원본)

| 파일 | 화면 |
|------|------|
| `E1.html` | 진입 / 키 등록 |
| `P1.html` | 컨셉 고르기 |
| `P2.html` | 세부 정하기 |
| `W1.html` | 작업 화면 |
| `D1.html` | 내려받기 / 설치 안내 |
| `S1.html` | 설정 |
| `index.html` | 여섯 화면 목록 + 골격·테마·포팅 메모 |
| `palettes.html` | 팔레트 후보 8 (선택 기록. 앱에는 넣지 않음) |

각 화면 파일은 상태를 나란히 그린 명세 문서다. `.spec` / `.spec-*` 로 감싼 부분은
명세용 껍데기이므로 앱에 넣지 않는다. 그 안쪽 마크업만 가져간다.

`E1-v1.html`, `E1-v2.html` 은 폐기한 초기안이다. 전달하지 않아도 된다.

## 클래스 계약

현행 `e1-dom-snapshot.html` 의 클래스명과 변수명을 유지했다. JS 가 뿜는 DOM 을
그대로 두고 CSS 만 갈아끼워도 깨지지 않는다.

- 유지: `--bg --surface --border --text --dim --accent --danger --radius`,
  `.appbar .page .panel .panel-head .panel-body .panel-foot .field .field-label
  .field-note .opts .opt .on .row .spacer .card .selected .dashed .list .badge
  .busy .mono .small .tiny .dim .primary .sm .danger .ghost .block .note .msg
  .msg-role .msg-body .split .scroll .from-concept`
- 추가: `.chatshell .chatpane .chat-head .chat-body .chat-foot .steprail
  .canvas .canvas-head .canvas-body .msg-form .composer .shot(+하위)
  .admin(+하위) .path .drawer .tabs .tab pre.code .eyebrow .token .flow
  .list.rows .list.steps-list .panel.featured .field.aligned`

## 골격 요약

왼쪽 대화(`.chatpane`, 900px 이상에서 400px) + 오른쪽 화면(`.canvas`).
여섯 화면이 같은 골격을 쓰고, 단계마다 오른쪽 내용만 갈린다.
각 단계의 입력 폼은 응답 말풍선 안 `.msg-form` 으로 들어간다.
모바일(900px 미만)에서는 대화가 전체 폭이 되고 오른쪽은 `.tabs` 로 전환한다.

구조를 와이어와 다르게 잡은 곳은 해당 HTML 상단 주석에 이유를 적어 두었다.
요약하면 두 곳이다.

- P2 - 와이어의 "목록 / 도식" 전환을 없애고 한 화면에 합쳤다. 폭이 모자라 나눴던 것이다.
- S1 - 겹치는 패널을 오른쪽에서 왼쪽 대화 자리로 옮겼다. 결과 보는 자리를 가리지 않는다.

## 테마

`design.css` 3b 절에 세 블록이 있다. 색뿐 아니라 라운드·그림자까지 정한다.

| `data-theme` | 이름 | 성격 |
|--------------|------|------|
| `acid` | 아씨드 콘크리트 | 직각 · 검은 굵은 선 · 형광 라임 + 바이올렛 · 오프셋 그림자 |
| `solar` | 솔라 사막 | 모래 판 · 청회 잉크 · 오아시스 청록 (기본값) |
| `moss` | 이끼와 유자 | 이끼 잉크 · 풀빛 판 · 유자 노랑 |

주행동 버튼은 `--accent` 배경 + `--on-accent` 글자색을 쓴다. 테마를 더 만들 때
이 둘을 짝으로 정의해야 한다. 상태색(`--ok` `--danger`)은 테마마다 따로 눌러
강조색과 겹치지 않게 한다.

## 남은 것

- 미리보기 도식(`.shot`)은 어두운 테마에서 같이 어두워진다. 실제 스킨 미리보기가
  흰 바탕이라 W1 에서 도식 판만 밝게 고정할지 정해야 한다.
- 아이콘은 쓰지 않는다. 필요한 기호는 유니코드(`▸ ▾ ✓ ▲ ▼`)로 해결했다.
