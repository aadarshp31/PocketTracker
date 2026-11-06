import { useQuery } from '@tanstack/react-query'
import { getTrips } from '../api/getTrips'
import { useAuth } from '../../auth/contexts/AuthContext'

export function useTrips() {
	const { isAuthenticated } = useAuth()
	return useQuery({
		queryKey: ['trips'],
		queryFn: getTrips,
		enabled: isAuthenticated,
	})
}
