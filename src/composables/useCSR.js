import { ref } from 'vue'
import { supabase } from '../supabase/client'

export function useCSRTasks() {
  const tasks = ref([])
  const loading = ref(false)

  async function fetchList({ status, dateFrom, dateTo, keyword }) {
    loading.value = true
    let query = supabase
      .from('csr_tasks')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (dateFrom) query = query.gte('start_date', dateFrom)
    if (dateTo) query = query.lte('start_date', dateTo)
    if (keyword) {
      const like = `%${keyword.replace(/[%,()]/g, ' ')}%`
      query = query.or(`title.ilike.${like},content.ilike.${like}`)
    }

    const { data, error } = await query
    loading.value = false
    if (error) throw error
    tasks.value = data
  }

  async function insertTask(payload) {
    const { data, error } = await supabase
      .from('csr_tasks')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function updateTask(id, payload) {
    const { error } = await supabase
      .from('csr_tasks')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }

  return { tasks, loading, fetchList, insertTask, updateTask }
}

export function useSubtasks() {
  const subtasks = ref([])

  async function fetchSubtasks(taskId) {
    const { data, error } = await supabase
      .from('csr_subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
    if (error) throw error
    subtasks.value = data
  }

  async function addSubtask(taskId, title) {
    const { data, error } = await supabase
      .from('csr_subtasks')
      .insert({ task_id: taskId, title })
      .select()
      .single()
    if (error) throw error
    subtasks.value.push(data)
  }

  async function toggleSubtask(id, done) {
    const { error } = await supabase
      .from('csr_subtasks')
      .update({ done })
      .eq('id', id)
    if (error) throw error
    const item = subtasks.value.find(s => s.id === id)
    if (item) item.done = done
  }

  function clearSubtasks() {
    subtasks.value = []
  }

  return { subtasks, fetchSubtasks, addSubtask, toggleSubtask, clearSubtasks }
}

export function useComments() {
  const comments = ref([])

  async function fetchComments(taskId) {
    const { data, error } = await supabase
      .from('csr_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
    if (error) throw error
    comments.value = data
  }

  async function addComment(taskId, content) {
    const { data, error } = await supabase
      .from('csr_comments')
      .insert({ task_id: taskId, content })
      .select()
      .single()
    if (error) throw error
    comments.value.push(data)
  }

  function clearComments() {
    comments.value = []
  }

  return { comments, fetchComments, addComment, clearComments }
}

export async function uploadCSRImage(file) {
  const ext = file.name.split('.').pop() || 'png'
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('csr-attachments').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('csr-attachments').getPublicUrl(path)
  return data.publicUrl
}
