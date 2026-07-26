# 티스토리 스킨 제작 챗봇 구현 계획

## 프로젝트 개요

**목표**: OpenAI GPT-4를 활용하여 대화형으로 티스토리 블로그 스킨을 자동 생성하는 웹 기반 챗봇 시스템 구축

**핵심 기능**:
- 사용자와 대화하며 요구사항 수집 (블로그 스타일, 색상, 레이아웃, 기능)
- LLM 기반 스킨 코드 자동 생성 (index.xml, skin.html, style.css, script.js)
- 실시간 코드 미리보기 및 렌더링
- 사용자 피드백 기반 반복 개선
- 완성된 스킨 ZIP 다운로드

---

## 전체 아키텍처

```
┌─────────────────────────────────────────────────┐
│         Frontend (React + Vite)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Chat UI  │  │ Code     │  │ Iframe       │  │
│  │          │  │ Preview  │  │ Preview      │  │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
└───────┼────────────┼────────────────┼───────────┘
        │            │                │
        └────────────┼────────────────┘
                     │ WebSocket/HTTP
        ┌────────────▼────────────────┐
        │   Backend (FastAPI)         │
        │  ┌──────────────────────┐   │
        │  │ Conversation Manager │   │
        │  └──────────┬───────────┘   │
        │  ┌──────────▼───────────┐   │
        │  │ Prompt Engine (RAG)  │   │
        │  └──────────┬───────────┘   │
        │  ┌──────────▼───────────┐   │
        │  │ Code Generator       │   │
        │  └──────────┬───────────┘   │
        │  ┌──────────▼───────────┐   │
        │  │ File Manager         │   │
        │  └──────────────────────┘   │
        └────────────┬────────────────┘
                     │
        ┌────────────▼────────────────┐
        │   OpenAI API (GPT-4)        │
        └─────────────────────────────┘
```

**데이터 흐름**:
1. 사용자 입력 → Frontend (React)
2. WebSocket → Backend API
3. Conversation Manager (세션 상태 관리)
4. Prompt Engine (RAG로 관련 문서/코드 검색)
5. Code Generator (OpenAI API 호출 + Function Calling)
6. File Manager (검증 + 버전 관리 + 파일 저장)
7. 응답 반환 → Frontend (스트리밍)
8. 코드 미리보기 + iframe 렌더링

---

## 디렉토리 구조

```
Ts_skin_maker/                          # 현재 프로젝트 루트
├── backend/                            # 백엔드 (FastAPI)
│   ├── app/
│   │   ├── main.py                     # FastAPI 앱 엔트리포인트
│   │   ├── config.py                   # 환경 설정 (.env 로딩)
│   │   ├── models/                     # Pydantic 모델
│   │   │   ├── chat.py                 # ChatMessage, ChatResponse
│   │   │   ├── skin.py                 # SkinRequirements, GeneratedSkin
│   │   │   └── session.py              # ConversationSession
│   │   ├── api/                        # API 라우터
│   │   │   ├── session.py              # POST /session/create
│   │   │   ├── chat.py                 # WebSocket /chat/ws/{id}
│   │   │   ├── generate.py             # POST /generate
│   │   │   ├── preview.py              # GET /preview/{id}
│   │   │   ├── download.py             # GET /download/{id}
│   │   │   └── feedback.py             # POST /feedback
│   │   ├── services/                   # 비즈니스 로직
│   │   │   ├── conversation_manager.py # 세션 관리, 대화 히스토리
│   │   │   ├── prompt_engine.py        # System Prompt + RAG 검색
│   │   │   ├── llm_service.py          # OpenAI API 래퍼
│   │   │   ├── code_generator.py       # 코드 생성 + Function Calling
│   │   │   ├── code_validator.py       # 생성 코드 검증
│   │   │   └── file_manager.py         # 버전 관리 + 파일 저장
│   │   ├── prompts/                    # 프롬프트 템플릿
│   │   │   ├── system_prompts.py       # System Prompt
│   │   │   ├── few_shot_examples.py    # Few-shot 예제
│   │   │   └── function_schemas.py     # Function Calling 스키마
│   │   ├── utils/
│   │   │   ├── document_loader.py      # 문서 로딩
│   │   │   ├── rag.py                  # RAG 검색 (Phase 2)
│   │   │   └── mock_data.py            # 미리보기용 가상 데이터
│   │   └── static/generated/           # 생성된 스킨 임시 저장
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
│
├── frontend/                           # 프론트엔드 (React)
│   ├── src/
│   │   ├── App.jsx                     # 메인 레이아웃 (3단 구조)
│   │   ├── components/
│   │   │   ├── ChatInterface/
│   │   │   │   ├── ChatInterface.jsx   # WebSocket 대화
│   │   │   │   ├── MessageBubble.jsx
│   │   │   │   └── InputBox.jsx
│   │   │   ├── CodePreview/
│   │   │   │   ├── CodePreview.jsx     # Monaco Editor
│   │   │   │   ├── FileTree.jsx
│   │   │   │   └── EditorPanel.jsx
│   │   │   ├── SettingsPanel/
│   │   │   │   ├── SettingsPanel.jsx
│   │   │   │   ├── ColorPicker.jsx
│   │   │   │   └── FeatureToggles.jsx
│   │   │   └── IframePreview/
│   │   │       └── IframePreview.jsx   # 실제 렌더링
│   │   ├── hooks/
│   │   │   ├── useWebSocket.js
│   │   │   ├── useSession.js
│   │   │   └── useCodeGeneration.js
│   │   ├── services/
│   │   │   └── api.js                  # axios 클라이언트
│   │   └── store/                      # Zustand 상태 관리
│   │       ├── chatStore.js
│   │       ├── skinStore.js
│   │       └── uiStore.js
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── src/                                # 기존 스킨 버전들
│   ├── 0.9.8/ ... 1.0.3/
│   └── [챗봇이 생성한 새 버전들]
│
├── reference/                          # 참고 스킨 (Few-shot 예제)
├── TISTORY_quick_reference.md          # RAG 컨텍스트
├── TISTRORY_skin_guide.md              # RAG 컨텍스트
└── CLAUDE.md
```

---

## 기술 스택

### Backend
- **Framework**: FastAPI (WebSocket 지원, 비동기 처리)
- **LLM**: OpenAI GPT-4 (코드 생성), GPT-3.5 (요구사항 수집)
- **AI 라이브러리**: `openai` Python SDK
- **상태 관리**: 메모리 기반 (Phase 1) → SQLite/Redis (Phase 2)
- **문서 검색**: 키워드 기반 (Phase 1) → Vector Embedding + FAISS (Phase 2)

### Frontend
- **Framework**: React 18 + Vite
- **UI Library**: Tailwind CSS
- **Editor**: Monaco Editor (@monaco-editor/react)
- **WebSocket**: react-use-websocket
- **State**: Zustand
- **Color Picker**: react-colorful
- **Markdown**: react-markdown

### 개발 도구
- **Package Manager**: npm (Frontend), pip (Backend)
- **API 문서**: FastAPI 자동 생성 (Swagger UI)
- **Version Control**: Git (기존 레포 활용)

---

## LLM 프롬프트 전략

### 1. System Prompt 구성

```python
SYSTEM_PROMPT = """
당신은 티스토리 블로그 스킨 제작 전문가입니다.

## 역할
- 사용자 요구사항을 경청하고 명확한 질문으로 스타일 선호도를 파악합니다.
- 티스토리 치환자 문법을 완벽히 이해하고 있습니다.
- Tailwind CSS + Vanilla JavaScript 기반으로 코드를 생성합니다.
- SEO, 반응형 디자인, 성능 최적화를 고려합니다.

## 티스토리 핵심 규칙
1. 모든 콘텐츠는 <s_t3> 래퍼 안에 있어야 함
2. 페이지 타입: [##_body_id_##] (tt-body-index, tt-body-page 등)
3. 필수 치환자: [##_title_##], [##_desc_##], [##_blogger_##]

## 지침
- 이모지 사용 금지
- 코드에 한글 주석 포함
- 질문은 3-5개로 제한

{rag_context}

현재 대화 단계: {stage}
"""
```

### 2. RAG (Retrieval-Augmented Generation) 전략

**Phase 1 - 키워드 기반 검색**:
```python
def get_relevant_context(user_query: str, stage: str) -> str:
    if stage == "requirements_gathering":
        # 초기 단계: 기본 구조만
        return load_document("TISTORY_quick_reference.md")[:2000]

    elif stage == "code_generation":
        # 키워드 추출 (예: "목차", "검색", "다크모드")
        keywords = extract_keywords(user_query)

        sections = []
        if "목차" in keywords:
            sections.append(get_section("목차 생성 패턴"))
        if "검색" in keywords:
            sections.append(get_section("검색 기능"))

        # 기존 스킨 코드 참조
        sections.append(load_template_code("src/1.0.3/"))

        return "\n\n".join(sections)
```

**Phase 2 - Vector Embedding**:
- `sentence-transformers` 사용
- 문서를 청크로 분할 → 임베딩 → FAISS 인덱스
- 쿼리와 유사한 청크 상위 5개 반환

### 3. 기존 스킨 활용 방식 (템플릿 + RAG)

**템플릿 베이스 접근**:
```python
def generate_skin(requirements: dict) -> dict:
    # 1. 가장 유사한 기존 스킨 선택 (템플릿)
    base_template = select_template(requirements)
    # src/1.0.3/ 선택 (다크 테마 + 목차 + 검색)

    # 2. 템플릿 코드를 컨텍스트로 제공
    context = f"""
    기존 템플릿 (참고용):

    index.xml:
    {load_file("src/1.0.3/index.xml")}

    skin.html (일부):
    {load_file("src/1.0.3/skin.html")[:3000]}

    사용자 요구사항:
    - 테마: {requirements['theme']}
    - 색상: {requirements['accent_color']}
    - 레이아웃: {requirements['layout']}

    위 템플릿을 기반으로 사용자 요구에 맞춰 수정해주세요.
    """

    # 3. GPT-4 호출
    return llm_service.generate(context, requirements)
```

### 4. Function Calling 스키마

```python
GENERATE_SKIN_FUNCTION = {
    "name": "generate_tistory_skin",
    "description": "티스토리 스킨 코드 생성",
    "parameters": {
        "type": "object",
        "properties": {
            "index_xml": {"type": "string"},
            "skin_html": {"type": "string"},
            "style_css": {"type": "string"},
            "script_js": {"type": "string"},
            "version": {"type": "string"},
            "explanation": {"type": "string"}
        },
        "required": ["index_xml", "skin_html", "style_css", "script_js"]
    }
}
```

---

## 대화 플로우 (5단계)

```
Stage 1: 초기 인사 (Greeting)
   ↓
   시스템: "어떤 스타일의 블로그를 만들고 싶으신가요?"
   사용자: "다크 테마 기술 블로그"

Stage 2: 요구사항 수집 (Requirements Gathering)
   ↓
   시스템: 3-5개 질문 (색상, 레이아웃, 기능, 폰트)
   사용자: 순차적으로 답변

Stage 3: 코드 생성 (Code Generation)
   ↓
   - Prompt Engine: RAG로 관련 문서 검색
   - Code Generator: OpenAI API 호출 (Function Calling)
   - File Manager: 검증 + 버전 자동 증가 + 파일 저장

Stage 4: 미리보기 (Preview)
   ↓
   - 코드 미리보기 (Monaco Editor)
   - iframe 렌더링 (가상 데이터 삽입)

Stage 5: 피드백 루프 (Feedback)
   ↓
   사용자: "사이드바를 더 좁게"
   시스템: 부분 수정 + 새 버전 생성

Stage 6: 다운로드 (Download)
   ↓
   ZIP 파일 생성 + 설치 가이드 제공
```

---

## 요구사항 수집 질문 체계 (Stage 2 상세)

### 질문 설계 원칙

1. **점진적 구체화**: 큰 범주 → 세부 사항 순서
2. **선택지 제공**: 사용자가 쉽게 선택할 수 있도록 2-4개 옵션
3. **기본값 제안**: 일반적인 선호도를 "추천" 표시
4. **질문 수 제한**: 3-7개 (사용자 피로도 고려)
5. **자연스러운 대화**: 딱딱한 설문조사가 아닌 친근한 톤

### 수집할 정보 카테고리

기존 스킨 분석 결과 (`src/1.0.3/index.xml`, `reference/` 스킨들):

| 카테고리 | 변수 | 중요도 | 질문 필요 |
|----------|------|--------|----------|
| **블로그 타입** | blogType | 높음 | 필수 |
| **테마 모드** | theme | 높음 | 필수 |
| **색상 스키마** | accentColor, sidebarBgColor, mainBgColor | 높음 | 필수 |
| **레이아웃** | layout, sidebarWidth, sidebarPosition | 중간 | 선택 |
| **핵심 기능** | enableTOC, enableSearch, enableLazyLoad | 중간 | 선택 |
| **폰트** | codeFont, bodyFont | 낮음 | 선택 |
| **고급 설정** | customCSS, animations | 낮음 | 생략 가능 |

---

### 단계별 질문 시나리오

#### **질문 0: 초기 목적 파악 (Greeting)**

```
시스템: 안녕하세요! 티스토리 블로그 스킨 제작 도우미입니다.

어떤 스타일의 블로그를 만들고 싶으신가요?

1. 기술 블로그 (프로그래밍, 개발 튜토리얼)
2. 일상 블로그 (사진, 글 중심)
3. 포트폴리오 (작품, 프로젝트 쇼케이스)
4. 도서/리뷰 블로그
5. 기타 (직접 입력)
```

**수집 데이터**: `blogType` (tech / lifestyle / portfolio / review / custom)

**다음 단계 분기**:
- 기술 블로그 → 코드 친화적 기능 추천 (목차, 코드 하이라이팅)
- 포트폴리오 → 이미지 중심 레이아웃 추천
- 일상 블로그 → 깔끔한 갤러리 형식

---

#### **질문 1: 테마 및 색상 (필수)**

```
시스템: 좋습니다! 기술 블로그에 어울리는 스킨을 만들어드리겠습니다.

블로그 테마는 어떤 스타일을 선호하시나요?

1. 다크 테마 (추천 - 개발자 친화적)
   - 배경: 어두운 회색 (#1e1e1e)
   - 텍스트: 밝은 회색 (#d4d4d4)
   - 눈의 피로를 줄이고 코드 가독성 향상

2. 라이트 테마 (클래식)
   - 배경: 흰색 (#ffffff)
   - 텍스트: 검정 (#333333)
   - 깔끔하고 전통적인 블로그 스타일

3. 다크 + 라이트 전환 가능 (토글 버튼 제공)
   - 사용자가 원하는 테마로 변경 가능

선택: 1 (다크 테마)
```

**수집 데이터**:
- `theme`: "dark" / "light" / "both"
- `mainBgColor`: "#1e1e1e" (다크) / "#ffffff" (라이트)
- `textColor`: "#d4d4d4" (다크) / "#333333" (라이트)

---

#### **질문 2: 강조 색상 (필수)**

```
시스템: 다크 테마로 진행하겠습니다!

메인 강조 색상을 선택해주세요 (링크, 버튼, 제목에 사용):

1. 블루 (#007acc) - VS Code 스타일 (추천)
2. 그린 (#00d4aa) - 모던하고 세련된 느낌
3. 퍼플 (#9d4edd) - 크리에이티브하고 독특함
4. 오렌지 (#ff6b35) - 따뜻하고 활기찬 느낌
5. 직접 입력 (HEX 코드)

선택: 1 (블루 #007acc)
```

**수집 데이터**: `accentColor`: "#007acc"

**추가 질문** (블루 선택 시):
```
시스템: 블루 계열로 하시면 사이드바 배경도 조화롭게 맞출게요.
- 사이드바 배경: #252526 (약간 밝은 회색)
- 메인 배경: #1e1e1e (어두운 회색)

이대로 진행할까요? (예/아니오)
```

**수집 데이터**: `sidebarBgColor`: "#252526"

---

#### **질문 3: 레이아웃 구조 (선택)**

```
시스템: 레이아웃 구조를 선택해주세요:

1. 사이드바 레이아웃 (추천)
   ┌──────┬──────────────┐
   │ 사이드 │    메인 콘텐츠   │
   │ 바    │    (글 목록)    │
   │      │               │
   └──────┴──────────────┘
   - 왼쪽: 카테고리, 태그, 프로필
   - 오른쪽: 글 목록 및 본문
   - 사이드바 너비: 250px / 300px 선택 가능

2. 전체 너비 (심플)
   ┌────────────────────┐
   │                    │
   │   메인 콘텐츠        │
   │   (중앙 정렬)       │
   │                    │
   └────────────────────┘
   - 사이드바 없음
   - 콘텐츠가 화면 중앙에 집중
   - 미니멀한 디자인

3. 2단 레이아웃 (클래식)
   ┌─────────────┬──────┐
   │  메인 콘텐츠  │ 사이드 │
   │  (넓게)      │ 바    │
   │             │      │
   └─────────────┴──────┘

선택: 1 (사이드바 레이아웃)
```

**수집 데이터**:
- `layout`: "sidebar" / "full-width" / "two-column"
- `sidebarPosition`: "left" / "right" (사이드바 선택 시)

**추가 질문** (사이드바 선택 시):
```
시스템: 사이드바 너비를 선택해주세요:

1. 좁게 (200px) - 콘텐츠 공간 최대화
2. 보통 (250px) - 균형잡힌 레이아웃 (추천)
3. 넓게 (300px) - 카테고리 트리가 복잡할 때

선택: 2
```

**수집 데이터**: `sidebarWidth`: "200px" / "250px" / "300px"

---

#### **질문 4: 필수 기능 선택 (복수 선택)**

```
시스템: 다음 기능 중 필요한 것을 선택해주세요 (여러 개 가능):

[ ] 목차 자동 생성 (TOC)
    - 긴 글에서 H2, H3 제목을 추출하여 우측에 목차 표시
    - 스크롤 시 현재 위치 자동 하이라이트
    - 기술 블로그에 강력 추천

[ ] 검색 기능
    - 상단에 검색 입력창 표시
    - 티스토리 기본 검색으로 연결

[ ] 이미지 지연 로딩
    - 페이지 로딩 속도 향상
    - 스크롤할 때 이미지 로드
    - 성능 최적화 필수

[ ] 코드 구문 강조
    - Prism.js 또는 Highlight.js 통합
    - 코드 블록에 자동 구문 색상 적용

[ ] Scroll-to-Top 버튼
    - 긴 글에서 빠르게 상단으로 이동

기술 블로그이시므로 이 기능들을 모두 추천드립니다.
모두 선택하시겠어요? (예/아니오/직접 선택)

선택: 예 (모두 선택)
```

**수집 데이터**:
- `enableTOC`: true / false
- `enableSearch`: true / false
- `enableLazyLoad`: true / false
- `enableCodeHighlight`: true / false
- `enableScrollToTop`: true / false

---

#### **질문 5: 폰트 선택 (선택)**

```
시스템: 코드 블록에 사용할 폰트를 선택해주세요:

1. JetBrains Mono (추천)
   - 현대적이고 가독성 우수
   - 리가처(ligatures) 지원

2. Fira Code
   - 리가처 풍부
   - 개발자들에게 인기

3. Consolas
   - 윈도우 기본 폰트
   - 익숙하고 안정적

4. Monaco
   - macOS/VS Code 스타일

선택: 1 (JetBrains Mono)
```

**수집 데이터**: `codeFont`: "JetBrains Mono" / "Fira Code" / "Consolas" / "Monaco"

---

#### **질문 6: 추가 요청 (자유 입력, 선택)**

```
시스템: 마지막으로 특별히 원하는 기능이나 스타일이 있으신가요?

예시:
- "제목에 네온 효과 추가"
- "호버 시 카드 애니메이션"
- "상단에 프로그레스 바 표시"
- "태그 클라우드를 히트맵 스타일로"

없으면 "없어요" 또는 "생성 시작"이라고 말씀해주세요!

사용자 입력: "제목에 약간의 그라데이션 효과"
```

**수집 데이터**: `customRequests`: "제목에 그라데이션 효과"

---

### 요구사항 데이터 구조

수집된 모든 정보를 JSON으로 구조화:

```json
{
  "session_id": "uuid-1234",
  "requirements": {
    "blogType": "tech",
    "theme": "dark",
    "colors": {
      "accent": "#007acc",
      "mainBg": "#1e1e1e",
      "sidebarBg": "#252526",
      "text": "#d4d4d4"
    },
    "layout": {
      "type": "sidebar",
      "sidebarPosition": "left",
      "sidebarWidth": "250px"
    },
    "features": {
      "toc": true,
      "search": true,
      "lazyLoad": true,
      "codeHighlight": true,
      "scrollToTop": true,
      "lightModeToggle": false
    },
    "fonts": {
      "code": "JetBrains Mono",
      "body": "system-ui"
    },
    "customRequests": "제목에 그라데이션 효과"
  }
}
```

---

### 질문 최적화 전략

#### **1. 적응형 질문 (Adaptive Questions)**

사용자의 초기 답변에 따라 질문을 조정:

```python
def generate_questions(blog_type: str) -> list:
    base_questions = ["테마", "색상", "레이아웃"]

    if blog_type == "tech":
        # 기술 블로그에는 코드 관련 질문 추가
        return base_questions + ["코드 폰트", "구문 강조"]

    elif blog_type == "portfolio":
        # 포트폴리오에는 이미지 관련 질문 추가
        return base_questions + ["갤러리 스타일", "호버 효과"]

    elif blog_type == "lifestyle":
        # 일상 블로그에는 심플한 질문만
        return base_questions + ["폰트", "여백 스타일"]

    return base_questions
```

#### **2. 스마트 기본값**

사용자가 "추천대로" 선택 시 자동으로 최적의 조합 제공:

```python
SMART_DEFAULTS = {
    "tech": {
        "theme": "dark",
        "accent": "#007acc",
        "layout": "sidebar",
        "features": {
            "toc": True,
            "search": True,
            "codeHighlight": True,
            "lazyLoad": True
        },
        "codeFont": "JetBrains Mono"
    },
    "portfolio": {
        "theme": "light",
        "accent": "#9d4edd",
        "layout": "full-width",
        "features": {
            "gallery": True,
            "lightbox": True,
            "lazyLoad": True
        }
    }
}
```

#### **3. 진행 상황 표시**

```
[질문 1/5] 테마 선택
■■■■■■■□□□□□□□□ 40%
```

---

### 예시 전체 대화 흐름

```
시스템: 안녕하세요! 어떤 블로그를 만들고 싶으신가요?
사용자: 기술 블로그

[질문 1/5] ■■■■□□□□□□□□□□□ 20%
시스템: 테마는 다크/라이트 중 어느 것을 선호하시나요?
사용자: 다크 테마

[질문 2/5] ■■■■■■■■□□□□□□□ 40%
시스템: 강조 색상을 선택해주세요 (블루/그린/퍼플/오렌지)
사용자: 블루

[질문 3/5] ■■■■■■■■■■■■□□□ 60%
시스템: 레이아웃은? (사이드바/전체너비/2단)
사용자: 사이드바

[질문 4/5] ■■■■■■■■■■■■■■■□ 80%
시스템: 필요한 기능을 선택해주세요 (목차/검색/지연로딩/...)
사용자: 목차, 검색, 지연 로딩 모두

[질문 5/5] ■■■■■■■■■■■■■■■■ 100%
시스템: 코드 폰트는? (JetBrains Mono/Fira Code/...)
사용자: JetBrains Mono

시스템: 완벽합니다! 다음 조합으로 스킨을 생성하겠습니다:
- 다크 테마 + 블루 강조색
- 사이드바 레이아웃 (250px)
- 목차 + 검색 + 지연 로딩 기능
- JetBrains Mono 코드 폰트

생성 시작할까요? (예/수정할 부분 있어요)
사용자: 예

시스템: 생성 중입니다... (약 10-20초 소요)
[진행 상황]
✓ 요구사항 분석 완료
✓ index.xml 생성 중...
✓ skin.html 생성 중...
✓ style.css 생성 중...
✓ script.js 생성 중...
✓ 코드 검증 완료

완료! 오른쪽에서 미리보기를 확인해주세요.
```

---

### 구현 시 고려사항

1. **대화 컨텍스트 유지**: 이전 답변을 기억하여 자연스러운 대화
2. **뒤로 가기 지원**: "이전 질문으로" 명령 처리
3. **건너뛰기 허용**: 선택 질문은 기본값 사용 가능
4. **요약 확인**: 생성 전 최종 확인 단계
5. **에러 처리**: 잘못된 입력 시 재질문 (예: "블루 또는 그린 중 선택해주세요")

---

이 질문 체계는 `backend/app/prompts/system_prompts.py`와 `backend/app/services/conversation_manager.py`에서 구현됩니다.

---

## API 엔드포인트 설계

### 1. POST /api/session/create
- **설명**: 새 대화 세션 생성
- **응답**: `{ "session_id": "uuid", "created_at": "timestamp" }`

### 2. WebSocket /api/chat/ws/{session_id}
- **설명**: 실시간 대화 (스트리밍 응답)
- **메시지 형식**:
  ```json
  // 클라이언트 → 서버
  { "type": "message", "content": "다크 테마 블로그" }

  // 서버 → 클라이언트 (스트리밍)
  { "type": "response", "content": "...", "finished": false }
  ```

### 3. POST /api/generate
- **설명**: 요구사항 기반 스킨 생성
- **요청**:
  ```json
  {
    "session_id": "uuid",
    "requirements": {
      "theme": "dark",
      "accent_color": "#007acc",
      "layout": "sidebar",
      "features": ["toc", "search"]
    }
  }
  ```
- **응답**:
  ```json
  {
    "skin_id": "uuid",
    "version": "1.0.4",
    "files": { "index_xml": "...", "skin_html": "..." },
    "preview_url": "/api/preview/uuid"
  }
  ```

### 4. GET /api/preview/{skin_id}
- **설명**: HTML 미리보기 (iframe 삽입용)
- **응답**: 렌더링된 HTML

### 5. GET /api/download/{skin_id}
- **설명**: ZIP 파일 다운로드
- **응답**: `application/zip`

### 6. POST /api/feedback
- **설명**: 피드백 기반 재생성
- **요청**: `{ "skin_id": "uuid", "feedback": "사이드바 좁게" }`
- **응답**: 새로운 `skin_id`

---

## 핵심 구현 로직

### 1. Prompt Engine (RAG 컨텍스트 검색)

**파일**: `backend/app/services/prompt_engine.py`

```python
class PromptEngine:
    def __init__(self):
        self.docs = {
            "quick_ref": load("TISTORY_quick_reference.md"),
            "guide": load("TISTRORY_skin_guide.md"),
            "templates": load_templates("src/1.0.3/")
        }

    def build_context(self, query: str, stage: str) -> str:
        """대화 단계별 컨텍스트 구성"""
        if stage == "requirements_gathering":
            return self.docs["quick_ref"][:2000]

        elif stage == "code_generation":
            # 키워드 기반 섹션 추출
            sections = self._search_relevant(query)
            # 템플릿 코드 추가
            sections.append(self.docs["templates"])
            return "\n\n".join(sections)

    def _search_relevant(self, query: str) -> list:
        """키워드 매칭으로 관련 섹션 검색"""
        keywords = extract_keywords(query)
        sections = []

        if "목차" in keywords or "toc" in keywords:
            sections.append(get_section("목차 생성"))
        if "검색" in keywords:
            sections.append(get_section("검색 기능"))

        return sections
```

### 2. Code Generator (OpenAI Function Calling)

**파일**: `backend/app/services/code_generator.py`

```python
async def generate_skin_code(requirements: dict) -> dict:
    """Function Calling으로 구조화된 코드 생성"""

    # 1. 컨텍스트 준비
    context = prompt_engine.build_context(
        requirements["description"],
        stage="code_generation"
    )

    # 2. 프롬프트 구성
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT.format(rag_context=context)},
        {"role": "user", "content": f"요구사항: {requirements}"}
    ]

    # 3. OpenAI API 호출
    response = await openai.ChatCompletion.acreate(
        model="gpt-4",
        messages=messages,
        functions=[GENERATE_SKIN_FUNCTION],
        function_call={"name": "generate_tistory_skin"},
        temperature=0.3
    )

    # 4. Function 결과 파싱
    return json.loads(response.choices[0].message.function_call.arguments)
```

### 3. File Manager (버전 관리)

**파일**: `backend/app/services/file_manager.py`

```python
class FileManager:
    def get_next_version(self) -> str:
        """src/ 폴더 스캔하여 다음 버전 반환"""
        versions = [d.name for d in Path("../src").iterdir() if d.is_dir()]
        latest = sorted(versions)[-1]  # "1.0.3"
        major, minor, patch = map(int, latest.split('.'))
        return f"{major}.{minor}.{patch + 1}"  # "1.0.4"

    def save_skin(self, skin_data: dict) -> Path:
        """새 버전 폴더 생성 및 파일 저장"""
        version = self.get_next_version()
        path = Path(f"../src/{version}")
        path.mkdir(parents=True, exist_ok=True)

        # 파일 저장
        (path / "index.xml").write_text(skin_data["index_xml"])
        (path / "skin.html").write_text(skin_data["skin_html"])
        (path / "style.css").write_text(skin_data["style_css"])
        (path / "images").mkdir(exist_ok=True)
        (path / "images/script.js").write_text(skin_data["script_js"])

        return path
```

### 4. Code Validator (검증)

**파일**: `backend/app/services/code_validator.py`

```python
class CodeValidator:
    REQUIRED_TAGS = ["<s_t3>", "[##_body_id_##]", "[##_title_##]"]

    def validate(self, skin_data: dict) -> tuple[bool, list]:
        """필수 태그 및 구조 검증"""
        errors = []

        # skin.html 필수 태그 확인
        for tag in self.REQUIRED_TAGS:
            if tag not in skin_data["skin_html"]:
                errors.append(f"skin.html에 {tag} 누락")

        # index.xml XML 파싱 체크
        try:
            ET.fromstring(skin_data["index_xml"])
        except ET.ParseError:
            errors.append("index.xml 구조 오류")

        return (len(errors) == 0, errors)
```

---

## 3단계 개발 로드맵

### Phase 1: MVP (2-3주)

**목표**: 기본 대화 + 코드 생성 + 간단한 미리보기

**Backend**:
- [ ] FastAPI 프로젝트 설정 (`backend/`)
- [ ] OpenAI API 연동
- [ ] WebSocket `/chat` 엔드포인트 (스트리밍)
- [ ] POST `/generate` (Function Calling)
- [ ] Conversation Manager (메모리 기반)
- [ ] Prompt Engine (키워드 기반 RAG)
- [ ] Code Validator (필수 태그 체크)
- [ ] File Manager (버전 자동 증가)

**Frontend**:
- [ ] React + Vite 프로젝트 설정 (`frontend/`)
- [ ] ChatInterface (WebSocket 연결)
- [ ] CodePreview (Monaco Editor)
- [ ] 기본 3단 레이아웃

**프롬프트**:
- [ ] System Prompt (기본 버전)
- [ ] Few-shot 예제 (src/1.0.3 활용)
- [ ] Function Schema (4개 파일 생성)

**테스트**:
- [ ] E2E 테스트 (대화 → 생성 → 미리보기)

**핵심 파일**:
- `backend/app/main.py`
- `backend/app/services/prompt_engine.py`
- `backend/app/services/code_generator.py`
- `backend/app/api/chat.py`
- `frontend/src/App.jsx`
- `frontend/src/components/ChatInterface/ChatInterface.jsx`

---

### Phase 2: 고급 기능 (2주)

**목표**: RAG 향상 + 피드백 루프 + 완전한 미리보기

**Backend**:
- [ ] Vector Embedding RAG (sentence-transformers + FAISS)
- [ ] 세션 영속성 (SQLite)
- [ ] POST `/feedback` (재생성)
- [ ] GET `/download` (ZIP 생성)
- [ ] 에러 복구 (재시도 로직)
- [ ] GPT-3.5 혼용 (비용 최적화)

**Frontend**:
- [ ] IframePreview (실제 렌더링)
- [ ] SettingsPanel (색상/레이아웃 UI)
- [ ] 다운로드 버튼 + 설치 가이드
- [ ] 반응형 디자인

**프롬프트**:
- [ ] 단계별 프롬프트 최적화
- [ ] 더 많은 Few-shot 예제

**테스트**:
- [ ] 유닛 테스트 (services/)
- [ ] 통합 테스트 (API)

**핵심 파일**:
- `backend/app/utils/rag.py`
- `backend/app/api/feedback.py`
- `backend/app/api/download.py`
- `frontend/src/components/IframePreview/IframePreview.jsx`
- `frontend/src/components/SettingsPanel/SettingsPanel.jsx`

---

### Phase 3: 최적화 및 배포 (1-2주)

**목표**: 성능 개선 + 프로덕션 배포

**Backend**:
- [ ] 캐싱 (System Prompt + 문서)
- [ ] 비동기 최적화
- [ ] 로깅 + 모니터링
- [ ] Docker 컨테이너화
- [ ] API 문서 (Swagger)

**Frontend**:
- [ ] 코드 스플리팅
- [ ] PWA 지원
- [ ] 프로덕션 빌드

**배포**:
- [ ] Backend: AWS EC2 / Google Cloud Run
- [ ] Frontend: Vercel / Netlify
- [ ] 환경 변수 설정
- [ ] HTTPS 설정

**테스트**:
- [ ] E2E 테스트 (Playwright)
- [ ] 부하 테스트
- [ ] Lighthouse 점수 (90+ 목표)

---

## 예상 비용

### OpenAI API (월 100명 사용)

| 단계 | 모델 | 토큰 | 비용/회 | 월 비용 |
|------|------|------|---------|---------|
| 요구사항 수집 | GPT-3.5 | 500/300 | $0.0008 | $0.80 |
| 코드 생성 | GPT-4 | 3000/2000 | $0.21 | $21.00 |
| 재생성 | GPT-4 | 2000/1500 | $0.15 | $7.50 |

**월 예상 비용**: 약 $30-40 (100명 기준)

### 서버 비용
- Backend: AWS t3.small ($16/월) 또는 Cloud Run ($5-20/월)
- Frontend: Vercel 무료 플랜
- Storage: S3 ($1-5/월)

**총 월 비용**: $50-70

---

## 리스크 및 해결 방안

| 리스크 | 영향 | 해결 방안 |
|--------|------|----------|
| GPT-4 코드 오류 | 높음 | 검증 시스템 + 재시도 (최대 3회) |
| 긴 응답 시간 | 중간 | 스트리밍 응답 + 진행 상황 표시 |
| API 비용 증가 | 높음 | 일일 한도 + GPT-3.5 혼용 |
| 보안 (API 키) | 높음 | 환경 변수 + CORS 제한 |

---

## 핵심 구현 파일 요약

### 우선순위 1 (MVP 필수)

**Backend**:
1. `backend/app/main.py` - FastAPI 앱 설정
2. `backend/app/services/prompt_engine.py` - RAG 컨텍스트 검색
3. `backend/app/services/code_generator.py` - OpenAI API 호출
4. `backend/app/services/file_manager.py` - 버전 관리
5. `backend/app/api/chat.py` - WebSocket 대화

**Frontend**:
1. `frontend/src/App.jsx` - 메인 레이아웃
2. `frontend/src/components/ChatInterface/ChatInterface.jsx` - 대화 UI
3. `frontend/src/components/CodePreview/CodePreview.jsx` - 코드 미리보기
4. `frontend/src/hooks/useWebSocket.js` - WebSocket 훅

### 우선순위 2 (Phase 2)

**Backend**:
5. `backend/app/utils/rag.py` - Vector Embedding RAG
6. `backend/app/api/feedback.py` - 피드백 재생성
7. `backend/app/api/download.py` - ZIP 다운로드

**Frontend**:
5. `frontend/src/components/IframePreview/IframePreview.jsx` - 실제 렌더링
6. `frontend/src/components/SettingsPanel/SettingsPanel.jsx` - 설정 UI

---

## 참고 자료 활용 계획

### 문서 (RAG 컨텍스트)
- `TISTORY_quick_reference.md` (504줄) - Phase 1 메인 참조
- `TISTRORY_skin_guide.md` (1748줄) - 키워드 기반 검색용
- `CLAUDE.md` - 개발 가이드라인

### 템플릿 (기존 스킨)
- `src/1.0.3/` - 기본 템플릿 (다크 테마 + 목차 + 검색)
- `reference/BookClub/` - 도서 블로그 스타일
- `reference/Odyssey/` - 반응형 디자인 패턴

**활용 방식**:
1. **Few-shot 예제**: 프롬프트에 코드 일부 삽입
2. **RAG 컨텍스트**: 사용자 쿼리에 따라 관련 섹션 검색
3. **템플릿 베이스**: 기존 스킨을 수정하는 방식으로 생성

---

## 다음 단계

1. **환경 설정**:
   - Python 3.10+ 및 Node.js 18+ 설치 확인
   - OpenAI API 키 발급 (https://platform.openai.com)

2. **Phase 1 시작**:
   ```bash
   # Backend 설정
   mkdir -p backend/app
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install fastapi uvicorn openai python-dotenv pydantic

   # Frontend 설정
   cd ../frontend
   npm create vite@latest . -- --template react
   npm install
   npm install @monaco-editor/react react-use-websocket zustand axios
   npm install -D tailwindcss postcss autoprefixer
   ```

3. **프로젝트 초기화**:
   - `backend/.env` 생성 (API 키 설정)
   - `backend/app/main.py` 작성 (FastAPI 기본 구조)
   - `frontend/src/App.jsx` 작성 (React 기본 레이아웃)

4. **테스트 개발**:
   - 간단한 WebSocket 에코 테스트
   - OpenAI API 연동 테스트
   - 기본 대화 플로우 구현

---

## 마무리

이 계획은 **현재 Ts_skin_maker 레포지토리에 통합**되며, **3단계로 점진적 개발**을 진행합니다.

- **Phase 1 (MVP)**: 기본 대화 + 코드 생성
- **Phase 2**: RAG 향상 + 피드백 루프
- **Phase 3**: 최적화 + 배포

각 단계가 완료될 때마다 실제 동작하는 버전을 확보하여 리스크를 최소화합니다.

구현 시작 시 이 계획을 참조하여 단계별로 진행하시면 됩니다.
