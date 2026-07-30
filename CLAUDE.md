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

Vue 3 (`<script setup>`) + Vite + Supabase(JS client) + vue-router. 전역 스타일은 `src/style.css`(CSS 변수로 색상·버튼·입력창 톤 통일, main.js에서 import) — 새 화면 만들 때 이 변수(`--color-*`) 재사용할 것.

---

## Supabase

- **태식팜(FRONTEND) 프로젝트와 동일한 Supabase 인스턴스를 재사용** (별도 프로젝트 아님)
- 이 앱 전용 테이블: `ts_notes` (RLS 비활성화 — 개인용 도구라 로그인 없이 anon key로 직접 CRUD)
- 마이그레이션: `src/supabase/migrations/001_init.sql`, `002_split_content.sql`

```sql
ts_notes: id, note_date(date), category(MES|SPC|REPORT), title, request_content, resolution_content, created_at, updated_at
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
│   ├── CSRView.vue          # CSR — 준비중 placeholder
│   ├── WorkView.vue         # 업무파악 — 준비중 placeholder
│   └── StudyView.vue        # 공부 — 준비중 placeholder
├── composables/
│   └── useNotes.js          # Supabase CRUD (fetchList/insertNote/updateNote)
└── supabase/
    ├── client.js
    └── migrations/001_init.sql
```

---

## 하단 네비게이션

- 5탭: **기준정보 / CSR / TS / 업무일지 / 개발공부** ("TS" = Troubleshooting 약자, "기준정보"는 예전 "환경설정", "업무일지"는 예전 "업무파악", "개발공부"는 예전 "공부"에서 이름 변경)
- 각 탭은 좌측 사이드(aside) + 우측 메인 영역 레이아웃을 공유 — 좌측에는 탭마다 다른 콤보/텍스트가 들어갈 수 있음 (TS는 기간·분류 필터, 나머지는 아직 미정)
- 기준정보/CSR/업무일지/개발공부는 아직 내용 미정 — 향후 설계 후 구현 예정

## TS 탭 화면 동작

- **화면은 항상 조회(읽기전용) 상태 유지** — 좌측 기간(시작~종료 날짜)·분류 필터 + 상단 제목/내용 통합 검색 + 그리드(읽기전용, 화면 전체 높이). 업무파악(조회) 중 방해받지 않도록 그리드를 인라인 편집으로 바꾸지 않음. 하단 별도 상세 패널 없음 — 그리드 자체가 전체 정보를 보여줌
- 날짜 필터는 단일 날짜가 아니라 **기간 선택**(`filterDateFrom`~`filterDateTo`, `useNotes.fetchList`의 `dateFrom`/`dateTo`로 gte/lte 필터). 기본값은 **한 달 전 ~ 오늘**
- **그리드 컬럼 순서**: 분류 → 제목 → 요청사항 → 처리사항 → 날짜. 요청사항/처리사항은 줄 수 제한 없이 **전체 내용**을 그대로 표시 (한눈에 훑어보기 위함 — 내용이 길면 그 행만 자연스럽게 높아짐)
- **추가/수정은 팝업(모달)으로 분리**: "추가" 또는 "수정" 클릭 시 화면 위에 모달이 뜨고, 그 안에 날짜/분류/제목/요청사항/처리사항 입력 필드 + 저장/취소 버튼이 있음. 배경의 조회 화면은 그대로 유지됨
- 모달의 저장 버튼 하나로 (날짜·분류·제목) + (요청사항·처리사항)을 한 번에 insert/update
- 검색은 제목 + 요청사항 + 처리사항 내용까지 포함해서 검색 (날짜·분류 필터와 조합 가능)

---

## 개발 환경

```bash
npm run dev     # 로컬 개발 서버 (port 3100)
npm run build   # 프로덕션 빌드
```

- `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (태식팜과 동일 값, git에는 미포함)
- Vercel 프로젝트 Environment Variables에도 동일 값 등록 필요
