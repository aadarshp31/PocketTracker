import { http } from '../../../shared/api/http'
import type { TransactionsResponse } from '../types'

export interface GetTransactionsParams {
  page?: number
  limit?: number
}

export async function getTransactions(params: GetTransactionsParams): Promise<TransactionsResponse> {
  const { data } = await http.get<TransactionsResponse>('/transactions', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 10,
    },
  })

  return data
}
