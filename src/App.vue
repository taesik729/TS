<script setup>
import { RouterView } from 'vue-router'
import BottomNav from './components/BottomNav.vue'
</script>

<template>
  <div class="app-shell">
    <div class="page">
      <RouterView />
    </div>
    <BottomNav />
  </div>
</template>

<style scoped>
.app-shell {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.page {
  flex: 1;
  min-height: 0;
}
</style>
