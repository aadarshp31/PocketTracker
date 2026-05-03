import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '../../../shared/utils/currency'
import type { CategoryData, DailyPatternData, MonthlyTrendData, ProjectionData, SpikesData } from '../types'

const chartPalette = ['#1d4ed8', '#f59e0b', '#059669', '#dc2626', '#7c3aed', '#0891b2']

function DashboardTooltip({ active, payload, currency }: { active?: boolean; payload?: Array<{ value?: number | string; name?: string; payload?: Record<string, unknown> }>; currency: string }) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const item = payload[0]
  const rawLabel = typeof item?.payload?.label === 'string'
    ? item.payload.label
    : typeof item?.name === 'string'
      ? item.name
      : ''

  return (
    <div className="dashboard-tooltip">
      {rawLabel ? <strong>{rawLabel}</strong> : null}
      <div>{formatCurrency(Number(item?.value ?? 0), currency)}</div>
    </div>
  )
}

interface DashboardChartsProps {
  currency: string
  categoryData: CategoryData
  patternData: DailyPatternData
  spikesData: SpikesData
  trendData: MonthlyTrendData
  projection?: ProjectionData
}

export default function DashboardCharts({ currency, categoryData, patternData, spikesData, trendData }: DashboardChartsProps) {
  const categoryChartData = categoryData.categories.map((category, index) => ({
    label: category.categoryName,
    value: Number(category.total),
    percentage: Number(category.percentage),
    fill: chartPalette[index % chartPalette.length],
  }))
  const patternChartData = patternData.weekPattern.map((item) => ({
    label: item.day.slice(0, 3),
    total: Number(item.total),
    average: Number(item.average),
  }))
  const spikesChartData = spikesData.spikes.map((spike) => ({
    label: new Date(spike.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    total: Number(spike.total),
  }))
  const trendChartData = trendData.series.map((item) => ({
    label: item.label,
    total: Number(item.totalExpenses),
  }))

  return (
    <div className="dashboard-grid">
      <div className="table-wrap dashboard-card dashboard-card-chart">
        <div className="dashboard-card-header">
          <div>
            <h2>Monthly Trend</h2>
            <p className="muted">Expense trend across the last {trendData.months} months.</p>
          </div>
        </div>

        {trendChartData.length === 0 ? (
          <p className="muted">No monthly trend data available.</p>
        ) : (
          <div className="dashboard-chart-shell dashboard-chart-shell-wide">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendChartData} margin={{ left: 4, right: 12, top: 12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(value) => formatCurrency(value, currency)} tickLine={false} axisLine={false} width={82} />
                <Tooltip content={<DashboardTooltip currency={currency} />} />
                <Line type="monotone" dataKey="total" stroke="#1d4ed8" strokeWidth={3} dot={{ r: 4, fill: '#1d4ed8' }} activeDot={{ r: 6 }} name="Monthly total" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="table-wrap dashboard-card dashboard-card-chart">
        <div className="dashboard-card-header">
          <div>
            <h2>Category Breakdown</h2>
            <p className="muted">Where this month's spending is going.</p>
          </div>
          <strong>{formatCurrency(categoryData.totalExpenses, currency)}</strong>
        </div>

        {categoryChartData.length === 0 ? (
          <p className="muted">No category data for the selected period.</p>
        ) : (
          <>
            <div className="dashboard-chart-shell">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={68}
                    outerRadius={108}
                    paddingAngle={3}
                  >
                    {categoryChartData.map((entry) => (
                      <Cell key={entry.label} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<DashboardTooltip currency={currency} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="dashboard-legend-list">
              {categoryChartData.map((category) => (
                <div className="dashboard-legend-row" key={category.label}>
                  <span className="dashboard-legend-name">
                    <span className="dashboard-color-dot" style={{ backgroundColor: category.fill }} />
                    {category.label}
                  </span>
                  <span>{category.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="table-wrap dashboard-card dashboard-card-chart">
        <div className="dashboard-card-header">
          <div>
            <h2>Day-of-Week Pattern</h2>
            <p className="muted">Totals versus daily average across the last {patternData.days} days.</p>
          </div>
        </div>

        {patternChartData.length === 0 ? (
          <p className="muted">No daily pattern data available.</p>
        ) : (
          <div className="dashboard-chart-shell dashboard-chart-shell-wide">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={patternChartData} margin={{ left: 4, right: 12, top: 12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(value) => formatCurrency(value, currency)} tickLine={false} axisLine={false} width={82} />
                <Tooltip content={<DashboardTooltip currency={currency} />} />
                <Bar dataKey="total" fill="#1d4ed8" radius={[8, 8, 0, 0]} name="Total" />
                <Bar dataKey="average" fill="#f59e0b" radius={[8, 8, 0, 0]} name="Average" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="table-wrap dashboard-card dashboard-card-chart">
        <div className="dashboard-card-header">
          <div>
            <h2>Spending Spikes</h2>
            <p className="muted">Dates where expenses were well above your baseline.</p>
          </div>
        </div>

        {spikesChartData.length === 0 ? (
          <p className="muted">No spikes detected in the selected window.</p>
        ) : (
          <>
            <div className="dashboard-chart-shell dashboard-chart-shell-wide">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spikesChartData} margin={{ left: 4, right: 12, top: 12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(value) => formatCurrency(value, currency)} tickLine={false} axisLine={false} width={82} />
                  <Tooltip content={<DashboardTooltip currency={currency} />} />
                  <Line type="monotone" dataKey="total" stroke="#dc2626" strokeWidth={3} dot={{ r: 4, fill: '#dc2626' }} activeDot={{ r: 6 }} name="Spike total" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="dashboard-spike-list">
              {spikesData.spikes.map((spike) => (
                <div key={spike.date} className="dashboard-spike-row">
                  <span>{new Date(spike.date).toLocaleDateString()}</span>
                  <span>{formatCurrency(spike.total, currency)}</span>
                  <span>{spike.ratio}x</span>
                  <span className={`dashboard-severity-badge is-${spike.severity}`}>{spike.severity}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}