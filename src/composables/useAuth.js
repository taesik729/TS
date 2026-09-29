import { ref } from 'vue'
import { supabase } from '../supabase/client'

const user = ref(null)

// 앱 시작 시 현재 세션 확인
supabase.auth.getSession().then(({ data }) => {
  user.value = data.session?.user ?? null
})

// 로그인 상태 실시간 감지
supabase.auth.onAuthStateChange((_event, session) => {
  user.value = session?.user ?? null
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
