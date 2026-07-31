<script setup>
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const items = [
  { path: '/settings', label: '기준정보', icon: '⚙️' },
  { path: '/csr', label: 'CSR', icon: '🗂️' },
  { path: '/ts', label: 'TS', icon: '🛠️' },
  { path: '/work', label: '업무일지', icon: '📋' },
  { path: '/study', label: '분석', icon: '📚' }
]
</script>

<template>
  <nav class="bottom-nav">
    <button
      v-for="item in items"
      :key="item.path"
      class="nav-item"
      :class="{ active: route.path === item.path }"
      @click="router.push(item.path)"
    >
      <span class="icon">{{ item.icon }}</span>
      <span class="label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.bottom-nav {
  flex-shrink: 0;
  height: 72px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 6px;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: 0 -1px 4px rgba(16, 24, 40, 0.04);
}

.nav-item {
  flex: 1;
  height: 56px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border: none;
  border-radius: 12px;
  background: none;
  cursor: pointer;
  color: var(--color-text-muted);
  font-family: inherit;
  opacity: 0.55;
  transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.nav-item:hover:not(.active) {
  opacity: 0.85;
  background: #f7f9fc;
}

.nav-item .icon {
  font-size: 22px;
  line-height: 1;
}

.nav-item .label {
  font-size: 14px;
  font-weight: 500;
}

.nav-item.active {
  opacity: 1;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-weight: 700;
}
</style>
