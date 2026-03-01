export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  amount: string
  type: TransactionType
  description: string | null
  date: string
  category_id: string
  user_id: string
  createdAt: string
  updatedAt: string
}

export interface PaginatedMeta {
  page: number
  limit: number
  totalPages: number
  totalCount: number
}

export interface TransactionsResponse {
  transactions: Transaction[]
  meta: PaginatedMeta
}
