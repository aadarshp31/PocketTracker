export interface InsightsMeta {
  generatedAt: string
}

export interface SummaryData {
  currentMonth: {
    month: number
    year: number
    totalExpenses: string
  }
  previousMonth: {
    month: number
    year: number
    totalExpenses: string
  }
  comparison: {
    delta: string
    percentChange: string
    trend: 'up' | 'down' | 'flat'
  }
}

export interface MonthlyTrendData {
  months: number
  series: Array<{
    month: number
    year: number
    label: string
    totalExpenses: string
  }>
}

export interface CategoryData {
  month: number
  year: number
  totalExpenses: string
  categories: Array<{
    categoryId: string
    categoryName: string
    total: string
    percentage: string
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

export interface SpikesData {
  days: number
  threshold: number
  baselineAverage: string
  spikes: Array<{
    date: string
    total: string
    ratio: string
    severity: 'high' | 'medium'
  }>
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

export interface InsightsResponse<T> {
  data: T
  meta: InsightsMeta
}
