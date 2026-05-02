import { useQuery } from '@tanstack/react-query'
import { getSummary, type SummaryParams } from '../api/getSummary'
import { useAuth } from '../../auth/contexts/AuthContext'

export function useSummary(params: SummaryParams = {}) {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['insights', 'summary', params.month, params.year],
    queryFn: () => getSummary(params),
    enabled: isAuthenticated,
  })
}
