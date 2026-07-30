# TS 업무노트 — CLAUDE.md

새 세션에서 이 파일을 읽으면 프로젝트 맥락을 바로 파악할 수 있습니다.

---

## 프로젝트 개요

- OneNote로 관리하던 MES/SPC/REPORT 업무 지식(EVENT NAME, 용어 등)을 대체하는 개인용 노트 관리 웹앱
- **운영 URL**: https://ts-liart.vercel.app
- **GitHub**: https://github.com/taesik729/TS (Private)
- **배포**: GitHub main 브랜치 push → Vercel(taesik-farm 팀, 프로젝트명 `ts`) 자동 배포
- 로그인 없음 — 개인 전용, anon key로 바로 CRUD

---

## 기술 스택

Vue 3 (`<script setup>`) + Vite + Supabase(JS client) + vue-router + TipTap(`@tiptap/vue-3`, `@tiptap/starter-kit`, `@tiptap/extension-image` — CSR 리치텍스트 에디터용). 전역 스타일은 `src/style.css`(CSS 변수로 색상·버튼·입력창 톤 통일, main.js에서 import) — 새 화면 만들 때 이 변수(`--color-*`) 재사용할 것.

---

## Supabase

- **태식팜(FRONTEND) 프로젝트와 동일한 Supabase 인스턴스를 재사용** (별도 프로젝트 아님)
- 이 앱 전용 테이블: `ts_notes`, `csr_tasks`, `csr_comments` (모두 RLS 비활성화 — 개인용 도구라 로그인 없이 anon key로 직접 CRUD)
- Storage 버킷: `csr-attachments` (공개 읽기/쓰기 — CSR 본문에 삽입되는 이미지 업로드용)
- 마이그레이션: `src/supabase/migrations/001_init.sql`, `002_split_content.sql`, `003_csr.sql`, `004_csr_drop_author.sql`, `005_csr_drop_subtasks.sql`

```sql
ts_notes: id, note_date(date), category(MES|SPC|REPORT), title, request_content, resolution_content, created_at, updated_at
csr_tasks: id, task_no(자동증가), title, status(진행|완료), assignee, start_date, due_date, priority(낮음|보통|높음), progress(0~100), content(리치텍스트 HTML), created_at, updated_at
csr_comments: id, task_id(FK), content, created_at
```

---

## 폴더 구조

```
src/
├── router/
│   └── index.js            # /settings, /csr, /ts(기본), /work, /study
├── components/
│   └── BottomNav.vue        # 하단 5탭 (기준정보/CSR/TS/업무파악/공부)
├── views/
│   ├── TSView.vue           # TS(트러블슈팅) 화면 — 필터+그리드+상세 모두 포함, 컴포넌트 분리 안 함
│   ├── SettingsView.vue     # 기준정보 — 준비중 placeholder
│   ├── CSRView.vue          # CSR 업무 관리 — 그리드 + 우측 슬라이드 작성/상세 패널
│   ├── WorkView.vue         # 업무일지 — 준비중 placeholder
│   └── StudyView.vue        # 개발공부 — 준비중 placeholder
├── composables/
│   ├── useNotes.js          # TS Supabase CRUD (fetchList/insertNote/updateNote)
│   └── useCSR.js            # CSR Supabase CRUD (useCSRTasks/useComments/uploadCSRImage)
└── supabase/
    ├── client.js
    └── migrations/001_init.sql ~ 005_csr_drop_subtasks.sql
```

---

## 하단 네비게이션

- 5탭: **기준정보 / CSR / TS / 업무일지 / 개발공부** ("TS" = Troubleshooting 약자, "기준정보"는 예전 "환경설정", "업무일지"는 예전 "업무파악", "개발공부"는 예전 "공부"에서 이름 변경)
- 각 탭은 좌측 사이드(aside) + 우측 메인 영역 레이아웃을 공유 — 좌측에는 탭마다 다른 콤보/텍스트가 들어갈 수 있음 (TS는 기간·분류 필터, 나머지는 아직 미정)
- 기준정보/업무일지/개발공부는 아직 내용 미정 — 향후 설계 후 구현 예정

## TS 탭 화면 동작

- **화면은 항상 조회(읽기전용) 상태 유지** — 좌측 기간(시작~종료 날짜)·분류 필터 + 상단 제목/내용 통합 검색 + 그리드(읽기전용, 화면 전체 높이). 업무파악(조회) 중 방해받지 않도록 그리드를 인라인 편집으로 바꾸지 않음. 하단 별도 상세 패널 없음 — 그리드 자체가 전체 정보를 보여줌
- 날짜 필터는 단일 날짜가 아니라 **기간 선택**(`filterDateFrom`~`filterDateTo`, `useNotes.fetchList`의 `dateFrom`/`dateTo`로 gte/lte 필터). 기본값은 **한 달 전 ~ 오늘**
- **그리드 컬럼 순서**: 분류 → 제목 → 요청사항 → 처리사항 → 날짜. 요청사항/처리사항은 줄 수 제한 없이 **전체 내용**을 그대로 표시 (한눈에 훑어보기 위함 — 내용이 길면 그 행만 자연스럽게 높아짐)
- **추가/수정은 팝업(모달)으로 분리**: "추가" 또는 "수정" 클릭 시 화면 위에 모달이 뜨고, 그 안에 날짜/분류/제목/요청사항/처리사항 입력 필드 + 저장/취소 버튼이 있음. 배경의 조회 화면은 그대로 유지됨
- 모달의 저장 버튼 하나로 (날짜·분류·제목) + (요청사항·처리사항)을 한 번에 insert/update
- 검색은 제목 + 요청사항 + 처리사항 내용까지 포함해서 검색 (날짜·분류 필터와 조합 가능)

## CSR 탭 화면 동작

- 회사 업무 관리 도구(Dooray류)를 참고해서 구현한 업무 트래커. 좌측 기간·상태 필터 + 상단 검색/추가 + 그리드(10컬럼: 업무명/상태/담당자/시작일/마감일/우선순위/진척도/등록일/수정일/업무번호)
- **행 클릭 또는 "추가" 클릭 → 화면 우측에서 슬라이드로 열리는 패널(820px 폭)**에서 작성/수정 (TS처럼 중앙 모달이 아니라 우측 패널 방식)
  - 업무명, 상태(진행/완료), 담당자, 시작일/마감일, 우선순위(낮음/보통/높음), 진척도(0~100) — 라벨을 입력창 위가 아니라 옆에 배치("상태: [콤보]" 형태, `.meta-row`)
  - 본문은 **요청사항/처리사항 구분 없이 하나의 리치텍스트(TipTap)**, 최소 높이 580px — 붙여넣기·드래그로 이미지 넣으면 `csr-attachments` Storage에 자동 업로드 후 본문에 바로 삽입됨
  - **댓글**은 업무를 먼저 저장(신규 생성)해야 추가 가능 — `task_id`가 있어야 하는 하위 테이블이라 저장 전에는 "저장 후 추가 가능" 안내만 표시. 댓글별 삭제 버튼 있음(`useComments.deleteComment`)
  - 하위업무(체크리스트) 기능은 만들었다가 제거함 — 필요해지면 재설계
- 상단 "저장" 버튼은 업무 메인 필드(제목~진척도, 본문)만 저장. 댓글은 입력창에서 즉시 저장(별도 흐름)

## 개발 환경

```bash
npm run dev     # 로컬 개발 서버 (port 3100)
npm run build   # 프로덕션 빌드
```

- `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (태식팜과 동일 값, git에는 미포함)
- Vercel 프로젝트 Environment Variables에도 동일 값 등록 필요
