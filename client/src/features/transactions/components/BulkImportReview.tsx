import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, RefreshCw, RotateCcw, Trash2 } from 'lucide-react'
import { formatCurrency } from '../../../shared/utils/currency'
import { useCategories } from '../hooks/useCategories'

export interface DuplicateMatch {
  existingTransactionId: string
  existingTransaction: {
    id: string
    amount: number
    description: string
    date: string
    type: string
  }
  matchScore: number
  matchReasons: string[]
}

export interface PreviewTransaction {
  index: number
  amount: number
  description: string
  date: string
  type: 'income' | 'expense'
  category_id: string
}

export interface FlaggedDuplicate {
  newTransaction: {
    amount: number
    description: string
    date: string
    type: string
  }
  index: number
  potentialMatches: DuplicateMatch[]
  isDuplicate: boolean
}

export interface BulkImportReviewProps {
  transactions: PreviewTransaction[]
  duplicates: FlaggedDuplicate[]
  categorizedCount: number
  flaggedDuplicateCount: number
  onConfirm: (transactionsToImport: Array<{
    amount: number
    type: 'income' | 'expense'
    description: string
    date: string
    category_id: string
  }>) => void
  onBack: () => void
  isLoading?: boolean
  currency?: string
}

export function BulkImportReview({
  transactions,
  duplicates,
  categorizedCount,
  flaggedDuplicateCount,
  onConfirm,
  onBack,
  isLoading = false,
  currency = 'INR',
}: BulkImportReviewProps) {
  const [selectedDuplicateAction, setSelectedDuplicateAction] = useState<Record<number, 'skip' | 'import' | 'merge'>>({})
  const [editableTransactions, setEditableTransactions] = useState<PreviewTransaction[]>([])
  const [discardedTransactionIndices, setDiscardedTransactionIndices] = useState<Set<number>>(new Set())
  const [expandedDuplicate, setExpandedDuplicate] = useState<number | null>(null)
  const [reviewError, setReviewError] = useState('')

  const categoriesQuery = useCategories()
  const categoryOptions = categoriesQuery.data?.categories || []

  useEffect(() => {
    setEditableTransactions(transactions)
    setDiscardedTransactionIndices(new Set())
    setSelectedDuplicateAction({})
    setReviewError('')
  }, [transactions])

  const duplicateByIndex = useMemo(() => {
    const map = new Map<number, FlaggedDuplicate>()
    duplicates
      .filter((dup) => dup.potentialMatches.length > 0)
      .forEach((dup) => map.set(dup.index, dup))
    return map
  }, [duplicates])

  const handleDuplicateAction = (index: number, action: 'skip' | 'import' | 'merge') => {
    setSelectedDuplicateAction((prev) => ({
      ...prev,
      [index]: action,
    }))
  }

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

  const isRowIncluded = (txIndex: number) => {
    if (discardedTransactionIndices.has(txIndex)) return false

    const duplicate = duplicateByIndex.get(txIndex)
    if (!duplicate) return true

    const action = selectedDuplicateAction[txIndex]
    return action !== 'skip'
  }

  const rowStatusClassName = (txIndex: number) => {
    if (discardedTransactionIndices.has(txIndex)) return 'is-discarded'

    const duplicate = duplicateByIndex.get(txIndex)
    if (duplicate && selectedDuplicateAction[txIndex] === 'skip') return 'is-skipped'

    if (duplicate) return 'is-duplicate'
    return ''
  }

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
      const parsedDate = new Date(tx.date)
      return (
        !tx.description ||
        !tx.category_id ||
        Number.isNaN(tx.amount) ||
        tx.amount <= 0 ||
        Number.isNaN(parsedDate.getTime()) ||
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
        <div className="bulk-review-stat-card is-duplicates">
          <p className="bulk-review-stat-label">Potential Duplicates</p>
          <p className="bulk-review-stat-value">{flaggedDuplicateCount}</p>
        </div>
      </div>

      <div className="bulk-review-section">
        <div className="bulk-review-section-header">
          <h3>Transactions for Import</h3>
          <p>Edit values, use date as YYYY-MM-DD, and exclude only rows you do not want to import.</p>
        </div>

        <p className="bulk-review-meta-hint">
          {selectedForImportCount} selected for import{excludedCount > 0 ? ` • ${excludedCount} excluded` : ''}
        </p>

        <div className="overflow-x-auto table-wrap bulk-review-table-wrap">
          <table className="w-full text-sm bulk-review-table">
            <thead>
              <tr>
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
                const duplicate = duplicateByIndex.get(tx.index)
                const action = selectedDuplicateAction[tx.index]
                const isDiscarded = discardedTransactionIndices.has(tx.index)
                const hasDuplicate = Boolean(duplicate?.potentialMatches.length)

                return (
                  <tr key={tx.index} className={`bulk-review-row ${rowStatusClassName(tx.index)}`}>
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
                        {hasDuplicate ? (
                          <div className="bulk-review-duplicate-action">
                            <AlertCircle className="w-4 h-4 text-yellow-600" />
                            <select
                              value={action || 'import'}
                              onChange={(e) => handleDuplicateAction(tx.index, e.target.value as 'skip' | 'import' | 'merge')}
                              disabled={isLoading || isDiscarded}
                              className="bulk-review-inline-select"
                            >
                              <option value="import">Import</option>
                              <option value="skip">Skip</option>
                              <option value="merge">Merge</option>
                            </select>
                          </div>
                        ) : null}

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

      {flaggedDuplicateCount > 0 && (
        <div className="bulk-review-section">
          <h3 className="bulk-review-duplicates-title">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            Potential Duplicates ({flaggedDuplicateCount})
          </h3>
          <div className="bulk-review-duplicates-list">
            {duplicates
              .filter((dup) => dup.potentialMatches.length > 0)
              .map((duplicate) => (
                <div key={duplicate.index} className="bulk-review-duplicate-card">
                  <div
                    className="bulk-review-duplicate-header"
                    onClick={() => setExpandedDuplicate(
                      expandedDuplicate === duplicate.index ? null : duplicate.index,
                    )}
                  >
                    <div>
                      <p className="font-medium">{duplicate.newTransaction.description}</p>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(duplicate.newTransaction.amount, currency)} on {duplicate.newTransaction.date}
                      </p>
                    </div>
                    <RefreshCw className={`w-5 h-5 text-yellow-600 transition ${
                      expandedDuplicate === duplicate.index ? 'rotate-180' : ''
                    }`}
                    />
                  </div>

                  {expandedDuplicate === duplicate.index && (
                    <div className="bulk-review-duplicate-details">
                      <p className="bulk-review-match-label">Potential Matches:</p>
                      {duplicate.potentialMatches.slice(0, 3).map((match, idx) => (
                        <div key={idx} className="bulk-review-match-card">
                          <div className="bulk-review-match-header">
                            <div>
                              <p className="font-medium">{match.existingTransaction.description}</p>
                              <p className="text-sm text-gray-600">
                                {formatCurrency(match.existingTransaction.amount, currency)} on {match.existingTransaction.date}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-blue-600">
                                {Math.round(match.matchScore * 100)}% match
                              </p>
                            </div>
                          </div>
                          <div className="bulk-review-match-reasons">
                            {match.matchReasons.map((reason, ridx) => (
                              <span
                                key={ridx}
                                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                              >
                                {reason}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

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
