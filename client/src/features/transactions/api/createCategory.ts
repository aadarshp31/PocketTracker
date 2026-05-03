import { http } from '../../../shared/api/http'
import type { CategoryItem } from './getCategories'
import type { TransactionType } from '../types'

export interface CreateCategoryPayload {
  name: string
  type: TransactionType
}

interface CreateCategoryResponse {
  categories: CategoryItem
}

export async function createCategory(payload: CreateCategoryPayload): Promise<CreateCategoryResponse> {
  const { data } = await http.post<CreateCategoryResponse>('/categories', {
    ...payload,
    is_default: false,
  })
  return data
}