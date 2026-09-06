import { http } from '../../../shared/api/http'
import type { BudgetProgressData, InsightsResponse } from '../types'

export interface BudgetProgressParams {
  month?: number
  year?: number
}

export async function getBudgetProgress(
  params: BudgetProgressParams = {}
): Promise<InsightsResponse<BudgetProgressData>> {
  const { data } = await http.get<InsightsResponse<BudgetProgressData>>('/insights/budget-progress', { params })
  return data
}

