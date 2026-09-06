import { useQuery } from '@tanstack/react-query'
import { getBudgetProgress, type BudgetProgressParams } from '../api/getBudgetProgress'
import { useAuth } from '../../auth/contexts/AuthContext'

export function useBudgetProgress(params: BudgetProgressParams = {}) {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['insights', 'budget-progress', params.month, params.year],
    queryFn: () => getBudgetProgress(params),
    enabled: isAuthenticated,
  })
}

