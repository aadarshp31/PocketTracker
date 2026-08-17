import { formatCurrency } from '../../../shared/utils/currency'
import { safeLocaleDateString } from '../../../shared/utils/importDate'
import type { CategoryItem } from '../api/getCategories'
import type { Transaction } from '../types'

interface TransactionListProps {
  transactions: Transaction[]
  categories: CategoryItem[]
  categoryNames: Map<string, string>
  currency: string
  editingId: string | null
  emptyMessage: string
  showClearFilters?: boolean
  showAllTimeAction?: boolean
  isMutating?: boolean
  onEdit: (transaction: Transaction) => void
  onDelete: (transactionId: string) => void
  onCategoryChange: (transactionId: string, categoryId: string) => void
  onClearFilters?: () => void
  onShowAllTime?: () => void
}

function categoriesForType(categories: CategoryItem[], type: Transaction['type']) {
  return categories.filter((category) => category.type === type)
}

function buildRowLabel(transaction: Transaction, currency: string, categoryName: string) {
  const note = transaction.description?.trim() || 'Transaction'
  const date = safeLocaleDateString(transaction.date)
  const amount = formatCurrency(transaction.amount, currency)
  return `Edit ${note}, ${categoryName}, ${amount}, on ${date}`
}

export function TransactionList({
  transactions,
  categories,
  categoryNames,
  currency,
  editingId,
  emptyMessage,
  showClearFilters = false,
  showAllTimeAction = false,
  isMutating = false,
  onEdit,
  onDelete,
  onCategoryChange,
  onClearFilters,
  onShowAllTime,
}: TransactionListProps) {
  function handleRowActivate(transaction: Transaction) {
    if (!isMutating) onEdit(transaction)
  }

  function handleRowKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>, transaction: Transaction) {
    if (event.key !== 'Enter' && event.key !== ' ') return

    const target = event.target as HTMLElement
    if (target.closest('select, button, input, textarea, a')) return

    event.preventDefault()
    handleRowActivate(transaction)
  }

  return (
    <div className="table-wrap transaction-list-wrap">
      <table className="transaction-list-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Note</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 ? (
            <tr>
              <td colSpan={6} className="transaction-list-empty">
                <span>{emptyMessage}</span>
                <div className="transaction-list-empty-actions">
                  {showAllTimeAction && onShowAllTime ? (
                    <button type="button" className="ghost-button" onClick={onShowAllTime} disabled={isMutating}>
                      Show all time
                    </button>
                  ) : null}
                  {showClearFilters && onClearFilters ? (
                    <button type="button" className="ghost-button" onClick={onClearFilters} disabled={isMutating}>
                      Clear filters
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ) : (
            transactions.map((item) => {
              const categoryName = categoryNames.get(item.category_id) ?? 'Uncategorized'
              const rowCategories = categoriesForType(categories, item.type)

              return (
                <tr
                  key={item.id}
                  className={`transaction-list-row ${editingId === item.id ? 'is-editing' : ''}`}
                  tabIndex={0}
                  role="button"
                  aria-label={buildRowLabel(item, currency, categoryName)}
                  onClick={() => handleRowActivate(item)}
                  onKeyDown={(event) => handleRowKeyDown(event, item)}
                >
                  <td>{safeLocaleDateString(item.date)}</td>
                  <td>
                    <span className={`transaction-type-badge ${item.type === 'income' ? 'is-income' : 'is-expense'}`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="transaction-category-cell">
                    <label className="sr-only" htmlFor={`txn-row-category-${item.id}`}>
                      Category for {item.description ?? 'transaction'}
                    </label>
                    <select
                      id={`txn-row-category-${item.id}`}
                      className="transaction-inline-category"
                      value={item.category_id}
                      disabled={isMutating}
                      aria-label={`Change category for ${item.description ?? 'transaction'}`}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                      onChange={(event) => {
                        event.stopPropagation()
                        onCategoryChange(item.id, event.target.value)
                      }}
                    >
                      {rowCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{formatCurrency(item.amount, currency)}</td>
                  <td>{item.description ?? '-'}</td>
                  <td className="transaction-actions-cell">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onEdit(item)
                      }}
                      disabled={isMutating}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onDelete(item.id)
                      }}
                      disabled={isMutating}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
