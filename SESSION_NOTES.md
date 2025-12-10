# 작업 세션 노트

## 2025-12-11 세션 1

### ✅ 완료한 작업

#### 1. 프로젝트 초기 설정
- 티스토리 스킨 제작 프로젝트 계획 수립
- 요구사항 확인: 개인 기술 블로그, 모던 디자인, SEO/성능 최적화

#### 2. 참고 자료 분석
- `reference/` 디렉토리 5개 스킨 분석 완료:
  - hannoone_skin_v1.3.2 (경량, SEO, 스크립트 최적화)
  - Odyssey (반응형, 4가지 리스트 스타일)
  - pg_Poster (포트폴리오, 슬라이더)
  - tistory_discord_ui (Tailwind, 다크모드)
  - xf_Portfolio (캐러셀, 그리드)

#### 3. 문서 작성
- ✅ **TISTORY_quick_reference.md** 생성
  - 자주 쓰는 핵심 치환자 50-60개 정리
  - 6가지 실전 패턴 예제 포함
  - 400줄, 5-8KB (원본 72KB 문서의 축약버전)
- ✅ **CLAUDE.md** 생성 (한글)
  - Claude Code를 위한 프로젝트 가이드
  - 티스토리 스킨 구조 설명
  - 참고 스킨 분석 요약
  - 개발 워크플로우
- ✅ **계획 문서** (.claude/plans/glowing-gathering-goose.md)
  - 상세 구현 계획
  - 7개 Phase별 작업 내용

#### 4. 기술 스택 결정
- **CSS**: Tailwind CSS (유틸리티 우선)
- **JavaScript**: Vanilla JS (의존성 없음)
- **우선순위**: SEO, 성능, 반응형

#### 5. 디자인 컨셉 논의
- 초기 방향: 모던 기술 블로그
- **최종 컨셉**: **Cursor AI 에디터 스타일** 💡
  - 다크 테마 기본
  - 모노스페이스 폰트
  - 에디터 레이아웃 (사이드바 = 파일 트리)
  - 터미널/CLI 느낌

---

### 🔄 다음 세션에서 할 일

#### Phase 1: 디자인 컨셉 확정
- [ ] Cursor AI 스타일 상세 디자인 결정
  - [ ] 색상 팔레트 정의 (다크 테마)
  - [ ] 폰트 선택 (JetBrains Mono / Fira Code)
  - [ ] 레이아웃 구조 확정
  - [ ] 라이트 모드 지원 여부
- [ ] 디자인 시안 또는 와이어프레임 (옵션)

#### Phase 2: 핵심 파일 구현
- [ ] **src/index.xml** 작성
  - 스킨 메타데이터
  - 변수 정의 (색상, 폰트, 레이아웃 옵션)
  - 기본값 설정
- [ ] **src/skin.html** 기본 구조
  - HTML 골격
  - 필수 티스토리 치환자 배치
  - 에디터 스타일 레이아웃
- [ ] **src/style.css** 초안
  - Tailwind 설정
  - 다크 테마 색상
  - 에디터 스타일 컴포넌트

#### Phase 3: JavaScript 기능
- [ ] **src/images/script.js**
  - 다크/라이트 모드 토글
  - 모바일 메뉴
  - 검색 기능
  - 지연 로딩

---

### 📝 참고 사항

#### 파일 구조
```
Ts_skin_maker/
├── TISTRORY_skin_guide.md          # 원본 완전 가이드 (72KB)
├── TISTORY_quick_reference.md      # 빠른 참조 (5-8KB) ⭐
├── CLAUDE.md                        # Claude 가이드 (한글)
├── SESSION_NOTES.md                 # 이 파일
├── reference/                       # 참고 스킨 5개
└── src/                             # 구현 파일 (아직 없음)
    ├── index.xml
    ├── skin.html
    ├── style.css
    └── images/
        └── script.js
```

#### 빠른 명령어
```bash
# 프로젝트 구조 확인
ls -la

# 참고 스킨 확인
ls reference/

# 퀵 레퍼런스 열기
cat TISTORY_quick_reference.md

# 계획 문서 확인
cat .claude/plans/glowing-gathering-goose.md
```

#### 중요 문서
1. **구현 시 먼저 참조**: `TISTORY_quick_reference.md`
2. **상세 참조**: `TISTRORY_skin_guide.md`
3. **프로젝트 가이드**: `CLAUDE.md`
4. **구현 계획**: `.claude/plans/glowing-gathering-goose.md`

---

### 💡 아이디어 메모

#### Cursor AI 스타일 구현 아이디어
1. **사이드바 (파일 트리 느낌)**
   ```
   📁 Categories
   ├─ 📁 JavaScript (12)
   ├─ 📁 Python (8)
   └─ 📁 DevOps (5)
   ```

2. **글 목록 (파일 리스트)**
   ```
   📄 article-title.md        2025-12-11
   📄 another-post.md         2025-12-10
   ```

3. **글 상세 (에디터 뷰)**
   - 라인 번호 표시
   - 구문 강조
   - 미니맵 (옵션)

4. **터미널 스타일 요소**
   - 검색창: `> search...`
   - 명령어 느낌: `$ cd blog/posts`
   - 프롬프트 스타일 네비게이션

5. **색상 참고**
   - Background: `#1e1e1e`, `#252526`
   - Sidebar: `#252526`, `#2d2d30`
   - Accent: `#007acc` (파랑), `#c586c0` (보라)
   - Text: `#d4d4d4`
   - Comment: `#6a9955`

---

### ⚠️ 주의사항

1. **티스토리 치환자**
   - 항상 `<s_t3>` 래퍼 안에 콘텐츠
   - 정확한 문법 사용 (TISTORY_quick_reference.md 참조)

2. **성능 최적화**
   - 불필요한 티스토리 스크립트 차단
   - 이미지 지연 로딩
   - CSS 최소화

3. **반응형 디자인**
   - 모바일 우선 접근
   - 에디터 레이아웃의 모바일 대응

4. **접근성**
   - 다크 테마도 충분한 대비
   - 키보드 네비게이션
   - 스크린 리더 지원

---

### 🔗 유용한 링크

- Cursor AI: https://cursor.sh
- Tailwind CSS: https://tailwindcss.com
- JetBrains Mono: https://www.jetbrains.com/lp/mono/
- Fira Code: https://github.com/tonsky/FiraCode

---

## 다음 세션 시작 시

1. 이 파일(`SESSION_NOTES.md`) 읽기
2. 계획 문서(`.claude/plans/glowing-gathering-goose.md`) 확인
3. 디자인 컨셉 최종 확정부터 시작
4. `src/` 디렉토리 생성 및 구현 시작
