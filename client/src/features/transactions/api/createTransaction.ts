import { http } from '../../../shared/api/http'
import type { TransactionType } from '../types'

export interface CreateTransactionPayload {
  amount: number
  type: TransactionType
  description: string
  category_id: string
  date: string
}

export async function createTransaction(payload: CreateTransactionPayload) {
  const { data } = await http.post('/transactions', payload)
  return data
}
