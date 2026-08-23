import { Link, useNavigate } from 'react-router-dom'
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
import { formatCompactCurrency, formatCurrency } from '../../../shared/utils/currency'
import { safeLocaleDateString } from '../../../shared/utils/importDate'
import { buildDashboardCategoryTransactionsUrl } from '../../transactions/utils/transactionUrlSync'
import { useTheme } from '../../../shared/theme/ThemeContext'
import type { CategoryData, DailyPatternData, MonthlyTrendData, ProjectionData, SpikesData } from '../types'

const chartPalette = [
  '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4',
  '#ec4899', '#84cc16', '#f97316', '#6366f1', '#eab308', '#d946ef',
  '#14b8a6', '#64748b',
]

const chartMargin = { left: 8, right: 16, top: 12, bottom: 8 }

function DashboardTooltip({ active, payload, currency }: { active?: boolean; payload?: Array<{ value?: number | string; name?: string; payload?: Record<string, unknown> }>; currency: string }) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const rawLabel = typeof payload[0]?.payload?.label === 'string'
    ? payload[0].payload.label
    : typeof payload[0]?.name === 'string'
      ? payload[0].name
      : ''

  return (
    <div className="dashboard-tooltip">
      {rawLabel ? <strong>{rawLabel}</strong> : null}
      {payload.map((item, index) => {
        const percentage = typeof item.payload?.percentage === 'number' ? item.payload.percentage : null
        const showName = payload.length > 1 && typeof item.name === 'string'
        return (
          <div key={`${item.name ?? 'value'}-${index}`}>
            {showName ? `${item.name}: ` : null}
            {formatCurrency(Number(item.value ?? 0), currency)}
            {percentage != null ? ` (${percentage.toFixed(1)}%)` : null}
          </div>
        )
      })}
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
  dashboardMonth: number
  dashboardYear: number
}

export default function DashboardCharts({
  currency,
  categoryData,
  patternData,
  spikesData,
  trendData,
  dashboardMonth,
  dashboardYear,
}: DashboardChartsProps) {
  const navigate = useNavigate()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const gridStroke = isDark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(0, 0, 0, 0.08)'
  const axisTick = { fontSize: 12, fill: isDark ? '#94a3b8' : '#6b7280' }
  const totalColor = isDark ? '#60a5fa' : '#1d4ed8'
  const avgColor = isDark ? '#fbbf24' : '#f59e0b'
  const trendColor = isDark ? '#38bdf8' : '#1d4ed8'
  const spikeColor = isDark ? '#f87171' : '#dc2626'

  const categoryChartData = categoryData.categories.map((item, index) => ({
    categoryId: item.categoryId,
    label: item.categoryName,
    value: Number(item.total),
    percentage: Number(item.percentage),
    fill: chartPalette[index % chartPalette.length],
  }))
  const patternChartData = patternData.weekPattern.map((item) => ({
    label: item.day,
    total: Number(item.total),
    average: Number(item.average),
  }))
  const spikesChartData = spikesData.spikes.map((spike) => ({
    label: safeLocaleDateString(spike.date, { month: 'short', day: 'numeric' }),
    total: Number(spike.total),
  }))
  const trendChartData = trendData.series.map((item) => ({
    label: item.label,
    total: Number(item.totalExpenses),
  }))

  return (
    <div className="dashboard-grid">
      <div className="table-wrap dashboard-card dashboard-card-chart dashboard-card-full">
        <div className="dashboard-card-header">
          <div>
            <h2>Monthly Trend</h2>
            <p className="muted">Expense trend across the last {trendData.months} months.</p>
          </div>
        </div>

        {trendChartData.length === 0 ? (
          <p className="muted">No monthly trend data available.</p>
        ) : (
          <div className="dashboard-chart-shell dashboard-chart-shell-trend">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendChartData} margin={chartMargin}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={18} tick={axisTick} />
                <YAxis tickFormatter={(value) => formatCompactCurrency(value, currency)} tickLine={false} axisLine={false} width={56} tick={axisTick} />
                <Tooltip content={<DashboardTooltip currency={currency} />} />
                <Line type="monotone" dataKey="total" stroke={trendColor} strokeWidth={3} dot={{ r: 3, fill: trendColor }} activeDot={{ r: 6 }} name="Monthly total" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="table-wrap dashboard-card dashboard-card-chart dashboard-card-full">
        <div className="dashboard-card-header">
          <div>
            <h2>Category Breakdown</h2>
            <p className="muted">Click a category to view its transactions for this month.</p>
          </div>
          <strong>{formatCurrency(categoryData.totalExpenses, currency)}</strong>
        </div>

        {categoryChartData.length === 0 ? (
          <p className="muted">No category data for the selected period.</p>
        ) : (
          <div className="dashboard-category-body">
            <div className="dashboard-chart-shell">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={68}
                    outerRadius={108}
                    paddingAngle={categoryChartData.length > 8 ? 1 : 3}
                    style={{ cursor: 'pointer' }}
                    onClick={(_, index) => {
                      const category = categoryChartData[index]
                      if (category?.categoryId) {
                        navigate(buildDashboardCategoryTransactionsUrl(category.categoryId, dashboardMonth, dashboardYear))
                      }
                    }}
                  >
                    {categoryChartData.map((entry) => (
                      <Cell key={entry.categoryId} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<DashboardTooltip currency={currency} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="dashboard-legend-list">
              {categoryChartData.map((category) => (
                <Link
                  key={category.categoryId}
                  to={buildDashboardCategoryTransactionsUrl(category.categoryId, dashboardMonth, dashboardYear)}
                  className="dashboard-legend-row dashboard-legend-link"
                  aria-label={`View ${category.label} transactions`}
                >
                  <span className="dashboard-legend-name">
                    <span className="dashboard-color-dot" style={{ backgroundColor: category.fill }} />
                    <span className="dashboard-legend-label">{category.label}</span>
                  </span>
                  <span className="dashboard-legend-stats">
                    <span>{formatCurrency(category.value, currency)}</span>
                    <span>{category.percentage.toFixed(1)}%</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="table-wrap dashboard-card dashboard-card-chart">
        <div className="dashboard-card-header">
          <div>
            <h2>Day-of-Week Pattern</h2>
            <p className="muted">Totals versus daily average across the last {patternData.days} days.</p>
          </div>
          <div className="dashboard-inline-legend" aria-hidden="true">
            <span><span className="dashboard-color-dot" style={{ backgroundColor: totalColor }} /> Total</span>
            <span><span className="dashboard-color-dot" style={{ backgroundColor: avgColor }} /> Average</span>
          </div>
        </div>

        {patternChartData.length === 0 ? (
          <p className="muted">No daily pattern data available.</p>
        ) : (
          <div className="dashboard-chart-shell dashboard-chart-shell-wide">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={patternChartData} margin={chartMargin}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} />
                <YAxis tickFormatter={(value) => formatCompactCurrency(value, currency)} tickLine={false} axisLine={false} width={56} tick={axisTick} />
                <Tooltip content={<DashboardTooltip currency={currency} />} />
                <Bar dataKey="total" fill={totalColor} radius={[8, 8, 0, 0]} name="Total" />
                <Bar dataKey="average" fill={avgColor} radius={[8, 8, 0, 0]} name="Average" />
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
                <LineChart data={spikesChartData} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={16} tick={axisTick} />
                  <YAxis tickFormatter={(value) => formatCompactCurrency(value, currency)} tickLine={false} axisLine={false} width={56} tick={axisTick} />
                  <Tooltip content={<DashboardTooltip currency={currency} />} />
                  <Line type="monotone" dataKey="total" stroke={spikeColor} strokeWidth={3} dot={{ r: 3, fill: spikeColor }} activeDot={{ r: 6 }} name="Spike total" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="dashboard-spike-list">
              {spikesData.spikes.map((spike) => (
                <div key={spike.date} className="dashboard-spike-row">
                  <span>{safeLocaleDateString(spike.date)}</span>
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
