import { ref } from 'vue'
import { supabase } from '../supabase/client'

export function useAnalysis() {
  const items = ref([])
  const loading = ref(false)

  async function fetchTree({ system, workType, dateFrom, dateTo, keyword }) {
    loading.value = true
    let rootQuery = supabase
      .from('analysis_items')
      .select('id')
      .is('parent_id', null)

    if (system) rootQuery = rootQuery.eq('system', system)
    if (workType) rootQuery = rootQuery.eq('work_type', workType)
    if (dateFrom) rootQuery = rootQuery.gte('log_date', dateFrom)
    if (dateTo) rootQuery = rootQuery.lte('log_date', dateTo)
    if (keyword) {
      const like = `%${keyword.replace(/[%,()]/g, ' ')}%`
      rootQuery = rootQuery.ilike('title', like)
    }

    const { data: roots, error: rootError } = await rootQuery
    if (rootError) {
      loading.value = false
      throw rootError
    }

    if (roots.length === 0) {
      items.value = []
      loading.value = false
      return
    }

    const { data: all, error } = await supabase
      .from('analysis_items')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    loading.value = false
    if (error) throw error

    const rootIds = new Set(roots.map(r => r.id))
    const byId = new Map(all.map(item => [item.id, item]))

    function isDescendantOfRoot(item) {
      let cur = item
      const seen = new Set()
      while (cur) {
        if (rootIds.has(cur.id)) return true
        if (seen.has(cur.id)) return false
        seen.add(cur.id)
        cur = cur.parent_id ? byId.get(cur.parent_id) : null
      }
      return false
    }

    items.value = all.filter(isDescendantOfRoot)
  }

  async function addItem(payload) {
    const { data, error } = await supabase
      .from('analysis_items')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function updateItem(id, payload) {
    const { error } = await supabase
      .from('analysis_items')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }

  async function deleteItem(id) {
    const { error } = await supabase
      .from('analysis_items')
      .delete()
      .eq('id', id)
    if (error) throw error
  }

  return { items, loading, fetchTree, addItem, updateItem, deleteItem }
}
