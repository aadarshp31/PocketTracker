import { useState, useEffect } from 'react'
import { Plus, Trash2, TrendingUp } from 'lucide-react'
import { useCategories } from '../hooks/useCategories'
import { formatCurrency } from '../../../shared/utils/currency'

export interface ManualTransaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category_id?: string
}

export interface QuickAddCategory {
  categoryId: string
  categoryName: string
  type: 'income' | 'expense'
  frequency: number
}

export interface BulkManualEntryProps {
  onTransactionsReady: (transactions: ManualTransaction[]) => void
  onError: (error: string) => void
  isLoading?: boolean
  currency?: string
}

export function BulkManualEntry({ onTransactionsReady, onError, isLoading = false, currency = 'INR' }: BulkManualEntryProps) {
  const { data: categoriesData } = useCategories()
  const [transactions, setTransactions] = useState<ManualTransaction[]>([])
  const [quickAddCategories, setQuickAddCategories] = useState<QuickAddCategory[]>([])

  useEffect(() => {
    if (transactions.length === 0) {
      addRow()
    }
  }, [])

  useEffect(() => {
    if (categoriesData?.categories) {
      const expenseCategories = categoriesData.categories
        .filter((cat: any) => cat.type === 'expense')
        .slice(0, 5)
        .map((cat: any) => ({
          categoryId: cat.id,
          categoryName: cat.name,
          type: cat.type,
          frequency: Math.random() * 10,
        }))
      setQuickAddCategories(expenseCategories)
    }
  }, [categoriesData])

  const addRow = () => {
    const newRow: ManualTransaction = {
      id: `temp-${Date.now()}-${Math.random()}`,
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: 0,
      type: 'expense',
    }
    setTransactions((prev) => [...prev, newRow])
  }

  const removeRow = (id: string) => {
    if (transactions.length === 1) {
      onError('You must have at least one transaction')
      return
    }
    setTransactions((prev) => prev.filter((tx) => tx.id !== id))
  }

  const updateTransaction = (id: string, field: keyof ManualTransaction, value: any) => {
    setTransactions((prev) =>
      prev.map((tx) =>
        tx.id === id
          ? {
              ...tx,
              [field]: value,
            }
          : tx
      )
    )
  }

  const addQuickCategory = (category: QuickAddCategory) => {
    const newRow: ManualTransaction = {
      id: `temp-${Date.now()}-${Math.random()}`,
      date: new Date().toISOString().split('T')[0],
      description: category.categoryName,
      amount: 0,
      type: category.type,
      category_id: category.categoryId,
    }
    setTransactions((prev) => [newRow, ...prev])
  }

  const handleSubmit = () => {
    const errors: string[] = []

    transactions.forEach((tx, idx) => {
      if (!tx.description.trim()) {
        errors.push(`Row ${idx + 1}: Description is required`)
      }
      if (tx.amount <= 0) {
        errors.push(`Row ${idx + 1}: Amount must be greater than 0`)
      }
      if (!tx.date) {
        errors.push(`Row ${idx + 1}: Date is required`)
      }
    })

    if (errors.length > 0) {
      onError(errors.join('; '))
      return
    }

    onTransactionsReady(transactions)
  }

  const categories = (categoriesData?.categories || [])
  const incomeCategories = categories.filter((cat: any) => cat.type === 'income')
  const expenseCategories = categories.filter((cat: any) => cat.type === 'expense')

  const totalAmount = transactions.reduce((sum, tx) => {
    return sum + (tx.type === 'income' ? tx.amount : -tx.amount)
  }, 0)

  return (
    <div className="bulk-manual-flow">
      {quickAddCategories.length > 0 && (
        <div className="bulk-manual-quick-add">
          <div className="bulk-manual-quick-add-header">
            <div className="bulk-manual-quick-add-icon">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3>Quick Add Common Categories</h3>
              <p>Seed a new row with a common category and keep moving.</p>
            </div>
          </div>
          <div className="quick-category-list">
            {quickAddCategories.map((cat) => (
              <button
                key={cat.categoryId}
                onClick={() => addQuickCategory(cat)}
                disabled={isLoading}
                className="category-chip"
              >
                {cat.categoryName}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bulk-manual-table-section">
        <div className="bulk-manual-table-header">
          <div>
            <h3>Transactions ({transactions.length})</h3>
            <p>Add rows, review the running total, and leave category blank when you want automatic categorization during preview.</p>
          </div>
          <button
            onClick={addRow}
            disabled={isLoading}
            className="primary-button bulk-manual-add-row"
          >
            <Plus className="w-4 h-4" />
            Add Row
          </button>
        </div>

        <div className="overflow-x-auto table-wrap bulk-manual-table-wrap">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-right">Amount</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Category (Optional)</th>
                <th className="px-4 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, idx) => (
                <tr key={tx.id} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="px-4 py-2">
                    <input
                      type="date"
                      value={tx.date}
                      onChange={(e) => updateTransaction(tx.id, 'date', e.target.value)}
                      disabled={isLoading}
                      className="w-full px-2 py-1 border rounded"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      placeholder="e.g., Starbucks coffee"
                      value={tx.description}
                      onChange={(e) => updateTransaction(tx.id, 'description', e.target.value)}
                      disabled={isLoading}
                      className="w-full px-2 py-1 border rounded"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      value={tx.amount || ''}
                      onChange={(e) => updateTransaction(tx.id, 'amount', parseFloat(e.target.value) || 0)}
                      disabled={isLoading}
                      className="w-full px-2 py-1 border rounded text-right"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={tx.type}
                      onChange={(e) => updateTransaction(tx.id, 'type', e.target.value as 'income' | 'expense')}
                      disabled={isLoading}
                      className="w-full px-2 py-1 border rounded"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={tx.category_id || ''}
                      onChange={(e) => updateTransaction(tx.id, 'category_id', e.target.value || undefined)}
                      disabled={isLoading}
                      className="w-full px-2 py-1 border rounded"
                    >
                      <option value="">None (auto-categorize)</option>
                      {tx.type === 'income'
                        ? incomeCategories.map((cat: any) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))
                        : expenseCategories.map((cat: any) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => removeRow(tx.id)}
                      disabled={isLoading || transactions.length === 1}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bulk-manual-summary">
        <div className="bulk-manual-summary-grid">
          <div>
            <p className="text-sm text-gray-600">Total Transactions</p>
            <p className="text-2xl font-bold">{transactions.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Net Amount</p>
            <p className={`text-2xl font-bold ${totalAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalAmount, currency)}
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isLoading || transactions.length === 0}
        className="primary-button bulk-manual-submit"
      >
        {isLoading ? 'Processing...' : 'Continue to Review'}
      </button>
    </div>
  )
}
