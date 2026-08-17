import { http } from '../../../shared/api/http'
import type { GetTransactionsParams } from './getTransactions'

export interface TransactionSummary {
  income: string
  expenses: string
  net: string
  transactionCount: number
}

export async function getTransactionSummary(
  params: Omit<GetTransactionsParams, 'page' | 'limit' | 'sort' | 'order'>
): Promise<TransactionSummary> {
  const query: Record<string, string> = {}

  if (params.type) query.type = params.type
  if (params.category_id) query.category_id = params.category_id
  if (params.dateFrom) query.dateFrom = params.dateFrom
  if (params.dateTo) query.dateTo = params.dateTo
  if (params.search?.trim()) query.search = params.search.trim()

  const { data } = await http.get<TransactionSummary>('/transactions/summary', { params: query })
  return data
}
