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
  height: 100dvh;
  display: flex;
  flex-direction: column;
  padding-top: env(safe-area-inset-top);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

.page {
  flex: 1;
  min-height: 0;
  min-width: 0;
}
</style>
