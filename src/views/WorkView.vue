<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { useWorkLogs } from '../composables/useWorkLogs'
import { uploadCSRImage } from '../composables/useCSR'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const { logDates, fetchMonth, fetchByDate, upsertLog, deleteLog } = useWorkLogs()

function pad(n) {
  return String(n).padStart(2, '0')
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const today = new Date()
const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth() + 1) // 1-12

function shiftMonth(y, m, delta) {
  const d = new Date(y, m - 1 + delta, 1)
  return { y: d.getFullYear(), m: d.getMonth() + 1 }
}

function buildCell(y, m, day, inMonth) {
  const dateStr = `${y}-${pad(m)}-${pad(day)}`
  return {
    dateStr,
    day,
    inMonth,
    isToday: dateStr === todayStr(),
    hasEntry: logDates.value.has(dateStr)
  }
}

const calendarCells = computed(() => {
  const y = viewYear.value
  const m = viewMonth.value
  const firstWeekday = new Date(y, m - 1, 1).getDay()
  const daysInMonth = new Date(y, m, 0).getDate()
  const prev = shiftMonth(y, m, -1)
  const daysInPrev = new Date(prev.y, prev.m, 0).getDate()
  const next = shiftMonth(y, m, 1)

  const cells = []
  for (let i = 0; i < firstWeekday; i++) {
    cells.push(buildCell(prev.y, prev.m, daysInPrev - firstWeekday + 1 + i, false))
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(buildCell(y, m, day, true))
  }
  let nextDay = 1
  while (cells.length % 7 !== 0) {
    cells.push(buildCell(next.y, next.m, nextDay++, false))
  }
  return cells
})

async function reloadMonth() {
  await fetchMonth(viewYear.value, viewMonth.value)
}

function changeMonth(delta) {
  const { y, m } = shiftMonth(viewYear.value, viewMonth.value, delta)
  viewYear.value = y
  viewMonth.value = m
}

function goToday() {
  viewYear.value = today.getFullYear()
  viewMonth.value = today.getMonth() + 1
}

onMounted(reloadMonth)
watch([viewYear, viewMonth], reloadMonth)

const showPanel = ref(false)
const selectedDate = ref('')
const hasExistingEntry = ref(false)
const draftContent = ref('')
const pendingImages = new Map()

async function uploadAndInsertImage(file) {
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
  draftContent.value = html
}

const editor = useEditor({
  content: '',
  extensions: [StarterKit, Image],
  editorProps: {
    handlePaste(view, event) {
      const item = Array.from(event.clipboardData?.items || []).find(i => i.type.startsWith('image/'))
      if (item) {
        event.preventDefault()
        uploadAndInsertImage(item.getAsFile())
        return true
      }
      return false
    },
    handleDrop(view, event) {
      const file = Array.from(event.dataTransfer?.files || []).find(f => f.type.startsWith('image/'))
      if (file) {
        event.preventDefault()
        uploadAndInsertImage(file)
        return true
      }
      return false
    }
  },
  onUpdate({ editor }) {
    draftContent.value = editor.getHTML()
  }
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})

function pickImageFile() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = () => uploadAndInsertImage(input.files[0])
  input.click()
}

async function openDay(dateStr) {
  selectedDate.value = dateStr
  pendingImages.clear()
  const existing = await fetchByDate(dateStr)
  hasExistingEntry.value = !!existing
  draftContent.value = existing?.content || ''
  editor.value.commands.setContent(existing?.content || '')
  showPanel.value = true
}

function closePanel() {
  showPanel.value = false
}

async function handleSave() {
  await resolvePendingImages()
  await upsertLog(selectedDate.value, draftContent.value)
  await reloadMonth()
  closePanel()
}

async function handleDelete() {
  if (!confirm('이 날짜의 업무일지를 삭제할까요?')) return
  await deleteLog(selectedDate.value)
  await reloadMonth()
  closePanel()
}
</script>

<template>
  <div class="wv-root">
    <div class="cal-header">
      <button @click="changeMonth(-1)">◀</button>
      <div class="cal-title">{{ viewYear }}년 {{ viewMonth }}월</div>
      <button @click="changeMonth(1)">▶</button>
      <button class="today-btn" @click="goToday">오늘</button>
    </div>

    <div class="cal-weekdays">
      <span v-for="w in WEEKDAYS" :key="w">{{ w }}</span>
    </div>

    <div class="cal-grid">
      <div
        v-for="cell in calendarCells"
        :key="cell.dateStr"
        class="cal-cell"
        :class="{ 'out-month': !cell.inMonth, today: cell.isToday }"
        @click="openDay(cell.dateStr)"
      >
        <span class="cal-day">{{ cell.day }}</span>
        <span class="cal-dot" :class="cell.hasEntry ? 'dot-on' : 'dot-off'"></span>
      </div>
    </div>

    <div v-if="showPanel" class="panel-overlay" @click.self="closePanel">
      <div class="panel">
        <div class="panel-header">
          <span class="panel-date">{{ selectedDate }}</span>
          <button class="icon-btn" @click="closePanel">✕</button>
        </div>

        <div class="panel-body">
          <div class="editor-section">
            <div class="editor-toolbar">
              <button type="button" @click="editor.chain().focus().toggleBold().run()">B</button>
              <button type="button" @click="editor.chain().focus().toggleBulletList().run()">목록</button>
              <button type="button" @click="pickImageFile">🖼 이미지</button>
            </div>
            <EditorContent :editor="editor" class="editor-content" />
          </div>
        </div>

        <div class="panel-footer">
          <button v-if="hasExistingEntry" class="danger" @click="handleDelete">삭제</button>
          <div class="panel-footer-right">
            <button @click="closePanel">취소</button>
            <button class="primary" @click="handleSave">저장</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wv-root {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 12px;
}

.cal-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cal-header button {
  padding: 6px 12px;
}

.cal-title {
  font-size: 18px;
  font-weight: 700;
}

.today-btn {
  margin-left: auto;
}

.cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  padding: 4px 0;
}

.cal-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: 1fr;
  gap: 6px;
  overflow: hidden;
}

.cal-cell {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  cursor: pointer;
  transition: background 0.1s ease;
}

.cal-cell:hover {
  background: #f7f9fc;
}

.cal-cell.out-month {
  opacity: 0.4;
}

.cal-cell.today {
  border-color: var(--color-primary);
  border-width: 2px;
}

.cal-day {
  font-size: 13px;
  font-weight: 600;
}

.cal-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  align-self: flex-start;
  margin-top: auto;
}

.dot-on {
  background: #16a34a;
}

.dot-off {
  background: #dc2626;
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

.panel-date {
  font-size: 16px;
  font-weight: 700;
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

.panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid var(--color-border);
}

.panel-footer-right {
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
</style>
