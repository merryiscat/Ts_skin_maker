# 티스토리 스킨 치환자 퀵 레퍼런스

실제 구현 시 자주 사용하는 핵심 치환자만 모았습니다.
상세한 내용은 `TISTRORY_skin_guide.md` 참조.

---

## 📌 필수 기본 치환자

### 블로그 정보
```html
[##_title_##]              블로그 제목
[##_desc_##]               블로그 설명
[##_blogger_##]            블로그 소유자 필명
[##_image_##]              블로그 대표 이미지 URL
[##_blog_image_##]         블로그 대표 이미지를 포함한 IMG 태그
```

### URL
```html
[##_blog_link_##]          블로그 메인 URL
[##_rss_url_##]            RSS 피드 URL
[##_taglog_link_##]        태그로그 URL
[##_guestbook_link_##]     방명록 URL
```

### 페이지 정보
```html
[##_page_title_##]         현재 페이지 제목 (SEO용)
[##_body_id_##]            페이지 타입별 ID (스타일링용)
[##_blog_menu_##]          블로그 메뉴 리스트
```

**body_id 값**:
- `tt-body-index` - 홈 화면
- `tt-body-page` - 글 상세
- `tt-body-category` - 카테고리 목록
- `tt-body-tag` - 태그 목록
- `tt-body-search` - 검색 결과
- `tt-body-guestbook` - 방명록

---

## 📝 글 관련 치환자

### 공통 글 그룹 (목록 + 상세 모두 표시)
```html
<s_article_rep>
  [##_article_rep_link_##]              글 URL
  [##_article_rep_title_##]             글 제목
  [##_article_rep_desc_##]              글 본문 (상세 페이지에서만)
  [##_article_rep_category_##]          카테고리 이름
  [##_article_rep_category_link_##]     카테고리 URL
  [##_article_rep_date_##]              발행 날짜/시간 (yyyy. m. d. HH:MM)
  [##_article_rep_simple_date_##]       발행 날짜 (yyyy. m. d.)
  [##_article_rep_author_##]            작성자 이름 (팀블로그용)

  <!-- 썸네일 -->
  <s_article_rep_thumbnail>
    [##_article_rep_thumbnail_url_##]     썸네일 URL
    [##_article_rep_thumbnail_raw_url_##] 원본 이미지 URL
  </s_article_rep_thumbnail>

  <!-- 댓글 수 -->
  <s_rp_count>
    [##_article_rep_rp_cnt_##]          댓글 개수
  </s_rp_count>
</s_article_rep>
```

### 인덱스 페이지 전용 (목록)
```html
<s_index_article_rep>
  <!-- 위의 article_rep 치환자 사용 가능 -->
  [##_article_rep_summary_##]           글 요약 (목록용)
</s_index_article_rep>
```

### 퍼머링크 페이지 전용 (상세)
```html
<s_permalink_article_rep>
  <!-- 위의 article_rep 치환자 사용 가능 -->
  [##_article_rep_desc_##]              글 전체 본문

  <!-- 태그 -->
  <s_tag_label>
    [##_tag_label_rep_##]               태그 목록
  </s_tag_label>

  <!-- 관리 기능 (관리자에게만 표시) -->
  <s_ad_div>
    [##_s_ad_m_link_##]                 수정 링크
    [##_s_ad_m_onclick_##]              수정 온클릭
    [##_s_ad_d_onclick_##]              삭제 온클릭
    [##_s_ad_s1_label_##]               현재 상태
    [##_s_ad_s2_onclick_##]             상태 변경 온클릭
    [##_s_ad_s2_label_##]               다음 상태
  </s_ad_div>
</s_permalink_article_rep>
```

### 이전/다음 글
```html
<s_article_prev>
  [##_article_prev_link_##]             이전 글 URL
  [##_article_prev_title_##]            이전 글 제목
  <s_article_prev_thumbnail>
    [##_article_prev_thumbnail_link_##] 이전 글 썸네일
  </s_article_prev_thumbnail>
</s_article_prev>

<s_article_next>
  [##_article_next_link_##]             다음 글 URL
  [##_article_next_title_##]            다음 글 제목
  <s_article_next_thumbnail>
    [##_article_next_thumbnail_link_##] 다음 글 썸네일
  </s_article_next_thumbnail>
</s_article_next>
```

### 같은 카테고리 글
```html
<s_article_related>
  <s_article_related_rep>
    [##_article_related_rep_link_##]    관련 글 URL
    [##_article_related_rep_title_##]   관련 글 제목
    [##_article_related_rep_type_##]    타입 (text_type/thumb_type)
    <s_article_related_rep_thumbnail>
      [##_article_related_rep_thumbnail_link_##]
    </s_article_related_rep_thumbnail>
  </s_article_related_rep>
</s_article_related>
```

---

## 💬 댓글

### 기본 방명록 치환자 (권장)
```html
[##_guestbook_group_##]
```
→ 티스토리 기본 댓글 UI 자동 렌더링 (React 기반)
→ 별도 HTML 작성 불필요, CSS로 커스터마이징 가능

---

## 📂 사이드바 치환자

### 카테고리
```html
[##_category_list_##]      카테고리 트리 전체 (자동 생성)
```

### 태그 클라우드
```html
<s_tag>
  <s_tag_rep>
    [##_tag_link_##]       태그 URL
    [##_tag_name_##]       태그 이름
    [##_tag_class_##]      빈도별 클래스 (cloud1~cloud5)
  </s_tag_rep>
</s_tag>
```

**태그 클래스 (빈도순)**:
- `cloud1` - 가장 많이 사용 (큰 글씨)
- `cloud2` - 많이 사용
- `cloud3` - 보통
- `cloud4` - 적게 사용
- `cloud5` - 가장 적게 사용 (작은 글씨)

### 최근 글
```html
[##_recent_article_##]     최근 글 목록 (자동 생성)
```

### 최근 댓글
```html
[##_recent_comment_##]     최근 댓글 목록 (자동 생성)
```

### 최근 공지사항
```html
[##_recent_notice_##]      최근 공지사항 목록 (자동 생성)
```

---

## 📄 페이징

```html
<s_paging>
  <a [##_paging_rep_link_##]>[##_paging_rep_link_num_##]</a>
</s_paging>

[##_prev_page_##]          이전 페이지 링크
[##_next_page_##]          다음 페이지 링크
```

---

## 🔧 스킨 옵션 (변수)

### 변수 사용
```html
<!-- 조건부 표시 -->
<s_if_var_변수명>
  변수 값이 있으면 표시 (bool은 true면 표시)
</s_if_var_변수명>

<s_not_var_변수명>
  변수 값이 없으면 표시 (bool은 false면 표시)
</s_not_var_변수명>

<!-- 값 출력 -->
[##_var_변수명_##]
```

### index.xml 변수 정의 예제
```xml
<variables>
  <variablegroup name="디자인">
    <variable>
      <name>accentColor</name>
      <label>대표 색상</label>
      <type>COLOR</type>
      <default>#3b82f6</default>
    </variable>

    <variable>
      <name>enableDarkMode</name>
      <label>다크모드 활성화</label>
      <type>BOOL</type>
      <default>true</default>
    </variable>

    <variable>
      <name>listStyle</name>
      <label>목록 스타일</label>
      <type>SELECT</type>
      <option><![CDATA[
        [
          {"name":"card", "label":"카드형", "value":"card"},
          {"name":"list", "label":"리스트형", "value":"list"}
        ]
      ]]></option>
      <default>card</default>
    </variable>
  </variablegroup>
</variables>
```

**변수 타입**:
- `STRING` - 문자열 입력
- `SELECT` - 드롭다운 선택
- `IMAGE` - 이미지 URL
- `BOOL` - true/false
- `COLOR` - 색상 선택

---

## 🏠 홈 커버 (선택사항)

```html
<s_cover_group>
  <s_cover_rep>
    <s_cover name="커버이름">
      [##_cover_title_##]              커버 타이틀

      <s_cover_item>
        [##_cover_item_title_##]       아이템 제목
        [##_cover_item_summary_##]     아이템 요약
        [##_cover_item_url_##]         아이템 URL

        <s_cover_item_thumbnail>
          [##_cover_item_thumbnail_##] 아이템 썸네일
        </s_cover_item_thumbnail>

        <!-- 글인 경우만 -->
        <s_cover_item_article_info>
          [##_cover_item_category_##]  카테고리
          [##_cover_item_date_##]      발행일시
        </s_cover_item_article_info>
      </s_cover_item>
    </s_cover>
  </s_cover_rep>
</s_cover_group>
```

---

## 📱 자주 쓰는 패턴 예제

### 1. 기본 HTML 구조
```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[##_page_title_##]</title>
  <meta name="description" content="[##_desc_##]">
  <link rel="stylesheet" href="./style.css">
</head>
<body id="[##_body_id_##]">
<s_t3>
  <!-- 모든 콘텐츠는 s_t3 안에 -->
</s_t3>
</body>
</html>
```

### 2. 헤더
```html
<header>
  <h1><a href="[##_blog_link_##]">[##_title_##]</a></h1>
  <p>[##_desc_##]</p>
  <nav>[##_blog_menu_##]</nav>
</header>
```

### 3. 글 목록 (카드형)
```html
<s_index_article_rep>
  <article class="card">
    <s_article_rep_thumbnail>
      <img src="[##_article_rep_thumbnail_url_##]" alt="">
    </s_article_rep_thumbnail>

    <h2><a href="[##_article_rep_link_##]">[##_article_rep_title_##]</a></h2>

    <div class="meta">
      <a href="[##_article_rep_category_link_##]">
        [##_article_rep_category_##]
      </a>
      <time>[##_article_rep_simple_date_##]</time>
      <s_rp_count>
        <span>댓글 [##_article_rep_rp_cnt_##]</span>
      </s_rp_count>
    </div>

    <p>[##_article_rep_summary_##]</p>

    <s_tag_label>
      <div class="tags">[##_tag_label_rep_##]</div>
    </s_tag_label>
  </article>
</s_index_article_rep>
```

### 4. 글 상세
```html
<s_permalink_article_rep>
  <article>
    <h1>[##_article_rep_title_##]</h1>

    <div class="meta">
      <time>[##_article_rep_date_##]</time>
      <a href="[##_article_rep_category_link_##]">
        [##_article_rep_category_##]
      </a>
    </div>

    <div class="content">
      [##_article_rep_desc_##]
    </div>

    <s_tag_label>
      <div class="tags">[##_tag_label_rep_##]</div>
    </s_tag_label>

    <!-- 관리 버튼 (관리자에게만 표시) -->
    <s_ad_div>
      <a href="[##_s_ad_m_link_##]">수정</a>
      <button onclick="[##_s_ad_d_onclick_##]">삭제</button>
    </s_ad_div>
  </article>

  <!-- 이전/다음 -->
  <nav class="post-nav">
    <s_article_prev>
      <a href="[##_article_prev_link_##]">← [##_article_prev_title_##]</a>
    </s_article_prev>
    <s_article_next>
      <a href="[##_article_next_link_##]">[##_article_next_title_##] →</a>
    </s_article_next>
  </nav>

  <!-- 댓글 -->
  <div class="comments">
    [##_guestbook_group_##]
  </div>
</s_permalink_article_rep>
```

### 5. 사이드바
```html
<aside>
  <!-- 프로필 -->
  <div class="profile">
    [##_blog_image_##]
    <h3>[##_title_##]</h3>
    <p>[##_desc_##]</p>
  </div>

  <!-- 카테고리 -->
  <div class="categories">
    <h3>카테고리</h3>
    [##_category_list_##]
  </div>

  <!-- 태그 -->
  <s_tag>
    <div class="tags">
      <h3>태그</h3>
      <s_tag_rep>
        <a href="[##_tag_link_##]" class="[##_tag_class_##]">
          [##_tag_name_##]
        </a>
      </s_tag_rep>
    </div>
  </s_tag>

  <!-- 최근 글 -->
  <div class="recent-posts">
    <h3>최근 글</h3>
    [##_recent_article_##]
  </div>
</aside>
```

### 6. 검색 폼
```html
<form class="search">
  <input type="text" class="search-input" placeholder="검색...">
  <button type="button" class="search-btn">검색</button>
</form>

<script>
// JavaScript로 검색 처리
document.querySelector('.search-btn').addEventListener('click', () => {
  const query = document.querySelector('.search-input').value;
  if (query) {
    window.location.href = '/search/' + encodeURIComponent(query);
  }
});
</script>
```

---

## ⚠️ 중요 주의사항

### 1. 필수 래퍼
```html
<s_t3>
  <!-- 모든 콘텐츠는 반드시 이 안에 -->
</s_t3>
```

### 2. 페이지 타입 감지
```javascript
const bodyId = document.body.id;
if (bodyId === 'tt-body-index') {
  // 홈 페이지
} else if (bodyId === 'tt-body-page') {
  // 글 상세 페이지
}
```

### 3. 조건부 렌더링
```html
<!-- 썸네일이 있을 때만 표시 -->
<s_article_rep_thumbnail>
  <img src="[##_article_rep_thumbnail_url_##]">
</s_article_rep_thumbnail>

<!-- 댓글이 있을 때만 표시 -->
<s_rp_count>
  댓글 [##_article_rep_rp_cnt_##]개
</s_rp_count>
```

### 4. 치환자 중첩 불가
```html
<!-- ❌ 잘못된 사용 -->
<s_article_rep>
  <s_article_rep>중첩 불가</s_article_rep>
</s_article_rep>

<!-- ✅ 올바른 사용 -->
<s_article_rep>
  <s_article_rep_thumbnail>가능</s_article_rep_thumbnail>
</s_article_rep>
```

---

## 🔗 참고

- **상세 가이드**: `TISTRORY_skin_guide.md` (1,748줄 전체 문서)
- **프로젝트 가이드**: `CLAUDE.md`
- **참고 스킨**: `reference/` 디렉토리
