import { http } from '../../../shared/api/http'
import type { InsightsResponse, ProjectionData } from '../types'

export interface ProjectionParams {
  month?: number
  year?: number
}

export async function getProjection(
  params: ProjectionParams = {}
): Promise<InsightsResponse<ProjectionData>> {
  const { data } = await http.get<InsightsResponse<ProjectionData>>('/insights/projection', { params })
  return data
}
