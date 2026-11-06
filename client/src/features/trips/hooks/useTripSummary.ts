import { useQuery } from '@tanstack/react-query'
import { getTripSummary } from '../api/getTripSummary'
import { useAuth } from '../../auth/contexts/AuthContext'

export function useTripSummary(tripId: string | null) {
	const { isAuthenticated } = useAuth()
	return useQuery({
		queryKey: ['trip-summary', tripId],
		queryFn: () => getTripSummary(tripId!),
		enabled: isAuthenticated && !!tripId,
	})
}
