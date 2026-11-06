import { http } from '../../../shared/api/http'
import type { Trip } from '../types'

export interface CreateTripPayload {
	name: string
	start_date: string
	end_date: string
	budget?: number | null
	color?: string | null
	emoji?: string | null
}

export async function createTrip(payload: CreateTripPayload): Promise<{ trips: Trip[] }> {
	const { data } = await http.post<{ trips: Trip[] }>('/trips', payload)
	return data
}
