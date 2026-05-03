import { http } from '../../../shared/api/http'
import type { ProfileResponse } from '../types'

export async function getProfile(): Promise<ProfileResponse> {
  const { data } = await http.get<ProfileResponse>('/users/me')
  return data
}