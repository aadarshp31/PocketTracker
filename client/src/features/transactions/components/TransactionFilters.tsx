import { useMemo } from 'react'
import type { CategoryItem } from '../api/getCategories'
import type { TransactionFilterState, PeriodPreset, SortOption, TypeFilter } from '../utils/transactionFilters'
import {
  buildFilterSummary,
  defaultTransactionFilters,
  hasActiveFilters,
} from '../utils/transactionFilters'

interface TransactionFiltersProps {
  filters: TransactionFilterState
  appliedFilters: TransactionFilterState
  categories: CategoryItem[]
  hasPendingChanges?: boolean
  disabled?: boolean
  onChange: (next: TransactionFilterState) => void
  onApply: () => void
  onResetDraft: () => void
  onClear: () => void
}

const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'last-3-months', label: 'Last 3 months' },
  { value: 'this-year', label: 'This year' },
  { value: 'all-time', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
]

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'amount-desc', label: 'Amount high to low' },
  { value: 'amount-asc', label: 'Amount low to high' },
]

export function TransactionFilters({
  filters,
  appliedFilters,
  categories,
  hasPendingChanges = false,
  disabled = false,
  onChange,
  onApply,
  onResetDraft,
  onClear,
}: TransactionFiltersProps) {
  const filteredCategories = useMemo(() => {
    if (filters.type === 'all') return categories
    return categories.filter((category) => category.type === filters.type)
  }, [categories, filters.type])

  const appliedCategoryName = categories.find((category) => category.id === appliedFilters.category_id)?.name
  const appliedSummaryParts = buildFilterSummary(appliedFilters, appliedCategoryName)
  const showAppliedSummary = hasActiveFilters(appliedFilters)

  function patch(partial: Partial<TransactionFilterState>) {
    onChange({ ...filters, ...partial })
  }

  function onTypeChange(type: TypeFilter) {
    const next: Partial<TransactionFilterState> = { type }
    if (filters.category_id) {
      const selected = categories.find((category) => category.id === filters.category_id)
      if (selected && type !== 'all' && selected.type !== type) {
        next.category_id = ''
      }
    }
    onChange({ ...filters, ...next })
  }

  return (
    <div className="table-wrap dashboard-card dashboard-filter-card transaction-filters-card">
      <div className="dashboard-card-header">
        <div>
          <h2>Browse &amp; Edit</h2>
          <p className="muted">Adjust filters, then apply to refresh the list.</p>
        </div>
      </div>

      <div className="transaction-filters-grid">
        <label className="dashboard-filter-field" htmlFor="txn-filter-period">
          <span>Period</span>
          <select
            id="txn-filter-period"
            value={filters.period}
            onChange={(event) => patch({ period: event.target.value as PeriodPreset })}
            disabled={disabled}
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {filters.period === 'custom' ? (
          <>
            <label className="dashboard-filter-field" htmlFor="txn-filter-date-from">
              <span>From</span>
              <input
                id="txn-filter-date-from"
                type="date"
                value={filters.customDateFrom}
                onChange={(event) => patch({ customDateFrom: event.target.value })}
                disabled={disabled}
              />
            </label>

            <label className="dashboard-filter-field" htmlFor="txn-filter-date-to">
              <span>To</span>
              <input
                id="txn-filter-date-to"
                type="date"
                value={filters.customDateTo}
                onChange={(event) => patch({ customDateTo: event.target.value })}
                disabled={disabled}
              />
            </label>
          </>
        ) : null}

        <label className="dashboard-filter-field" htmlFor="txn-filter-category">
          <span>Category</span>
          <select
            id="txn-filter-category"
            value={filters.category_id}
            onChange={(event) => patch({ category_id: event.target.value })}
            disabled={disabled}
          >
            <option value="">All categories</option>
            {filteredCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="dashboard-filter-field" htmlFor="txn-filter-search">
          <span>Search note</span>
          <input
            id="txn-filter-search"
            type="search"
            placeholder="Merchant or note"
            value={filters.search}
            onChange={(event) => patch({ search: event.target.value })}
            disabled={disabled}
          />
        </label>

        <label className="dashboard-filter-field" htmlFor="txn-filter-sort">
          <span>Sort</span>
          <select
            id="txn-filter-sort"
            value={filters.sort}
            onChange={(event) => patch({ sort: event.target.value as SortOption })}
            disabled={disabled}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="transaction-type-filter" role="tablist" aria-label="transaction type filter">
        {(['all', 'expense', 'income'] as TypeFilter[]).map((type) => (
          <button
            key={type}
            type="button"
            className={`type-pill ${filters.type === type ? 'is-active' : ''}`}
            onClick={() => onTypeChange(type)}
            disabled={disabled}
          >
            {type === 'all' ? 'All' : type === 'expense' ? 'Expense' : 'Income'}
          </button>
        ))}
      </div>

      <div className="transaction-filter-actions">
        <button
          type="button"
          className="primary-button"
          onClick={onApply}
          disabled={disabled || !hasPendingChanges}
        >
          Apply filters
        </button>
        <button
          type="button"
          className="ghost-button"
          onClick={onResetDraft}
          disabled={disabled || !hasPendingChanges}
        >
          Reset changes
        </button>
        <button type="button" className="ghost-button" onClick={onClear} disabled={disabled}>
          Clear filters
        </button>
      </div>

      {hasPendingChanges ? (
        <p className="transaction-filter-pending muted">You have unapplied filter changes.</p>
      ) : null}

      {showAppliedSummary ? (
        <div className="transaction-filter-summary">
          <span className="transaction-filter-summary-label">Active filters:</span>
          <span className="transaction-filter-summary-text">{appliedSummaryParts.join(' · ')}</span>
        </div>
      ) : (
        <div className="transaction-filter-summary transaction-filter-summary-viewing">
          <span className="transaction-filter-summary-label">Viewing:</span>
          <span className="transaction-filter-summary-text">{appliedSummaryParts.join(' · ')}</span>
        </div>
      )}
    </div>
  )
}

export { defaultTransactionFilters }
