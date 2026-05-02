import { useQuery } from '@tanstack/react-query'
import { getProfile } from '../api/getProfile'
import { useAuth } from '../../auth/contexts/AuthContext'

export function useProfile() {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['profile'],
    queryFn: () => getProfile(),
    enabled: isAuthenticated,
  })
}