import type { TransactionType } from '../types'

export type PeriodPreset =
  | 'this-month'
  | 'last-month'
  | 'last-3-months'
  | 'this-year'
  | 'all-time'
  | 'custom'

export type SortOption = 'newest' | 'oldest' | 'amount-desc' | 'amount-asc'

export type TypeFilter = 'all' | TransactionType

export interface TransactionFilterState {
  period: PeriodPreset
  customDateFrom: string
  customDateTo: string
  type: TypeFilter
  category_id: string
  search: string
  sort: SortOption
}

export const defaultTransactionFilters: TransactionFilterState = {
  period: 'this-month',
  customDateFrom: '',
  customDateTo: '',
  type: 'all',
  category_id: '',
  search: '',
  sort: 'newest',
}

function toYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function periodToDateRange(
  period: PeriodPreset,
  customDateFrom: string,
  customDateTo: string
): { dateFrom?: string; dateTo?: string } {
  const today = new Date()

  switch (period) {
    case 'this-month':
      return {
        dateFrom: toYMD(startOfMonth(today)),
        dateTo: toYMD(today),
      }
    case 'last-month': {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      return {
        dateFrom: toYMD(startOfMonth(lastMonth)),
        dateTo: toYMD(endOfMonth(lastMonth)),
      }
    }
    case 'last-3-months': {
      const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1)
      return {
        dateFrom: toYMD(startOfMonth(threeMonthsAgo)),
        dateTo: toYMD(today),
      }
    }
    case 'this-year':
      return {
        dateFrom: toYMD(new Date(today.getFullYear(), 0, 1)),
        dateTo: toYMD(today),
      }
    case 'all-time':
      return {}
    case 'custom': {
      const range: { dateFrom?: string; dateTo?: string } = {}
      if (customDateFrom) range.dateFrom = customDateFrom
      if (customDateTo) range.dateTo = customDateTo
      return range
    }
    default:
      return {}
  }
}

export function sortToApiParams(sort: SortOption): { sort: string; order: 'asc' | 'desc' } {
  switch (sort) {
    case 'oldest':
      return { sort: 'date', order: 'asc' }
    case 'amount-desc':
      return { sort: 'amount', order: 'desc' }
    case 'amount-asc':
      return { sort: 'amount', order: 'asc' }
    case 'newest':
    default:
      return { sort: 'date', order: 'desc' }
  }
}

export function filtersToApiParams(filters: TransactionFilterState) {
  const dateRange = periodToDateRange(filters.period, filters.customDateFrom, filters.customDateTo)
  const sortParams = sortToApiParams(filters.sort)

  return {
    ...dateRange,
    ...sortParams,
    ...(filters.type !== 'all' ? { type: filters.type } : {}),
    ...(filters.category_id ? { category_id: filters.category_id } : {}),
    ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
  }
}

export function hasActiveFilters(filters: TransactionFilterState): boolean {
  return (
    filters.period !== defaultTransactionFilters.period ||
    filters.type !== defaultTransactionFilters.type ||
    filters.category_id !== '' ||
    filters.search.trim() !== '' ||
    filters.sort !== defaultTransactionFilters.sort
  )
}

export function isPeriodScoped(filters: TransactionFilterState): boolean {
  return filters.period !== 'all-time'
}

export function getEmptyListMessage(filters: TransactionFilterState): string {
  if (hasActiveFilters(filters)) {
    return `No transactions match your filters for ${getPeriodLabel(filters.period).toLowerCase()}.`
  }

  if (isPeriodScoped(filters)) {
    return `No transactions in ${getPeriodLabel(filters.period).toLowerCase()}. Try All time to see your full history.`
  }

  return 'No transactions yet. Add one above or use Bulk Import.'
}

const PERIOD_LABELS: Record<PeriodPreset, string> = {
  'this-month': 'This month',
  'last-month': 'Last month',
  'last-3-months': 'Last 3 months',
  'this-year': 'This year',
  'all-time': 'All time',
  custom: 'Custom range',
}

export function getPeriodLabel(period: PeriodPreset): string {
  return PERIOD_LABELS[period]
}

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  'amount-desc': 'Amount high to low',
  'amount-asc': 'Amount low to high',
}

export function getSortLabel(sort: SortOption): string {
  return SORT_LABELS[sort]
}

export function buildFilterSummary(
  filters: TransactionFilterState,
  categoryName?: string
): string[] {
  const parts: string[] = [getPeriodLabel(filters.period)]

  if (filters.type !== 'all') {
    parts.push(filters.type === 'income' ? 'Income' : 'Expense')
  }

  if (filters.category_id && categoryName) {
    parts.push(categoryName)
  }

  if (filters.search.trim()) {
    parts.push(`"${filters.search.trim()}"`)
  }

  if (filters.sort !== defaultTransactionFilters.sort) {
    parts.push(getSortLabel(filters.sort))
  }

  return parts
}
