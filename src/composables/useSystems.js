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

  return { systems, loading, fetchSystems, addSystem, deleteSystem }
}
