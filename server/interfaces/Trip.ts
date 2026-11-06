export default interface Trip {
  id?: string
  user_id?: string | null
  name: string
  start_date: string
  end_date: string
  budget?: number | null
  color?: string | null
  emoji?: string | null
  transactionCount?: number
  readonly createdAt?: string
  readonly updatedAt?: string
}
