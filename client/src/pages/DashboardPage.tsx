import { useCategories } from '../features/insights/hooks/useCategories'
import { useDailyPattern } from '../features/insights/hooks/useDailyPattern'
import { useProjection } from '../features/insights/hooks/useProjection'
import { useSpikes } from '../features/insights/hooks/useSpikes'
import { useSummary } from '../features/insights/hooks/useSummary'
import { useProfile } from '../features/profile/hooks/useProfile'
import { formatCurrency } from '../shared/utils/currency'

export function DashboardPage() {
  const profileQuery = useProfile()
  const summaryQuery = useSummary()
  const categoryQuery = useCategories({ limit: 6 })
  const patternQuery = useDailyPattern({ days: 30 })
  const spikesQuery = useSpikes({ days: 30, threshold: 2 })
  const projectionQuery = useProjection()

  const isLoading =
    profileQuery.isLoading ||
    summaryQuery.isLoading ||
    categoryQuery.isLoading ||
    patternQuery.isLoading ||
    spikesQuery.isLoading ||
    projectionQuery.isLoading

  const hasError =
    profileQuery.isError ||
    summaryQuery.isError ||
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
  const currency = profileQuery.data?.users?.[0]?.currency ?? 'INR'
  const categories = categoryQuery.data?.data.categories ?? []
  const totalCategoryExpenses = categoryQuery.data?.data.totalExpenses ?? '0.00'
  const pattern = patternQuery.data?.data.weekPattern ?? []
  const spikes = spikesQuery.data?.data.spikes ?? []
  const projection = projectionQuery.data?.data

  return (
    <section>
      <h1>Dashboard</h1>
      <p className="muted">Insights based on your authenticated transaction history.</p>

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

      <div className="table-wrap" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Category Breakdown (Expenses)</h2>
        <p>Total: <strong>{formatCurrency(totalCategoryExpenses, currency)}</strong></p>
        {categories.length === 0 ? (
          <p className="muted">No category data for the selected period.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Total</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.categoryId}>
                  <td>{category.categoryName}</td>
                  <td>{formatCurrency(category.total, currency)}</td>
                  <td>{category.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="table-wrap" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Day-of-Week Pattern (Last 30 Days)</h2>
        {pattern.length === 0 ? (
          <p className="muted">No daily pattern data available.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Transactions</th>
                <th>Total</th>
                <th>Average</th>
              </tr>
            </thead>
            <tbody>
              {pattern.map((item) => (
                <tr key={item.day}>
                  <td>{item.day}</td>
                  <td>{item.transactionCount}</td>
                  <td>{formatCurrency(item.total, currency)}</td>
                  <td>{formatCurrency(item.average, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="table-wrap" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Spending Spikes</h2>
        {spikes.length === 0 ? (
          <p className="muted">No spikes detected in the selected window.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Total</th>
                <th>Ratio vs Baseline</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {spikes.map((spike) => (
                <tr key={spike.date}>
                  <td>{new Date(spike.date).toLocaleDateString()}</td>
                  <td>{formatCurrency(spike.total, currency)}</td>
                  <td>{spike.ratio}x</td>
                  <td>{spike.severity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {projection && (
        <div className="table-wrap" style={{ padding: '1rem' }}>
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
