import api from './client'

export const getMonthlyReport = (month: number, year: number) =>
  api.get('/reports/monthly', { params: { month, year } }).then(r => r.data)
