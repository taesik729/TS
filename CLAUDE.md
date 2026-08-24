# TS 업무노트 — CLAUDE.md

새 세션에서 이 파일을 읽으면 프로젝트 맥락을 바로 파악할 수 있습니다.

---

## 프로젝트 개요

- OneNote로 관리하던 MES/SPC/MMD 업무 지식(EVENT NAME, 용어 등)을 대체하는 개인용 노트 관리 웹앱
- **운영 URL**: https://ts-liart.vercel.app
- **GitHub**: https://github.com/taesik729/TS (Private)
- **배포**: GitHub main 브랜치 push → Vercel(taesik-farm 팀, 프로젝트명 `ts`) 자동 배포
- 로그인 없음 — 개인 전용, anon key로 바로 CRUD
- 파비콘: `public/favicon.svg` (보라색(#6d5cd8) 둥근 사각형 + 흰색 "TS" 텍스트), `index.html`에서 링크
- **PWA**: `public/manifest.webmanifest` + `public/sw.js`(최소 서비스워커, 캐싱 없이 네트워크로만 패스스루) — 휴대폰에서 "홈 화면에 추가"하면 standalone 모드(브라우저 UI 없이) 앱처럼 열림. `src/main.js`에서 서비스워커 등록

---

## 기술 스택

Vue 3 (`<script setup>`) + Vite + Supabase(JS client) + vue-router + TipTap(`@tiptap/vue-3`, `@tiptap/starter-kit`, `@tiptap/extension-image` — CSR 리치텍스트 에디터용). 전역 스타일은 `src/style.css`(CSS 변수로 색상·버튼·입력창 톤 통일, main.js에서 import) — 새 화면 만들 때 이 변수(`--color-*`) 재사용할 것.

---

## Supabase

- **태식팜(FRONTEND) 프로젝트와 동일한 Supabase 인스턴스를 재사용** (별도 프로젝트 아님)
- 이 앱 전용 테이블: `ts_notes`, `csr_tasks`, `csr_comments`, `work_logs`, `analysis_items` (모두 RLS 비활성화 — 개인용 도구라 로그인 없이 anon key로 직접 CRUD)
- Storage 버킷: `csr-attachments` (공개 읽기/쓰기 — CSR·업무일지·분석 본문에 삽입되는 이미지 업로드용, 세 화면이 같은 버킷 공유)
- 마이그레이션: `src/supabase/migrations/001_init.sql` ~ `008_analysis.sql`

```sql
ts_notes: id, note_date(date), category(MES|SPC|MMD), title, request_content, resolution_content, created_at, updated_at
csr_tasks: id, task_no(자동증가), title, status(진행|완료), assignee, start_date, due_date, priority(낮음|보통|높음), progress(0~100), content(리치텍스트 HTML), created_at, updated_at
csr_comments: id, task_id(FK), content, created_at
work_logs: id, log_date(date, UNIQUE — 하루 1건), content(리치텍스트 HTML), created_at, updated_at
analysis_items: id, parent_id(자기참조 FK, 무제한 depth 트리), system(MES|SPC|MMD, 최상위만), work_type(개발|분석, 최상위만), log_date(date, 최상위만), title, content(리치텍스트 HTML), sort_order, created_at, updated_at
```

---

## 폴더 구조

```
src/
├── router/
│   └── index.js            # /csr, /ts(기본), /work, /study — /settings는 삭제됨
├── components/
│   ├── BottomNav.vue        # 하단 4탭 (CSR/TS/업무일지/설정&분석)
│   └── AnalysisTreeNode.vue # 분석 트리용 재귀 컴포넌트 (SFC 자기 자신을 재귀 참조)
├── views/
│   ├── TSView.vue           # TS(트러블슈팅) 화면 — 필터+그리드+상세 모두 포함, 컴포넌트 분리 안 함
│   ├── CSRView.vue          # CSR 업무 관리 — 그리드 + 우측 슬라이드 작성/상세 패널
│   ├── WorkView.vue         # 업무일지 — 달력 뷰 + 우측 슬라이드 작성 패널
│   └── StudyView.vue        # 설정&분석 — 상단 필터바 + 좌측 트리 + 우측 인라인 편집 (라우트/파일명은 그대로 study)
├── composables/
│   ├── useNotes.js          # TS Supabase CRUD (fetchList/insertNote/updateNote/deleteNote)
│   ├── useCSR.js            # CSR Supabase CRUD (useCSRTasks/useComments/uploadCSRImage) — uploadCSRImage는 업무일지·분석도 재사용
│   ├── useWorkLogs.js       # 업무일지 Supabase CRUD (fetchMonth/fetchByDate/upsertLog/deleteLog)
│   └── useAnalysis.js       # 분석 Supabase CRUD (fetchTree/addItem/updateItem/deleteItem)
└── supabase/
    ├── client.js
    └── migrations/001_init.sql ~ 008_analysis.sql
```

---

## 하단 네비게이션

- 4탭: **CSR / TS / 업무일지 / 설정&분석** ("TS" = Troubleshooting 약자, "업무일지"는 예전 "업무파악", "설정&분석"은 "환경설정"(기준정보로 바꿨다가 복귀)과 "분석"(공부→개발공부→분석) 두 탭을 하나로 합친 것 — 환경설정 탭은 내용이 없어서 삭제하고 라벨만 분석 탭에 병기)
- 각 탭은 좌측 사이드(aside) + 우측 메인 영역 레이아웃을 공유 — 좌측에는 탭마다 다른 콤보/텍스트가 들어갈 수 있음 (TS는 기간·분류 필터, 업무일지는 달력이라 사이드 없이 전체 폭 사용, 분석은 상단 바 + 좌측 트리)

## TS 탭 화면 동작

- **화면은 항상 조회(읽기전용) 상태 유지** — 좌측 기간(시작~종료 날짜)·분류 필터 + 상단 제목/내용 통합 검색 + 그리드(읽기전용, 화면 전체 높이). 업무파악(조회) 중 방해받지 않도록 그리드를 인라인 편집으로 바꾸지 않음. 하단 별도 상세 패널 없음 — 그리드 자체가 전체 정보를 보여줌
- 날짜 필터는 단일 날짜가 아니라 **기간 선택**(`filterDateFrom`~`filterDateTo`, `useNotes.fetchList`의 `dateFrom`/`dateTo`로 gte/lte 필터). 기본값은 **한 달 전 ~ 오늘**
- **그리드 컬럼 순서**: 분류 → 제목 → TS발생 → TS처리 → 날짜 (화면 라벨. DB 컬럼명은 그대로 `request_content`/`resolution_content`). TS발생/TS처리는 줄 수 제한 없이 **전체 내용**을 그대로 표시 (한눈에 훑어보기 위함 — 내용이 길면 그 행만 자연스럽게 높아짐)
- **추가/수정은 팝업(모달)으로 분리**: "추가" 또는 "수정" 클릭 시 화면 위에 모달이 뜨고, 그 안에 날짜/분류/제목/TS발생/TS처리 입력 필드 + 저장/취소 버튼이 있음. 배경의 조회 화면은 그대로 유지됨
- 모달의 저장 버튼 하나로 (날짜·분류·제목) + (TS발생·TS처리)을 한 번에 insert/update
- **수정 모드일 때만** 모달 좌측에 "삭제" 버튼 표시 (`useNotes.deleteNote`) — 신규 작성 중엔 안 보임
- 검색은 제목 + TS발생 + TS처리 내용까지 포함해서 검색 (날짜·분류 필터와 조합 가능)

## CSR 탭 화면 동작

- 회사 업무 관리 도구(Dooray류)를 참고해서 구현한 업무 트래커. 좌측 기간·상태 필터 + 상단 검색/추가 + 그리드(10컬럼: 업무명/상태/담당자/시작일/마감일/우선순위/진척도/등록일/수정일/업무번호)
- **행 클릭 또는 "추가" 클릭 → 화면 우측에서 슬라이드로 열리는 패널(820px 폭)**에서 작성/수정 (TS처럼 중앙 모달이 아니라 우측 패널 방식). 패널 내부는 단일 컬럼(위→아래): 업무명 → 메타 필드 → 본문(리치텍스트) → 댓글
  - 업무명, 상태(진행/완료), 담당자, 시작일/마감일, 우선순위(낮음/보통/높음), 진척도(0~100) — 라벨을 입력창 위가 아니라 옆에 배치("상태: [콤보]" 형태, `.meta-row`)
  - 본문은 **요청사항/처리사항 구분 없이 하나의 리치텍스트(TipTap)** — `.editor-section`이 flex:1이라 남은 세로 공간을 그대로 채움(고정 높이 아님)
  - **이미지는 붙여넣기/드래그 시 즉시 Storage에 올라가지 않음** — `blob:` 로컬 미리보기만 본문에 삽입되고(`pendingImages` Map에 File 보관), **"저장" 버튼을 눌러야** `resolvePendingImages()`가 실제로 `csr-attachments` Storage에 업로드해서 blob URL을 공개 URL로 치환. 저장 안 하고 닫으면 Storage에 미사용 파일이 남지 않음
  - **댓글**은 본문 바로 아래(`.comments-section`, 라벨 없음)에 위치 — 업무를 먼저 저장(신규 생성)해야 추가 가능. `task_id`가 있어야 하는 하위 테이블이라 저장 전에는 "저장 후 추가 가능" 안내만 표시. 댓글별 삭제 버튼 있음(`useComments.deleteComment`)
  - (참고) 댓글을 우측 별도 사이드 패널로 분리해본 적 있으나, 본문과의 여백이 과해 보여서 다시 하단 배치로 되돌림. 하위업무(체크리스트) 기능도 만들었다가 제거함 — 필요해지면 재설계
- 상단 "저장" 버튼은 업무 메인 필드(제목~진척도, 본문·이미지 업로드 포함) 저장 후 **패널을 자동으로 닫음**. 댓글은 입력창에서 즉시 저장(별도 흐름, 패널 안 닫힘)
- **패널 하단 좌측에 "삭제" 버튼** — 기존 업무 수정 시에만 표시(신규 작성 중엔 안 보임). 확인 후 `csr_tasks` 삭제, 댓글(`csr_comments`)은 FK `ON DELETE CASCADE`로 자동 함께 삭제(`useCSRTasks.deleteTask`)

## 업무일지 탭 화면 동작

- **좌측 사이드 없이 전체 화면이 월간 달력** — 상단에 ◀/▶ 월 이동 + "오늘" 버튼, 요일 헤더(일~토), 7열 그리드로 날짜 셀
- 각 날짜 셀 우측 하단에 **점 표시**: `work_logs`에 그 날짜 기록이 있으면 초록(`#16a34a`), 없으면 빨강(`#dc2626`) — 조회월 범위 안의 모든 날짜(이전/다음달로 삐져나온 셀 포함)에 표시. 오늘 날짜는 파란 테두리(`--color-primary`)로 강조
- **하루 1건 원칙** — 날짜 셀 클릭 시 CSR "추가" 팝업과 동일한 스타일(우측 슬라이드 패널, 820px, TipTap 리치텍스트)이 뜸. 이미 그 날짜에 기록이 있으면 기존 내용을 불러와 이어서 수정, 없으면 빈 채로 새로 작성(별도 제목/상태 필드 없이 본문만 있음 — CSR보다 단순한 구조)
- 이미지도 CSR과 동일하게 **저장 시점에 지연 업로드** (`useCSR.uploadCSRImage` 재사용, `csr-attachments` 버킷 공유)
- 저장(`useWorkLogs.upsertLog`, `log_date` UNIQUE 기준 upsert) / 삭제(`useWorkLogs.deleteLog`, 기존 기록 있을 때만 버튼 노출) 후 패널 자동 닫힘 + 해당 월 점 표시 갱신

## 분석 탭 화면 동작

- 목적: **화면 분석·업무 분석 내용을 트리 구조로 정리**하는 용도 (OneNote 트리 메뉴를 대체하는 느낌). CSR/업무일지와 달리 **팝업이 아니라 좌우 분할 화면에 항상 붙어있는 인라인 편집** 방식
- **상단 바**: 기간(시작~종료 날짜) + 시스템(전체/MES/SPC/MMD) + 업무(전체/개발/분석) + 검색(제목+본문 내용, 트리의 모든 노드 대상) + "추가"(최상위 항목 신규 작성)
- **검색 시 첫 번째 매칭 항목을 우측에 자동으로 열어줌** — `reloadTree`가 `fetchTree` 완료 후 검색어가 있으면 `selectFirstMatch()` 호출, `items`(fetchTree가 채운 flat 배열, DB `sort_order`→`created_at` 순) 중 title/content가 일치하는 첫 항목을 찾아 `selectNode`로 바로 오른쪽에 표시. 필터만 바꿔서 재조회될 때도 검색어가 남아있으면 동일하게 동작
- **검색어 입력 중에는 OneNote 스타일 결과 드롭다운**이 검색창 아래 뜸(`showSearchDropdown` + `searchResults` computed) — `items`(현재 로드된 전체 데이터, 네트워크 재조회 없이 클라이언트에서만 필터링)에서 title/content가 일치하는 항목을 전부(최대 30개) 나열, 각 항목에 `시스템 » 상위경로 » ...` breadcrumb 표시. 항목 클릭(`@mousedown.prevent`로 blur보다 먼저 처리) 시 `selectSearchResult`가 바로 `selectNode` 호출해서 오른쪽에 표시 — "검색" 버튼을 안 눌러도 원하는 항목으로 바로 이동 가능. `searchKeyword`를 `watch`해서 값이 생기면 드롭다운을 띄움(입력 이벤트 자체가 아니라 값 변경에 반응 — 자동화 테스트 환경처럼 네이티브 `focus` 이벤트가 안 붙는 경우에도 안정적으로 동작하도록 이렇게 구현). "검색" 버튼 클릭/Enter/필터 변경으로 `reloadTree`가 돌면 드롭다운은 닫힘
- **좌측**: 트리 목록(`AnalysisTreeNode.vue`, 재귀 컴포넌트) — `useAnalysis.fetchTree`가 전체 항목을 한 번에 불러온 뒤 클라이언트에서 필터링. 검색어는 트리의 **모든 노드**(제목+하위업무)의 title/content를 대상으로 매칭하고, 매칭된 노드가 속한 **최상위 항목**에 시스템/업무/기간 필터를 적용해 최종 표시할 최상위 집합을 결정 → 그 서브트리 전체를 `parent_id` 기준으로 트리 구성. 하위업무는 계속 하위업무를 가질 수 있는 **무제한 depth**
- **검색어와 일치하는 트리 제목 글자는 노란색(`#fde047`)으로 하이라이트** — `AnalysisTreeNode`에 `keyword` prop을 재귀로 내려주고, 대소문자 무시하고 매칭되는 부분을 `<mark class="hl">`로 감싸서 `v-html` 렌더링(제목은 `escapeHtml`로 이스케이프 후 매칭 부분만 태그 삽입, XSS 방지)
- **우측 리치텍스트 본문 안의 검색어도 노란색 하이라이트** — 브라우저 **CSS Custom Highlight API**(`CSS.highlights` + `Highlight`/`Range`, 미지원 브라우저는 조용히 스킵)로 구현. `applyContentHighlight()`가 `.editor-content .ProseMirror`의 텍스트 노드를 TreeWalker로 훑어 검색어와 일치하는 Range들을 `CSS.highlights.set('search-hl', ...)`로 등록하고, 전역(비-scoped) `<style>` 블록의 `::highlight(search-hl) { background-color: #fde047; }`로 색을 입힘 — **TipTap 문서 자체(저장되는 HTML)는 전혀 건드리지 않음**, 순수 화면 표시용
  - **타이밍 주의**: 페이지 로드 후 맨 처음 항목을 열 때 TipTap이 처음으로 내용을 렌더링하면서 한 프레임 안에 DOM 반영이 안 끝나는 경우가 있었음 → (1) 에디터 영역을 `v-if`가 아니라 `v-show`(`.detail-form`)로 바꿔서 페이지 로드 시점부터 `EditorContent`가 항상 마운트되어 있게 하고, (2) `scheduleContentHighlight()`가 `nextTick` + 중첩 `requestAnimationFrame`으로 최대 3프레임에 걸쳐 재시도(idempotent라 여러 번 불러도 안전)
- **트리 최상위는 항상 MES/SPC/MMD 3개 고정 그룹** (`treeRoots` computed에서 `SYSTEMS.map(...)`로 가상 노드 생성, `id: 'sys-MES'` 등 `virtual: true`). 실제 최상위 항목(제목)들은 자기 `system` 값에 따라 해당 그룹의 자식으로 묶여서 표시됨 — DB에 진짜 "MES/SPC/MMD" row가 있는 게 아니라 화면에서만 그룹핑. 가상 노드는 `selectNode`에서 `node.virtual`이면 무시하고 펼침/접힘만 동작(편집화면 안 열림). "추가"할 때 상단 시스템 드롭다운(또는 필터에 선택된 시스템)으로 어느 그룹 아래 들어갈지 정해짐
- **우측**: 트리 노드를 클릭하면 그 자리에서 바로 내용이 편집 가능한 상태로 표시(`isEditing` 플래그로 `.empty-detail`/`.detail-form`을 `v-show`로 전환). 최상위(제목, `parent_id` 없음) 노드일 때만 시스템/업무/날짜 메타 필드가 보이고, 하위업무는 제목+본문만
- 본문은 CSR/업무일지와 동일하게 **TipTap 리치텍스트 + 이미지 지연 업로드**(`pendingImages`/`resolvePendingImages`, `csr-attachments` 버킷 재사용)
- 에디터 툴바의 **"+ 하위업무 추가"** 버튼(선택된 노드가 저장된 상태여야 활성화)으로 그 노드의 자식 항목을 새로 작성 — 저장 전까지 상단에 "상위 업무: OOO" 힌트 표시
- 저장(`useAnalysis.addItem`/`updateItem`) / 삭제(`useAnalysis.deleteItem`, FK `ON DELETE CASCADE`로 하위 트리 전체 삭제) — CSR/업무일지와 달리 저장해도 패널이 닫히지 않고 계속 그 화면에 머무름(팝업이 아니므로)

## 모바일(PWA) 대응

- `index.html`: `viewport-fit=cover` + `manifest.webmanifest` + `sw.js`(최소 서비스워커) 연결 — 휴대폰에서 "홈 화면에 추가" 시 standalone 모드로 앱처럼 실행됨
- **안전영역(노치/홈 인디케이터) 대응**: `App.vue`의 `.app-shell`에 `env(safe-area-inset-top/left/right)` 패딩, `BottomNav.vue`의 `.bottom-nav`에 `env(safe-area-inset-bottom)` 만큼 높이/패딩 추가. `App.vue`는 `100vh` 대신 `100dvh` 사용(모바일 브라우저 주소창 유무에 따른 높이 오차 방지)
- **각 화면(TS/CSR/업무일지/설정&분석)에 `@media (max-width: 720px)`** 반응형 규칙 — 좌측 고정폭 사이드바(`.side`, `.an-tree`)를 세로 스택 상단 배치로 전환, 툴바 `flex-wrap`, 슬라이드 패널은 `width: 100%`, 달력 셀은 패딩/폰트 축소. `src/style.css`에 `overflow-x: hidden` 안전망도 있음
- 이 항목들을 만들 때마다 위 미디어쿼리 패턴을 그대로 따라갈 것 — 새 화면 추가 시 모바일 대응 빠뜨리지 말 것 (실기기에서만 드러나는 레이아웃 버그가 반복되는 편이라 처음부터 방어적으로 작성)
- **하단 네비 밀림 버그 패턴**: `.board { display:flex } → .main { flex:1; display:flex; flex-direction:column }`처럼 flex-item이면서 동시에 flex-container인 요소는 반드시 `min-height: 0`을 같이 줄 것. 안 주면 내부 스크롤 영역(`.grid` 등)의 `flex:1; overflow:auto`가 무시되고 `.main`이 콘텐츠 크기만큼 늘어나서 전체 페이지가 뷰포트보다 커지고, 하단 `BottomNav`가 화면 밖으로 밀려나 버림(TS/CSR에서 실제 발생했던 버그). 새 화면 만들 때 이 패턴 체크할 것

## 개발 환경

```bash
npm run dev     # 로컬 개발 서버 (port 3100)
npm run build   # 프로덕션 빌드
```

- `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (태식팜과 동일 값, git에는 미포함)
- Vercel 프로젝트 Environment Variables에도 동일 값 등록 필요
