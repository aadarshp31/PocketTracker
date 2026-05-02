import { useQuery } from '@tanstack/react-query'
import { getSpikes, type SpikesParams } from '../api/getSpikes'
import { useAuth } from '../../auth/contexts/AuthContext'

export function useSpikes(params: SpikesParams = {}) {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['insights', 'spikes', params.days, params.threshold],
    queryFn: () => getSpikes(params),
    enabled: isAuthenticated,
  })
}
