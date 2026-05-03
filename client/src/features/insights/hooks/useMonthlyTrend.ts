import { useQuery } from '@tanstack/react-query'
import { getMonthlyTrend, type MonthlyTrendParams } from '../api/getMonthlyTrend'
import { useAuth } from '../../auth/contexts/AuthContext'

export function useMonthlyTrend(params: MonthlyTrendParams = {}) {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['insights', 'monthly-trend', params.months, params.month, params.year],
    queryFn: () => getMonthlyTrend(params),
    enabled: isAuthenticated,
  })
}