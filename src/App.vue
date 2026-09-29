<script setup>
import { RouterView } from 'vue-router'
import BottomNav from './components/BottomNav.vue'
import LoginView from './views/LoginView.vue'
import { useAuth } from './composables/useAuth'

const { user, signOut } = useAuth()

async function handleSignOut() {
  if (confirm('로그아웃 하시겠습니까?')) await signOut()
}
</script>

<template>
  <LoginView v-if="!user" />
  <div v-else class="app-shell">
    <header class="topbar">
      <span class="topbar-title">TS Note</span>
      <div class="topbar-user">
        <span class="topbar-email">{{ user.email }}</span>
        <button class="topbar-logout" @click="handleSignOut">로그아웃</button>
      </div>
    </header>
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

.topbar {
  flex-shrink: 0;
  height: 44px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.topbar-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-primary);
}

.topbar-user {
  display: flex;
  align-items: center;
  gap: 8px;
}

.topbar-email {
  font-size: 12px;
  color: var(--color-text-muted);
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topbar-logout {
  font-size: 12px;
  padding: 4px 10px;
}

.page {
  flex: 1;
  min-height: 0;
  min-width: 0;
  padding-bottom: calc(72px + env(safe-area-inset-bottom));
}

@media (max-width: 720px) {
  .topbar-email {
    max-width: 80px;
  }
}
</style>
