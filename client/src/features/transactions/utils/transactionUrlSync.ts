import type { TransactionFilterState, PeriodPreset, SortOption, TypeFilter } from './transactionFilters'
import { defaultTransactionFilters } from './transactionFilters'

const PERIOD_VALUES = new Set<PeriodPreset>([
  'this-month',
  'last-month',
  'last-3-months',
  'this-year',
  'all-time',
  'custom',
])

const SORT_VALUES = new Set<SortOption>(['newest', 'oldest', 'amount-desc', 'amount-asc'])
const TYPE_VALUES = new Set<TypeFilter>(['all', 'income', 'expense'])
const LIMIT_VALUES = new Set([10, 25, 50])

function parsePeriod(value: string | null): PeriodPreset {
  if (value && PERIOD_VALUES.has(value as PeriodPreset)) {
    return value as PeriodPreset
  }
  return defaultTransactionFilters.period
}

function parseSort(value: string | null): SortOption {
  if (value && SORT_VALUES.has(value as SortOption)) {
    return value as SortOption
  }
  return defaultTransactionFilters.sort
}

function parseType(value: string | null): TypeFilter {
  if (value && TYPE_VALUES.has(value as TypeFilter)) {
    return value as TypeFilter
  }
  return defaultTransactionFilters.type
}

export interface TransactionUrlState {
  filters: TransactionFilterState
  page: number
  limit: number
}

export function parseTransactionUrlState(searchParams: URLSearchParams): TransactionUrlState {
  const pageRaw = Number.parseInt(searchParams.get('page') ?? '1', 10)
  const limitRaw = Number.parseInt(searchParams.get('limit') ?? '25', 10)

  return {
    filters: {
      period: parsePeriod(searchParams.get('period')),
      customDateFrom: searchParams.get('from') ?? '',
      customDateTo: searchParams.get('to') ?? '',
      type: parseType(searchParams.get('type')),
      category_id: searchParams.get('category') ?? '',
      search: searchParams.get('search') ?? '',
      sort: parseSort(searchParams.get('sort')),
    },
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
    limit: LIMIT_VALUES.has(limitRaw as 10 | 25 | 50) ? limitRaw : 25,
  }
}

export function buildTransactionSearchParams(
  filters: TransactionFilterState,
  page: number,
  limit: number,
  debouncedSearch: string
): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.period !== defaultTransactionFilters.period) {
    params.set('period', filters.period)
  }

  if (filters.period === 'custom') {
    if (filters.customDateFrom) params.set('from', filters.customDateFrom)
    if (filters.customDateTo) params.set('to', filters.customDateTo)
  }

  if (filters.type !== defaultTransactionFilters.type) {
    params.set('type', filters.type)
  }

  if (filters.category_id) {
    params.set('category', filters.category_id)
  }

  if (debouncedSearch.trim()) {
    params.set('search', debouncedSearch.trim())
  }

  if (filters.sort !== defaultTransactionFilters.sort) {
    params.set('sort', filters.sort)
  }

  if (page > 1) {
    params.set('page', String(page))
  }

  if (limit !== 25) {
    params.set('limit', String(limit))
  }

  return params
}

export function buildDashboardCategoryTransactionsUrl(categoryId: string, month: number, year: number): string {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const params = new URLSearchParams({
    period: 'custom',
    from,
    to,
    category: categoryId,
    type: 'expense',
  })

  return `/transactions?${params.toString()}`
}
