<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useNotes } from '../composables/useNotes'

const CATEGORIES = ['MES', 'SPC', 'MMD']

const { notes, loading, fetchList, insertNote, updateNote, deleteNote } = useNotes()

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function oneMonthAgoStr() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 10)
}

const filterDateFrom = ref(oneMonthAgoStr())   // 기본: 한 달 전
const filterDateTo = ref(todayStr())           // 기본: 오늘
const filterCategory = ref('')   // '' = 전체
const searchKeyword = ref('')

const selectedId = ref(null)
const selectedNote = computed(() => notes.value.find(n => n.id === selectedId.value) || null)

const showModal = ref(false)
const modalMode = ref('add')     // 'add' | 'edit'
const draft = ref({ note_date: '', category: 'MES', title: '', request_content: '', resolution_content: '' })

async function reload() {
  await fetchList({
    dateFrom: filterDateFrom.value || null,
    dateTo: filterDateTo.value || null,
    category: filterCategory.value || null,
    keyword: searchKeyword.value.trim() || null
  })
}

function clearDateRange() {
  filterDateFrom.value = ''
  filterDateTo.value = ''
}

onMounted(reload)
watch([filterDateFrom, filterDateTo, filterCategory], reload)

function selectRow(note) {
  selectedId.value = note.id
}

function openAdd() {
  modalMode.value = 'add'
  draft.value = {
    note_date: filterDateFrom.value || todayStr(),
    category: filterCategory.value || 'MES',
    title: '',
    request_content: '',
    resolution_content: ''
  }
  showModal.value = true
}

function openEdit() {
  if (!selectedNote.value) return
  modalMode.value = 'edit'
  draft.value = {
    note_date: selectedNote.value.note_date,
    category: selectedNote.value.category,
    title: selectedNote.value.title,
    request_content: selectedNote.value.request_content || '',
    resolution_content: selectedNote.value.resolution_content || ''
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function save() {
  if (!draft.value.title.trim()) {
    alert('제목을 입력해주세요.')
    return
  }
  const payload = {
    note_date: draft.value.note_date,
    category: draft.value.category,
    title: draft.value.title,
    request_content: draft.value.request_content,
    resolution_content: draft.value.resolution_content
  }

  if (modalMode.value === 'add') {
    const created = await insertNote(payload)
    await reload()
    selectedId.value = created.id
  } else {
    await updateNote(selectedId.value, payload)
    await reload()
  }
  showModal.value = false
}

async function handleDelete() {
  if (!selectedId.value) return
  if (!confirm('이 항목을 삭제할까요?')) return
  await deleteNote(selectedId.value)
  selectedId.value = null
  showModal.value = false
  await reload()
}
</script>

<template>
  <div class="board">
    <aside class="side">
      <div class="field">
        <label>기간</label>
        <input type="date" v-model="filterDateFrom" class="date-full" />
        <span class="range-sep">~</span>
        <input type="date" v-model="filterDateTo" class="date-full" />
        <button v-if="filterDateFrom || filterDateTo" class="clear" @click="clearDateRange">전체 기간</button>
      </div>
      <div class="field">
        <label>분류</label>
        <select v-model="filterCategory">
          <option value="">전체</option>
          <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
    </aside>

    <main class="main">
      <div class="toolbar">
        <input
          type="text"
          class="search-input"
          v-model="searchKeyword"
          placeholder="제목·내용 검색"
          @keyup.enter="reload"
        />
        <button @click="reload">검색</button>
        <div class="toolbar-actions">
          <button class="primary" @click="openAdd">추가</button>
          <button :disabled="!selectedId" @click="openEdit">수정</button>
        </div>
      </div>

      <div class="grid">
        <table>
          <thead>
            <tr>
              <th class="col-cat">분류</th>
              <th class="col-title">제목</th>
              <th>TS발생</th>
              <th>TS처리</th>
              <th class="col-date">날짜</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="note in notes"
              :key="note.id"
              :class="{ selected: note.id === selectedId }"
              @click="selectRow(note)"
            >
              <td>{{ note.category }}</td>
              <td>{{ note.title }}</td>
              <td class="content-cell">{{ note.request_content }}</td>
              <td class="content-cell">{{ note.resolution_content }}</td>
              <td>{{ note.note_date }}</td>
            </tr>
            <tr v-if="!loading && notes.length === 0">
              <td colspan="5" class="empty">항목이 없습니다.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <h3>{{ modalMode === 'add' ? '항목 추가' : '항목 수정' }}</h3>
        <div class="modal-grid">
          <div class="modal-row">
            <label>날짜</label>
            <input type="date" v-model="draft.note_date" />
          </div>
          <div class="modal-row">
            <label>분류</label>
            <select v-model="draft.category">
              <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
        </div>
        <div class="modal-row">
          <label>제목</label>
          <input type="text" v-model="draft.title" placeholder="제목 입력" />
        </div>
        <div class="modal-row content-row">
          <label>TS발생</label>
          <textarea v-model="draft.request_content" placeholder="TS발생 내용을 입력하세요."></textarea>
        </div>
        <div class="modal-row content-row">
          <label>TS처리</label>
          <textarea v-model="draft.resolution_content" placeholder="TS처리 내용을 입력하세요."></textarea>
        </div>
        <div class="modal-actions">
          <button v-if="modalMode === 'edit'" class="danger" @click="handleDelete">삭제</button>
          <div class="modal-actions-right">
            <button @click="closeModal">취소</button>
            <button class="primary" @click="save">저장</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.board {
  display: flex;
  height: 100%;
}

.side {
  width: 220px;
  flex-shrink: 0;
  padding: 20px 16px;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.date-full {
  width: 100%;
  padding: 6px 8px;
}

.range-sep {
  color: var(--color-text-muted);
  font-size: 12px;
  text-align: center;
}

.field select {
  padding: 7px 8px;
}

.clear {
  font-size: 12px;
  padding: 4px 10px;
  align-self: flex-start;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.toolbar {
  padding: 12px 20px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  width: 240px;
}

.toolbar-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

.grid {
  flex: 1;
  overflow: auto;
  padding: 16px 20px;
}

table {
  width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

th, td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--color-border);
  border-right: 1px solid var(--color-border);
  text-align: left;
  font-size: 14px;
  vertical-align: top;
}

th:last-child, td:last-child {
  border-right: none;
}

th {
  background: #fafbfc;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

tbody tr:last-child td {
  border-bottom: none;
}

.col-date { width: 110px; }
.col-cat { width: 90px; }
.col-title { width: 160px; }

.content-cell {
  white-space: pre-line;
  line-height: 1.5;
  color: var(--color-text);
  word-break: break-word;
}

tbody tr {
  cursor: pointer;
  transition: background 0.1s ease;
}

tbody tr:nth-child(even) {
  background: #fafbfc;
}

tbody tr:hover {
  background: #f0f3f8;
}

tbody tr.selected {
  background: var(--color-primary-soft);
}

.empty {
  text-align: center;
  color: var(--color-text-muted);
  padding: 32px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 20, 30, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: var(--color-surface);
  width: 720px;
  max-width: 95vw;
  max-height: 92vh;
  overflow-y: auto;
  padding: 28px;
  border-radius: 12px;
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal h3 {
  margin: 0;
  font-size: 18px;
}

.modal-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.modal-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.modal-row label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.modal-row textarea {
  min-height: 80px;
  resize: vertical;
}

.content-row textarea {
  min-height: 180px;
  font-size: 15px;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 4px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.modal-actions-right {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.danger {
  color: #dc2626;
  border-color: #dc2626;
  background: none;
}

.danger:hover {
  background: #fef2f2;
}

@media (max-width: 720px) {
  .board {
    flex-direction: column;
  }

  .side {
    width: auto;
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    align-items: flex-end;
    gap: 8px;
    padding: 8px 12px;
  }

  .field {
    flex: none;
    flex-direction: row;
    align-items: center;
    gap: 4px;
  }

  .field label {
    font-size: 10px;
    flex-shrink: 0;
  }

  .date-full {
    width: 82px;
    flex-shrink: 0;
    font-size: 12px;
    padding: 5px 4px;
  }

  .range-sep {
    padding: 0 1px;
  }

  .clear {
    font-size: 11px;
    padding: 4px 8px;
    white-space: nowrap;
  }

  .field select {
    font-size: 12px;
    padding: 5px 6px;
  }

  .toolbar {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding: 8px 12px;
  }

  .search-input {
    width: 120px;
    flex: 1;
    min-width: 90px;
  }

  .toolbar button {
    font-size: 12px;
    padding: 5px 10px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .toolbar-actions {
    margin-left: 0;
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  .grid {
    padding: 10px 12px;
  }

  table {
    min-width: 640px;
  }

  .modal {
    padding: 16px;
  }

  .modal-grid {
    grid-template-columns: 1fr;
  }
}
</style>
