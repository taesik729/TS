import { ref, watch } from 'vue'
import { supabase } from '../supabase/client'

export const LAST_EMAIL_KEY = 'ts_note_last_email'

const user = ref(null)

// 앱 시작 시 현재 세션 확인
supabase.auth.getSession().then(({ data }) => {
  user.value = data.session?.user ?? null
})

// 로그인 상태 실시간 감지
supabase.auth.onAuthStateChange((_event, session) => {
  user.value = session?.user ?? null
})

// 로그인 성공할 때마다 이메일을 기억해뒀다가, 다음에 로그인 화면 열 때 채워주기 위함
// (브라우저 자동완성이 "가장 최근 로그인"이 아니라 저장된 비밀번호 기준으로 채워서 대신 직접 관리)
watch(user, (u) => {
  if (!u?.email) return
  try {
    localStorage.setItem(LAST_EMAIL_KEY, u.email)
  } catch (e) {
    // 시크릿 모드 등 localStorage 접근 불가 환경은 조용히 무시
  }
})

export function useAuth() {
  const loading = ref(false)
  const error = ref(null)

  async function signIn(email, password) {
    loading.value = true
    error.value = null
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) throw err
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function signUp(email, password) {
    loading.value = true
    error.value = null
    try {
      const { error: err } = await supabase.auth.signUp({ email, password })
      if (err) throw err
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { user, loading, error, signIn, signUp, signOut }
}
