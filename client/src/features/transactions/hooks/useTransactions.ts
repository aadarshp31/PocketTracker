import { useQuery } from '@tanstack/react-query'
import { getTransactions, type GetTransactionsParams } from '../api/getTransactions'
import { useAuth } from '../../auth/contexts/AuthContext'

export function useTransactions(params?: GetTransactionsParams) {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: [
      'transactions',
      params?.page ?? 1,
      params?.limit ?? 10,
      params?.type ?? '',
      params?.category_id ?? '',
      params?.dateFrom ?? '',
      params?.dateTo ?? '',
      params?.search ?? '',
      params?.sort ?? 'date',
      params?.order ?? 'desc',
    ],
    queryFn: () => getTransactions(params || {}),
    enabled: isAuthenticated,
  })
}
