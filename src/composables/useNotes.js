import { ref } from 'vue'
import { supabase } from '../supabase/client'

export function useNotes() {
  const notes = ref([])
  const loading = ref(false)

  async function fetchList({ dateFrom, dateTo, category, keyword }) {
    loading.value = true
    let query = supabase
      .from('ts_notes')
      .select('*')
      .order('note_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (dateFrom) query = query.gte('note_date', dateFrom)
    if (dateTo) query = query.lte('note_date', dateTo)
    if (category) query = query.eq('category', category)
    if (keyword) {
      const like = `%${keyword.replace(/[%,()]/g, ' ')}%`
      query = query.or(`title.ilike.${like},request_content.ilike.${like},resolution_content.ilike.${like}`)
    }

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

  async function deleteNote(id) {
    const { error } = await supabase
      .from('ts_notes')
      .delete()
      .eq('id', id)
    if (error) throw error
  }

  return { notes, loading, fetchList, insertNote, updateNote, deleteNote }
}
