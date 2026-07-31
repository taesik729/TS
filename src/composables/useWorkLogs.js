import { ref } from 'vue'
import { supabase } from '../supabase/client'

function pad(n) {
  return String(n).padStart(2, '0')
}

export function useWorkLogs() {
  const logDates = ref(new Set())
  const loading = ref(false)

  async function fetchMonth(year, month) {
    loading.value = true
    const from = `${year}-${pad(month)}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const to = `${year}-${pad(month)}-${pad(lastDay)}`
    const { data, error } = await supabase
      .from('work_logs')
      .select('log_date')
      .gte('log_date', from)
      .lte('log_date', to)
    loading.value = false
    if (error) throw error
    logDates.value = new Set(data.map(d => d.log_date))
  }

  async function fetchByDate(date) {
    const { data, error } = await supabase
      .from('work_logs')
      .select('*')
      .eq('log_date', date)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async function upsertLog(date, content) {
    const { data, error } = await supabase
      .from('work_logs')
      .upsert({ log_date: date, content, updated_at: new Date().toISOString() }, { onConflict: 'log_date' })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function deleteLog(date) {
    const { error } = await supabase
      .from('work_logs')
      .delete()
      .eq('log_date', date)
    if (error) throw error
  }

  return { logDates, loading, fetchMonth, fetchByDate, upsertLog, deleteLog }
}
