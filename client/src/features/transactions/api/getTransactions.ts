import { http } from '../../../shared/api/http'
import type { TransactionType, TransactionsResponse } from '../types'

export interface GetTransactionsParams {
  page?: number
  limit?: number
  type?: TransactionType
  category_id?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  sort?: string
  order?: 'asc' | 'desc'
}

export async function getTransactions(params: GetTransactionsParams = {}): Promise<TransactionsResponse> {
  const query: Record<string, string | number> = {
    page: params.page ?? 1,
    limit: params.limit ?? 10,
  }

  if (params.type) query.type = params.type
  if (params.category_id) query.category_id = params.category_id
  if (params.dateFrom) query.dateFrom = params.dateFrom
  if (params.dateTo) query.dateTo = params.dateTo
  if (params.search?.trim()) query.search = params.search.trim()
  if (params.sort) query.sort = params.sort
  if (params.order) query.order = params.order

  const { data } = await http.get<TransactionsResponse>('/transactions', { params: query })

  return data
}
