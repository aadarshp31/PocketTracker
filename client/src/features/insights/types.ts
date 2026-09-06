export interface InsightsMeta {
  generatedAt: string
}

export interface SummaryData {
  currentMonth: {
    month: number
    year: number
    totalExpenses: string
    totalIncome: string
    totalInvestments: string
    totalTransfers: string
    savingsRate: string
  }
  previousMonth: {
    month: number
    year: number
    totalExpenses: string
    totalInvestments: string
  }
  comparison: {
    delta: string
    percentChange: string
    trend: 'up' | 'down' | 'flat'
    investmentDelta: string
  }
}

export interface MonthlyTrendData {
  months: number
  series: Array<{
    month: number
    year: number
    label: string
    totalExpenses: string
    totalIncome?: string
    totalInvestments?: string
    netCashFlow?: string
  }>
}

export interface CategoryData {
  month: number
  year: number
  totalExpenses: string
  topRiser?: {
    categoryName: string
    delta: string
    percentChange: string
  } | null
  topSaver?: {
    categoryName: string
    delta: string
    percentChange: string
  } | null
  categories: Array<{
    categoryId: string
    categoryName: string
    total: string
    percentage: string
    previousTotal?: string
    delta?: string
    percentChange?: string
  }>
}

export interface DailyPatternData {
  days: number
  weekPattern: Array<{
    day: string
    transactionCount: number
    total: string
    average: string
  }>
}

export interface SpikeTransaction {
  id: string
  description: string
  amount: string
  categoryName: string
}

export interface SpikeItem {
  date: string
  total: string
  ratio: string
  severity: 'high' | 'medium'
  topTransactions?: SpikeTransaction[]
}

export interface SpikesData {
  days: number
  threshold: number
  baselineAverage: string
  spikes: SpikeItem[]
}

export interface ProjectionData {
  month: number
  year: number
  daysElapsed: number
  daysInMonth: number
  monthToDateExpenses: string
  averagePerDay: string
  projectedMonthEndExpenses: string
}

export interface PacingDay {
  day: number
  label: string
  currentMonthCumulative: number | null
  previousMonthCumulative: number
  idealPacing?: number | null
}

export interface SpendPacingData {
  month: number
  year: number
  daysElapsed: number
  daysInMonth: number
  currentMonthToDate: string
  previousMonthAtSameDay: string
  previousMonthTotal: string
  paceDelta: string
  pacePercentChange: string
  burnRateStatus: 'under' | 'over' | 'equal'
  pacingDays: PacingDay[]
}

export interface CategoryBudgetProgress {
  budgetId: string
  categoryId: string
  categoryName: string
  budgetAmount: string
  actualSpent: string
  remaining: string
  percentageUsed: string
  status: 'ok' | 'warning' | 'exceeded'
}

export interface BudgetProgressData {
  hasBudgets: boolean
  month: number
  year: number
  totalBudgeted: string
  totalSpent: string
  overallPercentage: string
  budgets: CategoryBudgetProgress[]
}

export interface InsightsResponse<T> {
  data: T
  meta: InsightsMeta
}
