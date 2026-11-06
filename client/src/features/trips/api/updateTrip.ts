import { http } from '../../../shared/api/http'
import type { Trip } from '../types'

export interface UpdateTripPayload {
	name?: string
	start_date?: string
	end_date?: string
	budget?: number | null
	color?: string | null
	emoji?: string | null
}

export async function updateTrip(tripId: string, payload: UpdateTripPayload): Promise<{ trips: Trip[] }> {
	const { data } = await http.put<{ trips: Trip[] }>(`/trips/${tripId}`, payload)
	return data
}
