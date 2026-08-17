import type { PaginatedMeta } from '../types'

interface TransactionPaginationProps {
  meta: PaginatedMeta
  page: number
  limit: number
  disabled?: boolean
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

const LIMIT_OPTIONS = [10, 25, 50]

export function TransactionPagination({
  meta,
  page,
  limit,
  disabled = false,
  onPageChange,
  onLimitChange,
}: TransactionPaginationProps) {
  const start = meta.totalCount === 0 ? 0 : (page - 1) * limit + 1
  const end = Math.min(page * limit, meta.totalCount)
  const totalPages = meta.totalPages || 1

  return (
    <div className="transaction-pagination-bar">
      <div className="transaction-pagination-range">
        Showing {start}–{end} of {meta.totalCount} transactions
      </div>

      <label className="transaction-pagination-limit" htmlFor="txn-page-size">
        <span>Rows per page</span>
        <select
          id="txn-page-size"
          value={limit}
          onChange={(event) => onLimitChange(Number(event.target.value))}
          disabled={disabled}
        >
          {LIMIT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <div className="transaction-pagination-nav">
        <button type="button" onClick={() => onPageChange(1)} disabled={page <= 1 || disabled}>
          First
        </button>
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1 || disabled}>
          Previous
        </button>
        <span className="transaction-pagination-status">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || disabled}
        >
          Next
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages || disabled}
        >
          Last
        </button>
      </div>
    </div>
  )
}
