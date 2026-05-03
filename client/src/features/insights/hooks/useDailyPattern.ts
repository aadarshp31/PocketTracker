import { useQuery } from '@tanstack/react-query'
import { getDailyPattern, type DailyPatternParams } from '../api/getDailyPattern'
import { useAuth } from '../../auth/contexts/AuthContext'

export function useDailyPattern(params: DailyPatternParams = {}) {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['insights', 'daily-pattern', params.days],
    queryFn: () => getDailyPattern(params),
    enabled: isAuthenticated,
  })
}
