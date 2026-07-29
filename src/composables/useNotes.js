import { ref } from 'vue'
import { supabase } from '../supabase/client'

export function useNotes() {
  const notes = ref([])
  const loading = ref(false)

  async function fetchList({ date, category }) {
    loading.value = true
    let query = supabase
      .from('ts_notes')
      .select('*')
      .order('note_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (date) query = query.eq('note_date', date)
    if (category) query = query.eq('category', category)

    const { data, error } = await query
    loading.value = false
    if (error) throw error
    notes.value = data
  }

  async function insertNote(payload) {
    const { data, error } = await supabase
      .from('ts_notes')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function updateNote(id, payload) {
    const { error } = await supabase
      .from('ts_notes')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }

  return { notes, loading, fetchList, insertNote, updateNote }
}
