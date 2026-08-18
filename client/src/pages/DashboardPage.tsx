import { Suspense, lazy } from 'react'
import { useMemo, useState } from 'react'
import { useCategories } from '../features/insights/hooks/useCategories'
import { useDailyPattern } from '../features/insights/hooks/useDailyPattern'
import { useMonthlyTrend } from '../features/insights/hooks/useMonthlyTrend'
import { useProjection } from '../features/insights/hooks/useProjection'
import { useSpikes } from '../features/insights/hooks/useSpikes'
import { useSummary } from '../features/insights/hooks/useSummary'
import { useProfile } from '../features/profile/hooks/useProfile'
import { formatCurrency } from '../shared/utils/currency'

const DashboardCharts = lazy(() => import('../features/insights/components/DashboardCharts'))

export function DashboardPage() {
  const today = new Date()
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())

  const periodParams = useMemo(
    () => ({ month: selectedMonth, year: selectedYear }),
    [selectedMonth, selectedYear]
  )
  const yearOptions = useMemo(() => {
    const currentYear = today.getFullYear()
    return Array.from({ length: 4 }, (_, index) => currentYear - index)
  }, [today])

  const profileQuery = useProfile()
  const summaryQuery = useSummary(periodParams)
  const trendQuery = useMonthlyTrend({ months: 12, ...periodParams })
  const categoryQuery = useCategories({ limit: 50, ...periodParams })
  const patternQuery = useDailyPattern({ days: 30 })
  const spikesQuery = useSpikes({ days: 30, threshold: 2 })
  const projectionQuery = useProjection(periodParams)

  const isLoading =
    profileQuery.isLoading ||
    summaryQuery.isLoading ||
    trendQuery.isLoading ||
    categoryQuery.isLoading ||
    patternQuery.isLoading ||
    spikesQuery.isLoading ||
    projectionQuery.isLoading

  const hasError =
    profileQuery.isError ||
    summaryQuery.isError ||
    trendQuery.isError ||
    categoryQuery.isError ||
    patternQuery.isError ||
    spikesQuery.isError ||
    projectionQuery.isError

  if (isLoading) {
    return (
      <section>
        <h1>Dashboard</h1>
        <p>Loading insights...</p>
      </section>
    )
  }

  if (hasError) {
    return (
      <section>
        <h1>Dashboard</h1>
        <p className="error">Failed to load insights.</p>
      </section>
    )
  }

  const summary = summaryQuery.data?.data
  const trend = trendQuery.data?.data
  const categories = categoryQuery.data?.data
  const pattern = patternQuery.data?.data
  const spikes = spikesQuery.data?.data
  const projection = projectionQuery.data?.data
  const currency = profileQuery.data?.users?.[0]?.currency ?? 'INR'

  return (
    <section className="dashboard-page">
      <h1>Dashboard</h1>
      <p className="muted">Insights based on your authenticated transaction history.</p>

      <div className="table-wrap dashboard-card dashboard-filter-card">
        <div className="dashboard-card-header">
          <div>
            <h2>Time Window</h2>
            <p className="muted">Switch the reporting month for summary, category mix, trend, and projection.</p>
          </div>
        </div>
        <div className="dashboard-filter-grid">
          <label className="dashboard-filter-field" htmlFor="dashboard-month">
            <span>Month</span>
            <select
              id="dashboard-month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(Number(event.target.value))}
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                <option key={month} value={month}>
                  {new Date(Date.UTC(2026, month - 1, 1)).toLocaleString(undefined, { month: 'long', timeZone: 'UTC' })}
                </option>
              ))}
            </select>
          </label>

          <label className="dashboard-filter-field" htmlFor="dashboard-year">
            <span>Year</span>
            <select
              id="dashboard-year"
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {summary && (
        <div className="table-wrap dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h2>Monthly Summary</h2>
              <p className="muted">Selected month versus the previous month.</p>
            </div>
          </div>
          <div className="dashboard-summary-grid">
            <div className="dashboard-stat">
              <p className="muted">Current Month</p>
              <p className="dashboard-stat-value">{formatCurrency(summary.currentMonth.totalExpenses, currency)}</p>
            </div>
            <div className="dashboard-stat">
              <p className="muted">Previous Month</p>
              <p className="dashboard-stat-value">{formatCurrency(summary.previousMonth.totalExpenses, currency)}</p>
            </div>
            <div className="dashboard-stat">
              <p className="muted">Delta</p>
              <p className={`dashboard-stat-value is-trend-${summary.comparison.trend}`}>
                {formatCurrency(summary.comparison.delta, currency)}
              </p>
              <p className="dashboard-stat-meta">
                {summary.comparison.percentChange}% · {summary.comparison.trend}
              </p>
            </div>
          </div>
        </div>
      )}

      {trend && categories && pattern && spikes ? (
        <Suspense fallback={<div className="table-wrap dashboard-card"><p className="muted">Loading charts...</p></div>}>
          <DashboardCharts
            currency={currency}
            trendData={trend}
            categoryData={categories}
            patternData={pattern}
            spikesData={spikes}
            projection={projection}
            dashboardMonth={selectedMonth}
            dashboardYear={selectedYear}
          />
        </Suspense>
      ) : null}

      {projection && (
        <div className="table-wrap dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h2>End-of-Month Projection</h2>
              <p className="muted">Estimated spend if the current daily average continues.</p>
            </div>
          </div>
          <div className="dashboard-summary-grid">
            <div className="dashboard-stat">
              <p className="muted">Month-to-date</p>
              <p className="dashboard-stat-value">{formatCurrency(projection.monthToDateExpenses, currency)}</p>
            </div>
            <div className="dashboard-stat">
              <p className="muted">Avg / day</p>
              <p className="dashboard-stat-value">{formatCurrency(projection.averagePerDay, currency)}</p>
            </div>
            <div className="dashboard-stat">
              <p className="muted">Projected total</p>
              <p className="dashboard-stat-value">{formatCurrency(projection.projectedMonthEndExpenses, currency)}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
