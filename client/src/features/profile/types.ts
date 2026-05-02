export interface ProfileUser {
  id: string
  first_name: string
  last_name: string
  email: string
  currency: string
}

export interface ProfileResponse {
  users: ProfileUser[]
}