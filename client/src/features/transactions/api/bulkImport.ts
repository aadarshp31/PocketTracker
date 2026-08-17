import { http } from '../../../shared/api/http'

export interface BulkImportPayload {
  transactions: Array<{
    amount: number
    type: 'income' | 'expense'
    description: string
    date: string
    category_id: string
  }>
}

export interface BulkImportConfig {
  maxTransactionsPerBatch: number
}

export async function getBulkImportConfig(): Promise<BulkImportConfig> {
  const response = await http.get('/transactions/bulk/config')
  return response.data
}

const BULK_IMPORT_TIMEOUT_MS = 120_000

export async function bulkImportSubmit(payload: BulkImportPayload) {
  const response = await http.post('/transactions/bulk', payload, {
    timeout: BULK_IMPORT_TIMEOUT_MS,
  })
  return response.data
}
