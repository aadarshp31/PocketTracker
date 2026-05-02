import { http } from '../../../shared/api/http'
import type { DailyPatternData, InsightsResponse } from '../types'

export interface DailyPatternParams {
  days?: number
}

export async function getDailyPattern(
  params: DailyPatternParams = {}
): Promise<InsightsResponse<DailyPatternData>> {
  const { data } = await http.get<InsightsResponse<DailyPatternData>>('/insights/daily-pattern', {
    params,
  })
  return data
}
