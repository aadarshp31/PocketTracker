export interface ValidatableTransaction {
  amount: number
  type: string
  description: string
  date: string
  category_id: string
}

export const VALID_TRANSACTION_TYPES = new Set<string>([
  'income',
  'expense',
  'investment',
  'transfer',
])

export function isInvalidImportTransaction(
  tx: ValidatableTransaction,
  categoryOptions?: Array<{ id: string; type: string }>,
): boolean {
  if (!tx.description?.trim()) return true
  if (!tx.category_id) return true
  if (Number.isNaN(tx.amount) || tx.amount <= 0) return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tx.date)) return true
  if (!VALID_TRANSACTION_TYPES.has(tx.type)) return true
  if (categoryOptions && categoryOptions.length > 0) {
    const category = categoryOptions.find((c) => c.id === tx.category_id)
    if (!category || category.type !== tx.type) return true
  }
  return false
}

