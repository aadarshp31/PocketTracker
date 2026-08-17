import { http } from '../../../shared/api/http'
import type { CategoryKeywordMapping } from '../../../shared/utils/categorizeTransaction'

export interface CategoryKeywordsResponse {
  mappings: CategoryKeywordMapping[]
}

export async function getCategoryKeywords(): Promise<CategoryKeywordsResponse> {
  const { data } = await http.get<CategoryKeywordsResponse>('/category-keywords')
  return data
}

export interface AddCategoryKeywordPayload {
  category_id: string
  keyword: string
}

export interface AddCategoryKeywordResponse {
  mapping: CategoryKeywordMapping
}

export async function addCategoryKeyword(payload: AddCategoryKeywordPayload): Promise<AddCategoryKeywordResponse> {
  const { data } = await http.post<AddCategoryKeywordResponse>('/category-keywords', payload)
  return data
}

export interface RemoveCategoryKeywordPayload {
  mappingId: string
  keyword: string
}

export async function removeCategoryKeyword(payload: RemoveCategoryKeywordPayload): Promise<void> {
  await http.delete(`/category-keywords/${payload.mappingId}/keywords/${encodeURIComponent(payload.keyword)}`)
}
