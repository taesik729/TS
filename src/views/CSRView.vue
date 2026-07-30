<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { useCSRTasks, useComments, uploadCSRImage } from '../composables/useCSR'

const STATUS_OPTIONS = ['진행', '완료']
const PRIORITY_OPTIONS = ['낮음', '보통', '높음']

const { tasks, loading, fetchList, insertTask, updateTask } = useCSRTasks()
const { comments, fetchComments, addComment, deleteComment, clearComments } = useComments()

const filterStatus = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')
const searchKeyword = ref('')

const showPanel = ref(false)
const editingId = ref(null) // null = 신규 작성
const editingTaskNo = ref(null)
const draft = ref(emptyDraft())
const newComment = ref('')
const pendingImages = new Map() // blobUrl -> File, 저장 시점에 Storage 업로드

function emptyDraft() {
  return {
    title: '',
    status: '진행',
    assignee: '',
    start_date: '',
    due_date: '',
    priority: '보통',
    progress: 0,
    content: ''
  }
}

async function reload() {
  await fetchList({
    status: filterStatus.value || null,
    dateFrom: filterDateFrom.value || null,
    dateTo: filterDateTo.value || null,
    keyword: searchKeyword.value.trim() || null
  })
}

function clearDateRange() {
  filterDateFrom.value = ''
  filterDateTo.value = ''
}

onMounted(reload)
watch([filterStatus, filterDateFrom, filterDateTo], reload)

function insertPendingImage(file) {
  if (!file || !file.type.startsWith('image/')) return
  const blobUrl = URL.createObjectURL(file)
  pendingImages.set(blobUrl, file)
  editor.value.chain().focus().setImage({ src: blobUrl }).run()
}

async function resolvePendingImages() {
  if (pendingImages.size === 0) return
  let html = editor.value.getHTML()
  for (const [blobUrl, file] of pendingImages.entries()) {
    const publicUrl = await uploadCSRImage(file)
    html = html.split(blobUrl).join(publicUrl)
    URL.revokeObjectURL(blobUrl)
  }
  pendingImages.clear()
  editor.value.commands.setContent(html)
  draft.value.content = html
}

const editor = useEditor({
  content: '',
  extensions: [StarterKit, Image],
  editorProps: {
    handlePaste(view, event) {
      const item = Array.from(event.clipboardData?.items || []).find(i => i.type.startsWith('image/'))
      if (item) {
        event.preventDefault()
        insertPendingImage(item.getAsFile())
        return true
      }
      return false
    },
    handleDrop(view, event) {
      const file = Array.from(event.dataTransfer?.files || []).find(f => f.type.startsWith('image/'))
      if (file) {
        event.preventDefault()
        insertPendingImage(file)
        return true
      }
      return false
    }
  },
  onUpdate({ editor }) {
    draft.value.content = editor.getHTML()
  }
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})

function pickImageFile() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = () => insertPendingImage(input.files[0])
  input.click()
}

function openAdd() {
  editingId.value = null
  editingTaskNo.value = null
  draft.value = emptyDraft()
  clearComments()
  pendingImages.clear()
  editor.value.commands.setContent('')
  showPanel.value = true
}

async function openTask(task) {
  editingId.value = task.id
  editingTaskNo.value = task.task_no
  draft.value = {
    title: task.title,
    status: task.status,
    assignee: task.assignee || '',
    start_date: task.start_date || '',
    due_date: task.due_date || '',
    priority: task.priority,
    progress: task.progress,
    content: task.content || ''
  }
  pendingImages.clear()
  editor.value.commands.setContent(task.content || '')
  showPanel.value = true
  await fetchComments(task.id)
}

function closePanel() {
  showPanel.value = false
}

async function saveTask() {
  if (!draft.value.title.trim()) {
    alert('업무명을 입력해주세요.')
    return
  }

  await resolvePendingImages()

  const payload = { ...draft.value, progress: Number(draft.value.progress) || 0 }
  for (const key of ['start_date', 'due_date']) {
    if (!payload[key]) payload[key] = null
  }

  if (editingId.value) {
    await updateTask(editingId.value, payload)
  } else {
    const created = await insertTask(payload)
    editingId.value = created.id
    editingTaskNo.value = created.task_no
  }
  await reload()
  closePanel()
}

async function handleAddComment() {
  if (!newComment.value.trim() || !editingId.value) return
  await addComment(editingId.value, newComment.value.trim())
  newComment.value = ''
}

async function handleDeleteComment(id) {
  if (!confirm('댓글을 삭제할까요?')) return
  await deleteComment(id)
}

function fmt(dt) {
  if (!dt) return ''
  return dt.slice(0, 16).replace('T', ' ')
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
        <label>상태</label>
        <select v-model="filterStatus">
          <option value="">전체</option>
          <option v-for="s in STATUS_OPTIONS" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
    </aside>

    <main class="main">
      <div class="toolbar">
        <input
          type="text"
          class="search-input"
          v-model="searchKeyword"
          placeholder="업무명·내용 검색"
          @keyup.enter="reload"
        />
        <button @click="reload">검색</button>
        <div class="toolbar-actions">
          <button class="primary" @click="openAdd">추가</button>
        </div>
      </div>

      <div class="grid">
        <table>
          <thead>
            <tr>
              <th class="col-title">업무명</th>
              <th class="col-status">상태</th>
              <th class="col-assignee">담당자</th>
              <th class="col-date">시작일</th>
              <th class="col-date">마감일</th>
              <th class="col-priority">우선순위</th>
              <th class="col-progress">진척도</th>
              <th class="col-datetime">등록일</th>
              <th class="col-datetime">수정일</th>
              <th class="col-no">업무번호</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="task in tasks" :key="task.id" @click="openTask(task)">
              <td>{{ task.title }}</td>
              <td><span class="badge" :class="task.status === '완료' ? 'done' : 'progress'">{{ task.status }}</span></td>
              <td>{{ task.assignee }}</td>
              <td>{{ task.start_date }}</td>
              <td>{{ task.due_date }}</td>
              <td>{{ task.priority }}</td>
              <td>{{ task.progress }}%</td>
              <td>{{ fmt(task.created_at) }}</td>
              <td>{{ fmt(task.updated_at) }}</td>
              <td>{{ task.task_no }}</td>
            </tr>
            <tr v-if="!loading && tasks.length === 0">
              <td colspan="10" class="empty">항목이 없습니다.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <div v-if="showPanel" class="panel-overlay" @click.self="closePanel">
      <div class="panel">
        <div class="panel-header">
          <span class="badge" :class="draft.status === '완료' ? 'done' : 'progress'">{{ draft.status }}</span>
          <span v-if="editingTaskNo" class="task-no">업무번호 {{ editingTaskNo }}</span>
          <button class="icon-btn" @click="closePanel">✕</button>
        </div>

        <div class="panel-body">
          <input type="text" class="title-input" v-model="draft.title" placeholder="제목을 입력하세요" />

          <div class="meta-grid">
            <div class="meta-row">
              <label>상태</label>
              <select v-model="draft.status">
                <option v-for="s in STATUS_OPTIONS" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
            <div class="meta-row">
              <label>담당자</label>
              <input type="text" v-model="draft.assignee" placeholder="담당자 추가" />
            </div>
            <div class="meta-row">
              <label>시작일</label>
              <input type="date" v-model="draft.start_date" />
            </div>
            <div class="meta-row">
              <label>마감일</label>
              <input type="date" v-model="draft.due_date" />
            </div>
            <div class="meta-row">
              <label>우선순위</label>
              <select v-model="draft.priority">
                <option v-for="p in PRIORITY_OPTIONS" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
            <div class="meta-row">
              <label>진척도</label>
              <input type="number" min="0" max="100" v-model="draft.progress" />
            </div>
          </div>

          <div class="editor-section">
            <div class="editor-toolbar">
              <button type="button" @click="editor.chain().focus().toggleBold().run()">B</button>
              <button type="button" @click="editor.chain().focus().toggleBulletList().run()">목록</button>
              <button type="button" @click="pickImageFile">🖼 이미지</button>
            </div>
            <EditorContent :editor="editor" class="editor-content" />
          </div>

          <div class="comments-section">
            <template v-if="editingId">
              <div class="comment-list">
                <div v-for="c in comments" :key="c.id" class="comment-item">
                  <div class="comment-item-header">
                    <span class="comment-date">{{ fmt(c.created_at) }}</span>
                    <button type="button" class="comment-delete" @click="handleDeleteComment(c.id)">삭제</button>
                  </div>
                  <div class="comment-content">{{ c.content }}</div>
                </div>
              </div>
              <div class="comment-add">
                <input
                  type="text"
                  v-model="newComment"
                  placeholder="댓글 입력 후 Enter"
                  @keyup.enter="handleAddComment"
                />
                <button @click="handleAddComment">등록</button>
              </div>
            </template>
            <p v-else class="hint">저장 후 댓글을 작성할 수 있습니다.</p>
          </div>
        </div>

        <div class="panel-footer">
          <button @click="closePanel">닫기</button>
          <button class="primary" @click="saveTask">저장</button>
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
  min-width: 1000px;
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
  font-size: 13px;
  white-space: nowrap;
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

.col-title { width: 260px; white-space: normal; }
.col-status { width: 80px; }
.col-assignee { width: 90px; }
.col-date { width: 100px; }
.col-priority { width: 90px; }
.col-progress { width: 80px; }
.col-datetime { width: 140px; }
.col-no { width: 80px; }

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

.empty {
  text-align: center;
  color: var(--color-text-muted);
  padding: 32px;
}

.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.badge.progress {
  background: #e6f4ea;
  color: #1e7d34;
}

.badge.done {
  background: var(--color-primary-soft);
  color: var(--color-primary-hover);
}

.panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 20, 30, 0.35);
  z-index: 100;
  display: flex;
  justify-content: flex-end;
}

.panel {
  width: 820px;
  max-width: 95vw;
  height: 100%;
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.task-no {
  font-size: 12px;
  color: var(--color-text-muted);
}

.icon-btn {
  margin-left: auto;
  border: none;
  background: none;
  font-size: 16px;
  padding: 4px 8px;
}

.panel-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.title-input {
  font-size: 18px;
  font-weight: 600;
  border: none;
  border-bottom: 1px solid var(--color-border);
  border-radius: 0;
  padding: 6px 2px;
}

.title-input:focus {
  box-shadow: none;
  border-bottom-color: var(--color-primary);
}

.meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.meta-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
}

.meta-row label {
  flex-shrink: 0;
  width: 64px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-muted);
}

.meta-row label::after {
  content: ':';
  margin-left: 2px;
}

.meta-row input,
.meta-row select {
  flex: 1;
  min-width: 0;
}

.editor-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius);
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  gap: 6px;
  padding: 8px;
  background: #fafbfc;
  border-bottom: 1px solid var(--color-border);
}

.editor-toolbar button {
  padding: 4px 10px;
  font-size: 13px;
}

.editor-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
}

.editor-content :deep(.ProseMirror) {
  min-height: 100%;
  outline: none;
}

.editor-content :deep(img) {
  max-width: 100%;
  border-radius: 4px;
}

.comments-section {
  border-top: 1px solid var(--color-border);
  padding-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hint {
  font-size: 13px;
  color: var(--color-text-muted);
}

.comment-add {
  display: flex;
  gap: 8px;
}

.comment-add input {
  flex: 1;
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 220px;
  overflow-y: auto;
}

.comment-item {
  background: #fafbfc;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 8px 10px;
}

.comment-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.comment-date {
  font-size: 11px;
  color: var(--color-text-muted);
}

.comment-delete {
  border: none;
  background: none;
  padding: 0 2px;
  font-size: 11px;
  color: var(--color-text-muted);
  cursor: pointer;
}

.comment-delete:hover {
  color: #dc2626;
}

.comment-content {
  font-size: 14px;
  white-space: pre-wrap;
}

.panel-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid var(--color-border);
}
</style>
