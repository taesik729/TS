<script setup>
import { ref } from 'vue'

const props = defineProps({
  node: { type: Object, required: true },
  selectedId: { type: String, default: null },
  depth: { type: Number, default: 0 }
})

const emit = defineEmits(['select'])

const expanded = ref(true)

function toggle() {
  expanded.value = !expanded.value
}
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
      <span class="tree-title">{{ node.title }}</span>
    </div>
    <div v-if="expanded && node.children && node.children.length" class="tree-children">
      <AnalysisTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :selected-id="selectedId"
        :depth="depth + 1"
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
</style>
