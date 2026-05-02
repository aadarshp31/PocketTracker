import { useQuery } from '@tanstack/react-query'
import { getCategories, type CategoryParams } from '../api/getCategories'
import { useAuth } from '../../auth/contexts/AuthContext'

export function useCategories(params: CategoryParams = {}) {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['insights', 'categories', params.month, params.year, params.limit],
    queryFn: () => getCategories(params),
    enabled: isAuthenticated,
  })
}
