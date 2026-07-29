<script setup>
import { ref, onMounted, watch } from 'vue'
import { useNotes } from '../composables/useNotes'

const CATEGORIES = ['MES', 'SPC', 'REPORT']

const { notes, loading, fetchList, insertNote, updateNote } = useNotes()

const filterDate = ref('')       // '' = 전체
const filterCategory = ref('')   // '' = 전체

const mode = ref('view')         // 'view' | 'add' | 'edit'
const selectedId = ref(null)
const draft = ref({ note_date: '', category: 'MES', title: '', content: '' })

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

async function reload() {
  await fetchList({ date: filterDate.value || null, category: filterCategory.value || null })
}

onMounted(reload)
watch([filterDate, filterCategory], () => {
  if (mode.value === 'view') reload()
})

function selectRow(note) {
  if (mode.value !== 'view') return
  selectedId.value = note.id
  draft.value = { note_date: note.note_date, category: note.category, title: note.title, content: note.content || '' }
}

function startAdd() {
  mode.value = 'add'
  selectedId.value = null
  draft.value = {
    note_date: filterDate.value || todayStr(),
    category: filterCategory.value || 'MES',
    title: '',
    content: ''
  }
}

function startEdit() {
  if (!selectedId.value) return
  mode.value = 'edit'
}

function cancelEdit() {
  mode.value = 'view'
  if (selectedId.value) {
    const note = notes.value.find(n => n.id === selectedId.value)
    if (note) {
      draft.value = { note_date: note.note_date, category: note.category, title: note.title, content: note.content || '' }
    }
  }
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
    content: draft.value.content
  }

  if (mode.value === 'add') {
    const created = await insertNote(payload)
    await reload()
    selectedId.value = created.id
  } else if (mode.value === 'edit') {
    await updateNote(selectedId.value, payload)
    await reload()
  }
  mode.value = 'view'
}
</script>

<template>
  <div class="board">
    <aside class="side">
      <div class="field">
        <label>날짜</label>
        <input type="date" v-model="filterDate" :disabled="mode !== 'view'" />
        <button v-if="filterDate" class="clear" @click="filterDate = ''" :disabled="mode !== 'view'">전체</button>
      </div>
      <div class="field">
        <label>분류</label>
        <select v-model="filterCategory" :disabled="mode !== 'view'">
          <option value="">전체</option>
          <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
    </aside>

    <main class="main">
      <div class="toolbar">
        <button v-if="mode === 'view'" @click="startAdd">추가</button>
        <button v-if="mode === 'view'" :disabled="!selectedId" @click="startEdit">수정</button>
        <button v-if="mode !== 'view'" @click="save">저장</button>
        <button v-if="mode !== 'view'" @click="cancelEdit">취소</button>
      </div>

      <div class="grid">
        <table>
          <thead>
            <tr>
              <th class="col-date">날짜</th>
              <th class="col-cat">분류</th>
              <th>제목</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="mode === 'add'" class="editing-row">
              <td><input type="date" v-model="draft.note_date" /></td>
              <td>
                <select v-model="draft.category">
                  <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
                </select>
              </td>
              <td><input type="text" v-model="draft.title" placeholder="제목 입력" /></td>
            </tr>
            <tr
              v-for="note in notes"
              :key="note.id"
              :class="{ selected: note.id === selectedId, 'editing-row': mode === 'edit' && note.id === selectedId }"
              @click="selectRow(note)"
            >
              <template v-if="mode === 'edit' && note.id === selectedId">
                <td><input type="date" v-model="draft.note_date" @click.stop /></td>
                <td>
                  <select v-model="draft.category" @click.stop>
                    <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
                  </select>
                </td>
                <td><input type="text" v-model="draft.title" @click.stop /></td>
              </template>
              <template v-else>
                <td>{{ note.note_date }}</td>
                <td>{{ note.category }}</td>
                <td>{{ note.title }}</td>
              </template>
            </tr>
            <tr v-if="!loading && notes.length === 0 && mode !== 'add'">
              <td colspan="3" class="empty">항목이 없습니다.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="detail">
        <textarea
          v-model="draft.content"
          :disabled="mode === 'view'"
          placeholder="행을 클릭하면 내용이 표시됩니다."
        ></textarea>
      </div>
    </main>
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

.col-date { width: 130px; }
.col-cat { width: 100px; }

tbody tr:not(.editing-row) {
  cursor: pointer;
}

tbody tr.selected {
  background: #eef6ff;
}

tbody tr.editing-row td input,
tbody tr.editing-row td select {
  width: 100%;
  box-sizing: border-box;
}

.empty {
  text-align: center;
  color: #999;
  padding: 24px;
}

.detail {
  flex: 1;
  padding: 12px 16px;
}

.detail textarea {
  width: 100%;
  height: 100%;
  resize: none;
  box-sizing: border-box;
  padding: 10px;
  font-size: 14px;
  line-height: 1.5;
  font-family: inherit;
}
</style>
