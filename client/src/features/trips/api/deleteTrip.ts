import { http } from '../../../shared/api/http'

export async function deleteTrip(tripId: string): Promise<void> {
	await http.delete(`/trips/${tripId}`)
}
