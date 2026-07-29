<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useNotes } from '../composables/useNotes'

const CATEGORIES = ['MES', 'SPC', 'REPORT']

const { notes, loading, fetchList, insertNote, updateNote } = useNotes()

const filterDate = ref('')       // '' = 전체
const filterCategory = ref('')   // '' = 전체
const searchKeyword = ref('')

const selectedId = ref(null)
const selectedNote = computed(() => notes.value.find(n => n.id === selectedId.value) || null)

const showModal = ref(false)
const modalMode = ref('add')     // 'add' | 'edit'
const draft = ref({ note_date: '', category: 'MES', title: '', request_content: '', resolution_content: '' })

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

async function reload() {
  await fetchList({
    date: filterDate.value || null,
    category: filterCategory.value || null,
    keyword: searchKeyword.value.trim() || null
  })
}

onMounted(reload)
watch([filterDate, filterCategory], reload)

function selectRow(note) {
  selectedId.value = note.id
}

function openAdd() {
  modalMode.value = 'add'
  draft.value = {
    note_date: filterDate.value || todayStr(),
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
</script>

<template>
  <div class="board">
    <aside class="side">
      <div class="field">
        <label>날짜</label>
        <input type="date" v-model="filterDate" />
        <button v-if="filterDate" class="clear" @click="filterDate = ''">전체</button>
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
        <button @click="openAdd">추가</button>
        <button :disabled="!selectedId" @click="openEdit">수정</button>
        <input
          type="text"
          class="search-input"
          v-model="searchKeyword"
          placeholder="제목·내용 검색"
          @keyup.enter="reload"
        />
        <button @click="reload">검색</button>
      </div>

      <div class="grid">
        <table>
          <thead>
            <tr>
              <th class="col-cat">분류</th>
              <th class="col-title">제목</th>
              <th>요청사항</th>
              <th>처리사항</th>
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
              <td class="truncate">{{ note.request_content }}</td>
              <td class="truncate">{{ note.resolution_content }}</td>
              <td>{{ note.note_date }}</td>
            </tr>
            <tr v-if="!loading && notes.length === 0">
              <td colspan="5" class="empty">항목이 없습니다.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="detail">
        <div class="detail-section">
          <label>요청사항</label>
          <div class="view-text">{{ selectedNote ? selectedNote.request_content : '행을 클릭하면 내용이 표시됩니다.' }}</div>
        </div>
        <div class="detail-section">
          <label>처리사항</label>
          <div class="view-text">{{ selectedNote ? selectedNote.resolution_content : '' }}</div>
        </div>
      </div>
    </main>

    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <h3>{{ modalMode === 'add' ? '항목 추가' : '항목 수정' }}</h3>
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
        <div class="modal-row">
          <label>제목</label>
          <input type="text" v-model="draft.title" placeholder="제목 입력" />
        </div>
        <div class="modal-row content-row">
          <label>요청사항</label>
          <textarea v-model="draft.request_content" placeholder="요청사항을 입력하세요."></textarea>
        </div>
        <div class="modal-row content-row">
          <label>처리사항</label>
          <textarea v-model="draft.resolution_content" placeholder="처리사항을 입력하세요."></textarea>
        </div>
        <div class="modal-actions">
          <button @click="save">저장</button>
          <button @click="closeModal">취소</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.board {
  display: flex;
  height: 100%;
  font-family: -apple-system, 'Malgun Gothic', sans-serif;
}

.side {
  width: 200px;
  flex-shrink: 0;
  padding: 16px;
  border-right: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field label {
  font-size: 12px;
  color: #666;
}

.field select,
.field input {
  padding: 6px 8px;
}

.clear {
  font-size: 12px;
  padding: 2px 6px;
  align-self: flex-start;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.toolbar {
  padding: 10px 16px;
  border-bottom: 1px solid #ddd;
  display: flex;
  gap: 8px;
}

.toolbar button {
  padding: 6px 14px;
  cursor: pointer;
}

.search-input {
  margin-left: auto;
  padding: 6px 8px;
  width: 220px;
}

.grid {
  flex: 0 0 45%;
  overflow-y: auto;
  border-bottom: 1px solid #ddd;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 8px 10px;
  border-bottom: 1px solid #eee;
  text-align: left;
  font-size: 14px;
}

.col-date { width: 110px; }
.col-cat { width: 90px; }
.col-title { width: 160px; }

.truncate {
  max-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

tbody tr {
  cursor: pointer;
}

tbody tr.selected {
  background: #eef6ff;
}

.empty {
  text-align: center;
  color: #999;
  padding: 24px;
}

.detail {
  flex: 1;
  min-height: 0;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.detail-section label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.view-text {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  white-space: pre-wrap;
  background: #fafafa;
  border-radius: 4px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: #fff;
  width: 720px;
  max-width: 95vw;
  max-height: 92vh;
  overflow-y: auto;
  padding: 24px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal h3 {
  margin: 0 0 4px;
}

.modal-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.modal-row label {
  font-size: 12px;
  color: #666;
}

.modal-row input,
.modal-row select {
  padding: 6px 8px;
  box-sizing: border-box;
}

.modal-row textarea {
  min-height: 80px;
  padding: 8px;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
  box-sizing: border-box;
}

.content-row textarea {
  min-height: 180px;
  font-size: 15px;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.modal-actions button {
  padding: 6px 16px;
  cursor: pointer;
}
</style>
