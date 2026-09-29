import { ref } from 'vue'
import { supabase } from '../supabase/client'

export function useSystems() {
  const systems = ref([])
  const loading = ref(false)

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

  return { systems, loading, fetchSystems, addSystem, deleteSystem, countUsage }
}
