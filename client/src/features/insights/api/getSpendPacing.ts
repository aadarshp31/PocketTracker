import { http } from '../../../shared/api/http'
import type { InsightsResponse, SpendPacingData } from '../types'

export interface SpendPacingParams {
  month?: number
  year?: number
}

export async function getSpendPacing(
  params: SpendPacingParams = {}
): Promise<InsightsResponse<SpendPacingData>> {
  const { data } = await http.get<InsightsResponse<SpendPacingData>>('/insights/spend-pacing', { params })
  return data
}

