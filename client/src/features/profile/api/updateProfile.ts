import { http } from '../../../shared/api/http'
import type { ProfileResponse } from '../types'

export interface UpdateProfilePayload {
  first_name?: string
  last_name?: string
  currency?: string
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<ProfileResponse> {
  const { data } = await http.put<ProfileResponse>('/users/me', payload)
  return data
}