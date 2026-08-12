<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  node: { type: Object, required: true },
  selectedId: { type: String, default: null },
  depth: { type: Number, default: 0 },
  keyword: { type: String, default: '' }
})

const emit = defineEmits(['select'])

const expanded = ref(true)

function toggle() {
  expanded.value = !expanded.value
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]))
}

const highlightedTitle = computed(() => {
  const title = props.node.title || ''
  const kw = props.keyword.trim()
  const escaped = escapeHtml(title)
  if (!kw) return escaped
  const escapedKw = escapeHtml(kw).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(${escapedKw})`, 'gi')
  return escaped.replace(re, '<mark class="hl">$1</mark>')
})
</script>

<template>
  <div class="tree-node">
    <div
      class="tree-row"
      :class="{ selected: node.id === selectedId }"
      :style="{ paddingLeft: (depth * 18 + 8) + 'px' }"
      @click="emit('select', node)"
    >
      <span
        class="tree-arrow"
        :class="{ empty: !node.children || node.children.length === 0 }"
        @click.stop="toggle"
      >{{ node.children && node.children.length ? (expanded ? '▼' : '▶') : '' }}</span>
      <span class="tree-title" v-html="highlightedTitle"></span>
    </div>
    <div v-if="expanded && node.children && node.children.length" class="tree-children">
      <AnalysisTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :selected-id="selectedId"
        :depth="depth + 1"
        :keyword="keyword"
        @select="emit('select', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.tree-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-top: 6px;
  padding-bottom: 6px;
  padding-right: 8px;
  cursor: pointer;
  font-size: 14px;
  border-radius: 4px;
}

.tree-row:hover {
  background: #f7f9fc;
}

.tree-row.selected {
  background: var(--color-primary-soft);
  color: var(--color-primary-hover);
  font-weight: 600;
}

.tree-arrow {
  width: 14px;
  flex-shrink: 0;
  font-size: 10px;
  color: var(--color-text-muted);
  text-align: center;
}

.tree-arrow.empty {
  visibility: hidden;
}

.tree-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-title :deep(.hl) {
  background: #fde047;
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
}
</style>
