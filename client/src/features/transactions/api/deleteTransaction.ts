import { http } from '../../../shared/api/http'

export async function deleteTransaction(transactionId: string) {
  const { data } = await http.delete(`/transactions/${transactionId}`)
  return data
}
