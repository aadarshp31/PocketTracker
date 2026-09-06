import { useQuery } from '@tanstack/react-query'
import { getSpendPacing, type SpendPacingParams } from '../api/getSpendPacing'
import { useAuth } from '../../auth/contexts/AuthContext'

export function useSpendPacing(params: SpendPacingParams = {}) {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['insights', 'spend-pacing', params.month, params.year],
    queryFn: () => getSpendPacing(params),
    enabled: isAuthenticated,
  })
}

