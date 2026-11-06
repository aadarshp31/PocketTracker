import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteTrip } from '../api/deleteTrip'

export function useDeleteTrip() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (tripId: string) => deleteTrip(tripId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['trips'] })
			queryClient.invalidateQueries({ queryKey: ['transactions'] })
		},
	})
}
