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
  const [selectedMonth, setSelectedMonth] = useState(today.getUTCMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(today.getUTCFullYear())

  const periodParams = useMemo(
    () => ({ month: selectedMonth, year: selectedYear }),
    [selectedMonth, selectedYear]
  )
  const yearOptions = useMemo(() => {
    const currentYear = today.getUTCFullYear()
    return Array.from({ length: 4 }, (_, index) => currentYear - index)
  }, [today])

  const profileQuery = useProfile()
  const summaryQuery = useSummary(periodParams)
  const trendQuery = useMonthlyTrend({ months: 6, ...periodParams })
  const categoryQuery = useCategories({ limit: 6, ...periodParams })
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
        <div className="table-wrap" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Monthly Summary</h2>
          <div
            style={{
              display: 'grid',
              gap: '0.75rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            }}
          >
            <div style={{ border: '1px solid #f3f4f6', borderRadius: '0.5rem', padding: '0.75rem' }}>
              <p className="muted" style={{ margin: 0 }}>Current Month</p>
              <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                {formatCurrency(summary.currentMonth.totalExpenses, currency)}
              </p>
            </div>
            <div style={{ border: '1px solid #f3f4f6', borderRadius: '0.5rem', padding: '0.75rem' }}>
              <p className="muted" style={{ margin: 0 }}>Previous Month</p>
              <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                {formatCurrency(summary.previousMonth.totalExpenses, currency)}
              </p>
            </div>
            <div style={{ border: '1px solid #f3f4f6', borderRadius: '0.5rem', padding: '0.75rem' }}>
              <p className="muted" style={{ margin: 0 }}>Delta</p>
              <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                {formatCurrency(summary.comparison.delta, currency)}
              </p>
              <p style={{ margin: 0 }}>
                {summary.comparison.percentChange}% / {summary.comparison.trend}
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
          />
        </Suspense>
      ) : null}

      {projection && (
        <div className="table-wrap dashboard-card" style={{ padding: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>End-of-Month Projection</h2>
          <p style={{ margin: 0 }}>
            Month-to-date: <strong>{formatCurrency(projection.monthToDateExpenses, currency)}</strong>
          </p>
          <p style={{ margin: 0 }}>
            Avg/day: <strong>{formatCurrency(projection.averagePerDay, currency)}</strong>
          </p>
          <p style={{ margin: 0 }}>
            Projected total: <strong>{formatCurrency(projection.projectedMonthEndExpenses, currency)}</strong>
          </p>
        </div>
      )}
    </section>
  )
}
