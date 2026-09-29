import { ref } from 'vue'
import { supabase } from '../supabase/client'

export const ADMIN_EMAIL = 'taesik729@gmail.com'

export function useSystems() {
  const systems = ref([])
  const loading = ref(false)

  // 전체 시스템 마스터 목록 — "시스템 관리" 모달(관리자 전용)에서만 사용
  async function fetchSystems() {
    loading.value = true
    const { data, error } = await supabase
      .from('systems')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
    loading.value = false
    if (error) throw error
    systems.value = data
  }

  // 로그인한 사람이 실제로 쓸 수 있는 시스템 목록 — TS/설정&분석 콤보용
  // 관리자는 전체, 그 외에는 user_systems에 배정된 것만
  async function fetchMySystems(userEmail) {
    loading.value = true
    if (userEmail === ADMIN_EMAIL) {
      const { data, error } = await supabase
        .from('systems')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
      loading.value = false
      if (error) throw error
      systems.value = data
      return
    }

    const { data, error } = await supabase
      .from('user_systems')
      .select('systems(id, name, sort_order)')
    loading.value = false
    if (error) throw error
    systems.value = (data || [])
      .map(row => row.systems)
      .filter(Boolean)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
  }

  async function addSystem(name) {
    const trimmed = name.trim()
    if (!trimmed) return
    const maxOrder = systems.value.reduce((max, s) => Math.max(max, s.sort_order), -1)
    const { data, error } = await supabase
      .from('systems')
      .insert({ name: trimmed, sort_order: maxOrder + 1 })
      .select()
      .single()
    if (error) throw error
    systems.value.push(data)
  }

  async function deleteSystem(id) {
    const { error } = await supabase.from('systems').delete().eq('id', id)
    if (error) throw error
    systems.value = systems.value.filter(s => s.id !== id)
  }

  // 전체 사용자 기준으로 이 시스템 이름을 쓰고 있는 TS노트/분석항목 개수
  // (DB에 만든 count_system_usage RPC가 SECURITY DEFINER로 RLS를 우회해서 집계만 반환 — 실제 데이터는 노출 안 됨)
  async function countUsage(name) {
    const { data, error } = await supabase.rpc('count_system_usage', { system_name: name })
    if (error) throw error
    return data || 0
  }

  // ── 아래부터는 관리자 전용: 직원별 시스템 권한 배정 ──────────

  async function fetchAllUsers() {
    const { data, error } = await supabase.rpc('list_app_users')
    if (error) throw error
    return data || []
  }

  async function fetchUserSystemIds(userId) {
    const { data, error } = await supabase
      .from('user_systems')
      .select('system_id')
      .eq('user_id', userId)
    if (error) throw error
    return new Set((data || []).map(r => r.system_id))
  }

  async function grantSystem(userId, systemId) {
    const { error } = await supabase.from('user_systems').insert({ user_id: userId, system_id: systemId })
    if (error) throw error
  }

  async function revokeSystem(userId, systemId) {
    const { error } = await supabase
      .from('user_systems')
      .delete()
      .eq('user_id', userId)
      .eq('system_id', systemId)
    if (error) throw error
  }

  return {
    systems,
    loading,
    fetchSystems,
    fetchMySystems,
    addSystem,
    deleteSystem,
    countUsage,
    fetchAllUsers,
    fetchUserSystemIds,
    grantSystem,
    revokeSystem
  }
}
