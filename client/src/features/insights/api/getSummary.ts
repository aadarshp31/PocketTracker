import { http } from '../../../shared/api/http'
import type { InsightsResponse, SummaryData } from '../types'

export interface SummaryParams {
  month?: number
  year?: number
}

export async function getSummary(params: SummaryParams = {}): Promise<InsightsResponse<SummaryData>> {
  const { data } = await http.get<InsightsResponse<SummaryData>>('/insights/summary', { params })
  return data
}
