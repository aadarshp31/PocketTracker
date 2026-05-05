import { http } from '../../../shared/api/http'

export interface BulkImportPayload {
  transactions: Array<{
    amount: number
    type: 'income' | 'expense'
    description: string
    date: string
    category_id?: string
  }>
}

export async function bulkImportPreview(payload: BulkImportPayload) {
  const response = await http.post('/transactions/bulk/preview', payload)
  return response.data
}

export async function bulkImportSubmit(payload: BulkImportPayload) {
  const response = await http.post('/transactions/bulk', payload)
  return response.data
}
