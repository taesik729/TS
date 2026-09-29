<template>
  <div class="login-wrap">
    <div class="login-card">
      <div class="login-logo">
        <div class="login-logo-icon">📝</div>
        <div class="login-title">TS Note</div>
        <div class="login-sub">MES/SPC/MMD 업무 지식 관리</div>
      </div>

      <div class="login-tabs">
        <button :class="['tab-btn', mode === 'login' ? 'active' : '']" @click="mode = 'login'; error = null">로그인</button>
        <button :class="['tab-btn', mode === 'signup' ? 'active' : '']" @click="mode = 'signup'; error = null">회원가입</button>
      </div>

      <form class="login-form" @submit.prevent="submit">
        <label class="login-label">
          이메일
          <input v-model="email" type="email" class="login-input" placeholder="name@example.com">
        </label>
        <label class="login-label">
          비밀번호
          <input v-model="password" type="password" class="login-input" placeholder="••••••••" autocomplete="current-password">
        </label>

        <div v-if="error" class="login-error">{{ errorMsg }}</div>
        <div v-if="signupDone" class="login-success">가입 완료! 이메일을 확인하거나 바로 로그인하세요.</div>

        <button type="submit" class="login-btn primary" :disabled="loading">
          {{ loading ? '처리 중...' : (mode === 'login' ? '로그인' : '회원가입') }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuth, LAST_EMAIL_KEY } from '../composables/useAuth'

function lastUsedEmail() {
  try {
    return localStorage.getItem(LAST_EMAIL_KEY) || ''
  } catch (e) {
    return ''
  }
}

const { signIn, signUp, loading, error } = useAuth()
const mode = ref('login')
const email = ref(lastUsedEmail())
const password = ref('')
const signupDone = ref(false)

const errorMsg = computed(() => {
  const msg = error.value
  if (!msg) return ''
  if (msg.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 올바르지 않습니다.'
  if (msg.includes('Email not confirmed')) return '이메일 인증이 필요합니다. 메일함을 확인해주세요.'
  if (msg.includes('User already registered')) return '이미 가입된 이메일입니다.'
  if (msg.includes('Password should be')) return '비밀번호는 6자 이상이어야 합니다.'
  return msg
})

async function submit() {
  if (!email.value || !password.value) return
  signupDone.value = false
  if (mode.value === 'login') {
    await signIn(email.value, password.value)
  } else {
    await signUp(email.value, password.value)
    if (!error.value) signupDone.value = true
  }
}
</script>

<style scoped>
.login-wrap {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  padding: 20px;
}

.login-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 36px 32px;
  width: 380px;
  max-width: 100%;
  box-shadow: var(--shadow-md);
}

.login-logo {
  text-align: center;
  margin-bottom: 24px;
}

.login-logo-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

.login-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
}

.login-sub {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 4px;
}

.login-tabs {
  display: flex;
  gap: 4px;
  background: var(--color-bg);
  border-radius: var(--radius);
  padding: 3px;
  margin-bottom: 20px;
}

.tab-btn {
  flex: 1;
  padding: 7px;
  font-size: 13px;
  border: none;
  background: none;
}

.tab-btn.active {
  background: var(--color-surface);
  color: var(--color-primary);
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.login-label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12px;
  color: var(--color-text-muted);
}

.login-error {
  font-size: 12px;
  color: #dc2626;
  background: #fef2f2;
  padding: 8px 10px;
  border-radius: var(--radius);
}

.login-success {
  font-size: 12px;
  color: #16a34a;
  background: #f0fdf4;
  padding: 8px 10px;
  border-radius: var(--radius);
}

.login-btn {
  padding: 10px;
  margin-top: 4px;
  font-weight: 600;
}
</style>
