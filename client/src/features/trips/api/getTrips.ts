import { http } from '../../../shared/api/http'
import type { Trip } from '../types'

export async function getTrips(): Promise<{ trips: Trip[] }> {
	const { data } = await http.get<{ trips: Trip[] }>('/trips')
	return data
}
