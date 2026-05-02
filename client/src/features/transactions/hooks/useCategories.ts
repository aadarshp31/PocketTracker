import { useQuery } from '@tanstack/react-query'
import { getCategories } from '../api/getCategories'
import { useAuth } from '../../auth/contexts/AuthContext'

export function useCategories() {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
    enabled: isAuthenticated,
  })
}
