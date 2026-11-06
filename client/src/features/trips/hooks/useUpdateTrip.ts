import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTrip, type UpdateTripPayload } from '../api/updateTrip'

export function useUpdateTrip() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ tripId, payload }: { tripId: string; payload: UpdateTripPayload }) =>
			updateTrip(tripId, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['trips'] })
			queryClient.invalidateQueries({ queryKey: ['transactions'] })
		},
	})
}
