import { http } from '../../../shared/api/http'

export interface CategoryItem {
  id: string
  name: string
  type: 'income' | 'expense'
  is_default: boolean
}

export interface CategoriesResponse {
  categories: CategoryItem[]
}

export async function getCategories(): Promise<CategoriesResponse> {
  const { data } = await http.get<CategoriesResponse>('/categories')
  return data
}
