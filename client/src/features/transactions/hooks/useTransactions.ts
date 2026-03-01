import { useQuery } from '@tanstack/react-query'
import { getTransactions, type GetTransactionsParams } from '../api/getTransactions'

export function useTransactions(params: GetTransactionsParams) {
  return useQuery({
    queryKey: ['transactions', params.userId, params.page ?? 1, params.limit ?? 10],
    queryFn: () => getTransactions(params),
    enabled: Boolean(params.userId),
  })
}
