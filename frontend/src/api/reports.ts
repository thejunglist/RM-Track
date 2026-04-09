import { supabase } from '../lib/supabase'

export async function getMonthlyReport(month: number, year: number): Promise<unknown> {
  const { data, error } = await supabase.rpc('monthly_report', { p_month: month, p_year: year })
  if (error) throw error
  return data
}
