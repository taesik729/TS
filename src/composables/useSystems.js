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

  // 내가 로그인한 계정 기준으로 이 시스템 이름을 쓰고 있는 TS노트/분석항목 개수
  // (RLS 때문에 다른 사용자의 데이터는 여기서 집계되지 않음 — 완전한 전체 사용량 체크는 아님)
  async function countUsage(name) {
    const [ts, analysis] = await Promise.all([
      supabase.from('ts_notes').select('id', { count: 'exact', head: true }).eq('category', name),
      supabase.from('analysis_items').select('id', { count: 'exact', head: true }).eq('system', name)
    ])
    if (ts.error) throw ts.error
    if (analysis.error) throw analysis.error
    return (ts.count || 0) + (analysis.count || 0)
  }

  return { systems, loading, fetchSystems, addSystem, deleteSystem, countUsage }
}
