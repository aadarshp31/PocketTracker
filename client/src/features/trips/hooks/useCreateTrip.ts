import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTrip, type CreateTripPayload } from '../api/createTrip'

export function useCreateTrip() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (payload: CreateTripPayload) => createTrip(payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['trips'] })
		},
	})
}
