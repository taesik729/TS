<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { useAnalysis } from '../composables/useAnalysis'
import { uploadCSRImage } from '../composables/useCSR'
import AnalysisTreeNode from '../components/AnalysisTreeNode.vue'

const SYSTEMS = ['MES', 'SPC', 'MMD']
const WORK_TYPES = ['개발', '분석']

const { items, loading, fetchTree, addItem, updateItem, deleteItem } = useAnalysis()

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

const filterDateFrom = ref('')
const filterDateTo = ref('')
const filterSystem = ref('')
const filterWorkType = ref('')
const searchKeyword = ref('')

async function reloadTree() {
  await fetchTree({
    system: filterSystem.value || null,
    workType: filterWorkType.value || null,
    dateFrom: filterDateFrom.value || null,
    dateTo: filterDateTo.value || null,
    keyword: searchKeyword.value.trim() || null
  })
  if (searchKeyword.value.trim()) {
    selectFirstMatch()
  }
}

function selectFirstMatch() {
  const needle = searchKeyword.value.trim().toLowerCase()
  const match = items.value.find(item => {
    const title = (item.title || '').toLowerCase()
    const content = (item.content || '').toLowerCase()
    return title.includes(needle) || content.includes(needle)
  })
  if (match) selectNode(match)
}

function clearDateRange() {
  filterDateFrom.value = ''
  filterDateTo.value = ''
}

onMounted(reloadTree)
watch([filterDateFrom, filterDateTo, filterSystem, filterWorkType], reloadTree)

const treeRoots = computed(() => {
  const byId = new Map()
  items.value.forEach(item => byId.set(item.id, { ...item, children: [] }))
  const realRoots = []
  byId.forEach(item => {
    if (item.parent_id && byId.has(item.parent_id)) {
      byId.get(item.parent_id).children.push(item)
    } else if (!item.parent_id) {
      realRoots.push(item)
    }
  })

  return SYSTEMS.map(sys => ({
    id: `sys-${sys}`,
    title: sys,
    virtual: true,
    children: realRoots.filter(r => r.system === sys)
  }))
})

const selectedId = ref(null)
const draft = ref(emptyDraft())
const newChildParentTitle = ref('')
const isEditing = ref(false)

function emptyDraft(overrides = {}) {
  return {
    id: null,
    parent_id: null,
    system: null,
    work_type: null,
    log_date: null,
    title: '',
    content: '',
    ...overrides
  }
}

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
  input.onchange = () => uploadAndInsertImage(input.files[0])
  input.click()
}

function applyContentHighlight() {
  if (!window.CSS || !CSS.highlights) return
  const keyword = searchKeyword.value.trim()
  if (!keyword) {
    CSS.highlights.delete('search-hl')
    return
  }

  const root = document.querySelector('.editor-content .ProseMirror')
  if (!root) return

  const needle = keyword.toLowerCase()
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const ranges = []
  let node
  while ((node = walker.nextNode())) {
    const text = node.textContent.toLowerCase()
    let idx = 0
    while ((idx = text.indexOf(needle, idx)) !== -1) {
      const range = new Range()
      range.setStart(node, idx)
      range.setEnd(node, idx + needle.length)
      ranges.push(range)
      idx += needle.length
    }
  }
  CSS.highlights.set('search-hl', new Highlight(...ranges))
}

// TipTap이 내용을 처음 렌더링할 때 한 프레임 안에 DOM 반영이 끝나지 않는 경우가 있어
// 몇 프레임에 걸쳐 재시도한다 (idempotent라 여러 번 호출해도 안전)
function scheduleContentHighlight() {
  nextTick(() => {
    applyContentHighlight()
    requestAnimationFrame(() => {
      applyContentHighlight()
      requestAnimationFrame(() => {
        applyContentHighlight()
      })
    })
  })
}

function selectNode(node) {
  if (node.virtual) return
  pendingImages.clear()
  selectedId.value = node.id
  newChildParentTitle.value = ''
  isEditing.value = true
  draft.value = {
    id: node.id,
    parent_id: node.parent_id,
    system: node.system,
    work_type: node.work_type,
    log_date: node.log_date,
    title: node.title,
    content: node.content || ''
  }
  editor.value.commands.setContent(node.content || '')
  scheduleContentHighlight()
}

function startNewRoot() {
  pendingImages.clear()
  selectedId.value = null
  newChildParentTitle.value = ''
  isEditing.value = true
  draft.value = emptyDraft({
    system: filterSystem.value || 'MES',
    work_type: filterWorkType.value || '개발',
    log_date: filterDateFrom.value || todayStr()
  })
  editor.value.commands.setContent('')
  if (window.CSS && CSS.highlights) CSS.highlights.delete('search-hl')
}

function startNewChild() {
  if (!draft.value.id) return
  pendingImages.clear()
  newChildParentTitle.value = draft.value.title
  isEditing.value = true
  draft.value = emptyDraft({ parent_id: draft.value.id })
  editor.value.commands.setContent('')
  if (window.CSS && CSS.highlights) CSS.highlights.delete('search-hl')
}

async function save() {
  if (!draft.value.title.trim()) {
    alert('제목을 입력해주세요.')
    return
  }
  await resolvePendingImages()

  const isRoot = !draft.value.parent_id
  const payload = {
    parent_id: draft.value.parent_id,
    system: isRoot ? draft.value.system : null,
    work_type: isRoot ? draft.value.work_type : null,
    log_date: isRoot ? (draft.value.log_date || null) : null,
    title: draft.value.title,
    content: draft.value.content
  }

  if (draft.value.id) {
    await updateItem(draft.value.id, payload)
  } else {
    const created = await addItem(payload)
    draft.value.id = created.id
    selectedId.value = created.id
    newChildParentTitle.value = ''
  }
  await reloadTree()
}

async function handleDelete() {
  if (!draft.value.id) return
  if (!confirm('이 항목과 모든 하위업무를 삭제할까요?')) return
  await deleteItem(draft.value.id)
  selectedId.value = null
  isEditing.value = false
  draft.value = emptyDraft()
  editor.value.commands.setContent('')
  await reloadTree()
}
</script>

<template>
  <div class="an-root">
    <div class="an-toolbar">
      <input type="date" v-model="filterDateFrom" />
      <span class="range-sep">~</span>
      <input type="date" v-model="filterDateTo" />
      <button v-if="filterDateFrom || filterDateTo" class="clear" @click="clearDateRange">전체 기간</button>

      <select v-model="filterSystem">
        <option value="">시스템 전체</option>
        <option v-for="s in SYSTEMS" :key="s" :value="s">{{ s }}</option>
      </select>
      <select v-model="filterWorkType">
        <option value="">업무 전체</option>
        <option v-for="w in WORK_TYPES" :key="w" :value="w">{{ w }}</option>
      </select>

      <input
        type="text"
        class="search-input"
        v-model="searchKeyword"
        placeholder="제목·내용 검색"
        @keyup.enter="reloadTree"
      />
      <button @click="reloadTree">검색</button>
      <button class="primary" @click="startNewRoot">추가</button>
    </div>

    <div class="an-body">
      <aside class="an-tree">
        <AnalysisTreeNode
          v-for="node in treeRoots"
          :key="node.id"
          :node="node"
          :selected-id="selectedId"
          :keyword="searchKeyword"
          @select="selectNode"
        />
        <p v-if="!loading && treeRoots.length === 0" class="empty">항목이 없습니다.</p>
      </aside>

      <main class="an-detail">
        <div v-show="!isEditing" class="empty-detail">
          왼쪽 트리에서 항목을 선택하거나 "추가"를 눌러 새로 작성하세요.
        </div>

        <div v-show="isEditing" class="detail-form">
          <p v-if="newChildParentTitle" class="parent-hint">상위 업무: {{ newChildParentTitle }}</p>

          <input type="text" class="title-input" v-model="draft.title" placeholder="제목을 입력하세요" />

          <div v-if="!draft.parent_id" class="meta-grid">
            <div class="meta-row">
              <label>시스템</label>
              <select v-model="draft.system">
                <option v-for="s in SYSTEMS" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
            <div class="meta-row">
              <label>업무</label>
              <select v-model="draft.work_type">
                <option v-for="w in WORK_TYPES" :key="w" :value="w">{{ w }}</option>
              </select>
            </div>
            <div class="meta-row">
              <label>날짜</label>
              <input type="date" v-model="draft.log_date" />
            </div>
          </div>

          <div class="editor-section">
            <div class="editor-toolbar">
              <button type="button" @click="editor.chain().focus().toggleBold().run()">B</button>
              <button type="button" @click="editor.chain().focus().toggleBulletList().run()">목록</button>
              <button type="button" @click="pickImageFile">🖼 이미지</button>
              <button type="button" class="add-child-btn" :disabled="!draft.id" @click="startNewChild">+ 하위업무 추가</button>
            </div>
            <EditorContent :editor="editor" class="editor-content" />
          </div>

          <div class="an-actions">
            <button v-if="draft.id" class="danger" @click="handleDelete">삭제</button>
            <button class="primary an-save" @click="save">저장</button>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.an-root {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.an-toolbar {
  padding: 12px 20px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: 8px;
}

.range-sep {
  color: var(--color-text-muted);
  font-size: 12px;
}

.clear {
  font-size: 12px;
  padding: 4px 10px;
}

.search-input {
  width: 200px;
  margin-left: auto;
}

.an-body {
  flex: 1;
  min-height: 0;
  display: flex;
}

.an-tree {
  width: 320px;
  flex-shrink: 0;
  overflow-y: auto;
  padding: 12px;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
}

.empty {
  text-align: center;
  color: var(--color-text-muted);
  padding: 24px 8px;
  font-size: 13px;
}

.an-detail {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.detail-form {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-detail {
  color: var(--color-text-muted);
  font-size: 14px;
  padding: 40px;
  text-align: center;
}

.parent-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  margin: 0;
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
  display: flex;
  gap: 20px;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.meta-row label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
}

.editor-section {
  flex: 1;
  min-height: 400px;
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

.add-child-btn {
  margin-left: auto;
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

.an-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.danger {
  color: #dc2626;
  border-color: #dc2626;
  background: none;
  margin-right: auto;
}

.danger:hover {
  background: #fef2f2;
}
</style>

<style>
/* Custom Highlight API는 scoped 속성이 적용되지 않아 전역 스타일로 선언 */
::highlight(search-hl) {
  background-color: #fde047;
}
</style>
