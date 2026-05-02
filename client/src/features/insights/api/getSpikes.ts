import { http } from '../../../shared/api/http'
import type { InsightsResponse, SpikesData } from '../types'

export interface SpikesParams {
  days?: number
  threshold?: number
}

export async function getSpikes(params: SpikesParams = {}): Promise<InsightsResponse<SpikesData>> {
  const { data } = await http.get<InsightsResponse<SpikesData>>('/insights/spikes', { params })
  return data
}
