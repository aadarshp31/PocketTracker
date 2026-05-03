import { http } from '../../../shared/api/http'
import type { TransactionType } from '../types'

export interface UpdateTransactionPayload {
  amount?: number
  type?: TransactionType
  description?: string
  category_id?: string
  date?: string
}

export async function updateTransaction(transactionId: string, payload: UpdateTransactionPayload) {
  const { data } = await http.put(`/transactions/${transactionId}`, payload)
  return data
}
