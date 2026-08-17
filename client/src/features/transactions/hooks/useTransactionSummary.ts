import { useQuery } from '@tanstack/react-query'
import { getTransactionSummary } from '../api/getTransactionSummary'
import type { GetTransactionsParams } from '../api/getTransactions'
import { useAuth } from '../../auth/contexts/AuthContext'

export function useTransactionSummary(params: Omit<GetTransactionsParams, 'page' | 'limit' | 'sort' | 'order'>) {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: [
      'transactions',
      'summary',
      params.type ?? '',
      params.category_id ?? '',
      params.dateFrom ?? '',
      params.dateTo ?? '',
      params.search ?? '',
    ],
    queryFn: () => getTransactionSummary(params),
    enabled: isAuthenticated,
  })
}
