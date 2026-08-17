import { useEffect, useState } from 'react'
import { RotateCcw, Trash2 } from 'lucide-react'
import { useCategories } from '../hooks/useCategories'

export interface PreviewTransaction {
  index: number
  amount: number
  description: string
  date: string
  type: 'income' | 'expense'
  category_id: string
}

export interface BulkImportReviewProps {
  transactions: PreviewTransaction[]
  categorizedCount: number
  onConfirm: (transactionsToImport: Array<{
    amount: number
    type: 'income' | 'expense'
    description: string
    date: string
    category_id: string
  }>) => void
  onBack: () => void
  isLoading?: boolean
}

export function BulkImportReview({
  transactions,
  categorizedCount,
  onConfirm,
  onBack,
  isLoading = false,
}: BulkImportReviewProps) {
  const [editableTransactions, setEditableTransactions] = useState<PreviewTransaction[]>([])
  const [discardedTransactionIndices, setDiscardedTransactionIndices] = useState<Set<number>>(new Set())
  const [bulkSelectedIndices, setBulkSelectedIndices] = useState<Set<number>>(new Set())
  const [reviewError, setReviewError] = useState('')

  const categoriesQuery = useCategories()
  const categoryOptions = categoriesQuery.data?.categories || []

  useEffect(() => {
    setEditableTransactions(transactions)
    setDiscardedTransactionIndices(new Set())
    setBulkSelectedIndices(new Set())
    setReviewError('')
  }, [transactions])

  const handleTransactionFieldChange = (
    index: number,
    field: keyof Pick<PreviewTransaction, 'date' | 'description' | 'amount' | 'type' | 'category_id'>,
    value: string | number,
  ) => {
    setEditableTransactions((prev) => prev.map((tx) => {
      if (tx.index !== index) return tx
      return {
        ...tx,
        [field]: value,
      }
    }))
  }

  const handleToggleDiscard = (index: number) => {
    setDiscardedTransactionIndices((prev) => {
      const updated = new Set(prev)
      if (updated.has(index)) {
        updated.delete(index)
      } else {
        updated.add(index)
      }
      return updated
    })
  }

  const handleToggleBulkSelect = (index: number) => {
    setBulkSelectedIndices((prev) => {
      const updated = new Set(prev)
      if (updated.has(index)) updated.delete(index)
      else updated.add(index)
      return updated
    })
  }

  const handleBulkSelectAll = () => {
    if (bulkSelectedIndices.size === editableTransactions.length) {
      setBulkSelectedIndices(new Set())
    } else {
      setBulkSelectedIndices(new Set(editableTransactions.map((tx) => tx.index)))
    }
  }

  const handleBulkDiscardSelected = () => {
    setDiscardedTransactionIndices((prev) => new Set([...prev, ...bulkSelectedIndices]))
    setBulkSelectedIndices(new Set())
  }

  const handleBulkRestoreAll = () => {
    setDiscardedTransactionIndices(new Set())
    setBulkSelectedIndices(new Set())
  }

  const isRowIncluded = (txIndex: number) => !discardedTransactionIndices.has(txIndex)

  const handleConfirm = () => {
    const transactionsToImport = editableTransactions
      .filter((tx) => isRowIncluded(tx.index))
      .map((tx) => ({
        amount: Number(tx.amount),
        type: tx.type,
        description: tx.description.trim(),
        date: tx.date,
        category_id: tx.category_id,
      }))

    if (transactionsToImport.length === 0) {
      setReviewError('Please select at least one transaction to import.')
      return
    }

    const invalidTransaction = transactionsToImport.find((tx) => {
      return (
        !tx.description ||
        !tx.category_id ||
        Number.isNaN(tx.amount) ||
        tx.amount <= 0 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(tx.date) ||
        (tx.type !== 'income' && tx.type !== 'expense')
      )
    })

    if (invalidTransaction) {
      setReviewError('Please fix invalid values (date, description, amount, type, category) before importing.')
      return
    }

    setReviewError('')
    onConfirm(transactionsToImport)
  }

  const selectedForImportCount = editableTransactions.filter((tx) => isRowIncluded(tx.index)).length
  const excludedCount = editableTransactions.length - selectedForImportCount

  return (
    <div className="bulk-review-flow">
      <div className="bulk-review-summary-grid">
        <div className="bulk-review-stat-card is-ready">
          <p className="bulk-review-stat-label">Selected for Import</p>
          <p className="bulk-review-stat-value">{selectedForImportCount}</p>
        </div>
        <div className="bulk-review-stat-card is-categorized">
          <p className="bulk-review-stat-label">Auto-Categorized</p>
          <p className="bulk-review-stat-value">{categorizedCount}</p>
        </div>
      </div>

      <div className="bulk-review-section">
        <div className="bulk-review-section-header">
          <h3>Transactions for Import</h3>
          <p>Edit values, assign categories, and exclude rows you do not want to import.</p>
        </div>

        <p className="bulk-review-meta-hint">
          {selectedForImportCount} selected for import{excludedCount > 0 ? ` • ${excludedCount} excluded` : ''}
        </p>

        <div className="bulk-preview-toolbar">
          <label className="bulk-preview-select-all">
            <input
              type="checkbox"
              checked={bulkSelectedIndices.size === editableTransactions.length && editableTransactions.length > 0}
              onChange={handleBulkSelectAll}
            />
            <span>{bulkSelectedIndices.size > 0 ? `${bulkSelectedIndices.size} selected` : 'Select rows'}</span>
          </label>
          <div className="bulk-preview-toolbar-actions">
            {bulkSelectedIndices.size > 0 && (
              <button type="button" className="bulk-preview-action-btn is-danger" onClick={handleBulkDiscardSelected}>
                <Trash2 className="w-3.5 h-3.5" /> Discard selected ({bulkSelectedIndices.size})
              </button>
            )}
            {discardedTransactionIndices.size > 0 && (
              <button type="button" className="bulk-preview-action-btn is-restore" onClick={handleBulkRestoreAll}>
                <RotateCcw className="w-3.5 h-3.5" /> Restore all ({discardedTransactionIndices.size})
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto table-wrap bulk-review-table-wrap">
          <table className="w-full text-sm bulk-review-table">
            <thead>
              <tr>
                <th className="px-2 py-2 w-8"></th>
                <th className="px-4 py-2 text-left bulk-review-col-date">Date (YYYY-MM-DD)</th>
                <th className="px-4 py-2 text-left bulk-review-col-description">Description</th>
                <th className="px-4 py-2 text-right bulk-review-col-amount">Amount</th>
                <th className="px-4 py-2 text-left bulk-review-col-type">Type</th>
                <th className="px-4 py-2 text-left bulk-review-col-category">Category</th>
                <th className="px-4 py-2 bulk-review-col-status">Review</th>
              </tr>
            </thead>
            <tbody>
              {editableTransactions.map((tx) => {
                const isDiscarded = discardedTransactionIndices.has(tx.index)

                return (
                  <tr key={tx.index} className={`bulk-review-row ${isDiscarded ? 'is-discarded' : ''}`}>
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={bulkSelectedIndices.has(tx.index)}
                        onChange={() => handleToggleBulkSelect(tx.index)}
                        disabled={isLoading}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        value={tx.date}
                        onChange={(e) => handleTransactionFieldChange(tx.index, 'date', e.target.value)}
                        className="bulk-review-input bulk-review-input-date"
                        disabled={isLoading}
                      />
                    </td>

                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={tx.description}
                        onChange={(e) => handleTransactionFieldChange(tx.index, 'description', e.target.value)}
                        className="bulk-review-input"
                        disabled={isLoading}
                      />
                    </td>

                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={tx.amount}
                        onChange={(e) => handleTransactionFieldChange(tx.index, 'amount', Number(e.target.value))}
                        className="bulk-review-input bulk-review-input-number"
                        disabled={isLoading}
                      />
                    </td>

                    <td className="px-4 py-2">
                      <select
                        value={tx.type}
                        onChange={(e) => handleTransactionFieldChange(tx.index, 'type', e.target.value as 'income' | 'expense')}
                        className="bulk-review-inline-select"
                        disabled={isLoading}
                      >
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                      </select>
                    </td>

                    <td className="px-4 py-2">
                      <select
                        value={tx.category_id || ''}
                        onChange={(e) => handleTransactionFieldChange(tx.index, 'category_id', e.target.value)}
                        className="bulk-review-inline-select"
                        disabled={isLoading}
                      >
                        <option value="">Select category</option>
                        {categoryOptions.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-4 py-2">
                      <div className="bulk-review-status-actions">
                        <button
                          type="button"
                          onClick={() => handleToggleDiscard(tx.index)}
                          disabled={isLoading}
                          className={`bulk-review-icon-action ${isDiscarded ? 'is-restore' : 'is-delete'}`}
                          aria-label={isDiscarded ? 'Restore row' : 'Discard row'}
                          title={isDiscarded ? 'Restore row' : 'Discard row'}
                        >
                          {isDiscarded ? <RotateCcw className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {reviewError ? <p className="error quick-feedback">{reviewError}</p> : null}

      <div className="quick-entry-actions">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="ghost-button"
        >
          Back
        </button>
        <button
          onClick={handleConfirm}
          disabled={isLoading}
          className="primary-button"
        >
          {isLoading ? 'Importing...' : `Import ${selectedForImportCount} Transaction${selectedForImportCount === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  )
}
