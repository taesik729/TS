import { ref } from 'vue'
import { supabase } from '../supabase/client'

export function useAnalysis() {
  const items = ref([])
  const loading = ref(false)

  async function fetchTree({ system, workType, dateFrom, dateTo, keyword }) {
    loading.value = true
    const { data: all, error } = await supabase
      .from('analysis_items')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    loading.value = false
    if (error) throw error

    const byId = new Map(all.map(item => [item.id, item]))

    function getRoot(item) {
      let cur = item
      const seen = new Set()
      while (cur.parent_id && byId.has(cur.parent_id) && !seen.has(cur.id)) {
        seen.add(cur.id)
        cur = byId.get(cur.parent_id)
      }
      return cur
    }

    const needle = keyword ? keyword.toLowerCase() : null
    function matchesKeyword(item) {
      if (!needle) return true
      const title = (item.title || '').toLowerCase()
      const content = (item.content || '').toLowerCase()
      return title.includes(needle) || content.includes(needle)
    }

    const validRootIds = new Set()
    all.forEach(item => {
      if (!matchesKeyword(item)) return
      const root = getRoot(item)
      if (system && root.system !== system) return
      if (workType && root.work_type !== workType) return
      if (dateFrom && (!root.log_date || root.log_date < dateFrom)) return
      if (dateTo && (!root.log_date || root.log_date > dateTo)) return
      validRootIds.add(root.id)
    })

    function isDescendantOfRoot(item) {
      let cur = item
      const seen = new Set()
      while (cur) {
        if (validRootIds.has(cur.id)) return true
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
