import { http } from '../../../shared/api/http'
import type { CategoryData, InsightsResponse } from '../types'

export interface CategoryParams {
  month?: number
  year?: number
  limit?: number
}

export async function getCategories(params: CategoryParams = {}): Promise<InsightsResponse<CategoryData>> {
  const { data } = await http.get<InsightsResponse<CategoryData>>('/insights/categories', { params })
  return data
}
