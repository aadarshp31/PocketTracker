import { http } from '../../../shared/api/http'
import type { TripSummary } from '../types'

export async function getTripSummary(tripId: string): Promise<{ summary: TripSummary }> {
	const { data } = await http.get<{ summary: TripSummary }>(`/trips/${tripId}/summary`)
	return data
}
