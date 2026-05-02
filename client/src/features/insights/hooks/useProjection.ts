import { useQuery } from '@tanstack/react-query'
import { getProjection, type ProjectionParams } from '../api/getProjection'
import { useAuth } from '../../auth/contexts/AuthContext'

export function useProjection(params: ProjectionParams = {}) {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['insights', 'projection', params.month, params.year],
    queryFn: () => getProjection(params),
    enabled: isAuthenticated,
  })
}
