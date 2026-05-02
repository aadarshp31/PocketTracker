import { useQuery } from '@tanstack/react-query'
import { getTransactions, type GetTransactionsParams } from '../api/getTransactions'
import { useAuth } from '../../auth/contexts/AuthContext'

export function useTransactions(params?: Omit<GetTransactionsParams, 'userId'>) {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['transactions', params?.page ?? 1, params?.limit ?? 10],
    queryFn: () => getTransactions(params || {}),
    enabled: isAuthenticated,
  })
}
