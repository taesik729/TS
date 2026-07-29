<script setup>
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const items = [
  { path: '/settings', label: '환경설정', icon: '⚙️' },
  { path: '/ts', label: 'TS', icon: '🛠️' },
  { path: '/work', label: '업무파악', icon: '📋' },
  { path: '/study', label: '공부', icon: '📚' }
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
  height: 60px;
  display: flex;
  border-top: 1px solid #ddd;
  background: #fff;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: none;
  background: none;
  cursor: pointer;
  color: #888;
  font-family: inherit;
}

.nav-item .icon {
  font-size: 18px;
  line-height: 1;
}

.nav-item .label {
  font-size: 11px;
}

.nav-item.active {
  color: #2e7d32;
  font-weight: bold;
}
</style>
