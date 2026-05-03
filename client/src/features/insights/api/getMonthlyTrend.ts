import { http } from '../../../shared/api/http'
import type { InsightsResponse, MonthlyTrendData } from '../types'

export interface MonthlyTrendParams {
  months?: number
  month?: number
  year?: number
}

export async function getMonthlyTrend(
  params: MonthlyTrendParams = {}
): Promise<InsightsResponse<MonthlyTrendData>> {
  const { data } = await http.get<InsightsResponse<MonthlyTrendData>>('/insights/monthly-trend', { params })
  return data
}