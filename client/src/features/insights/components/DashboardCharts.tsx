import { Link, useNavigate } from 'react-router-dom';
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
	YAxis
} from 'recharts';
import {
	formatCompactCurrency,
	formatCurrency
} from '../../../shared/utils/currency';
import { safeLocaleDateString } from '../../../shared/utils/importDate';
import { buildDashboardCategoryTransactionsUrl } from '../../transactions/utils/transactionUrlSync';
import { useTheme } from '../../../shared/theme/ThemeContext';
import type {
	BudgetProgressData,
	CategoryData,
	DailyPatternData,
	MonthlyTrendData,
	ProjectionData,
	SpendPacingData,
	SpikesData
} from '../types';

const chartPalette = [
	'#10b981',
	'#f59e0b',
	'#3b82f6',
	'#ef4444',
	'#8b5cf6',
	'#06b6d4',
	'#ec4899',
	'#84cc16',
	'#f97316',
	'#6366f1',
	'#eab308',
	'#d946ef',
	'#14b8a6',
	'#64748b'
];

const chartMargin = { left: 8, right: 16, top: 12, bottom: 8 };

function DashboardTooltip({
	active,
	payload,
	currency
}: {
	active?: boolean;
	payload?: Array<{
		value?: number | string | null;
		name?: string;
		payload?: Record<string, unknown>;
	}>;
	currency: string;
}) {
	if (!active || !payload || payload.length === 0) {
		return null;
	}

	const rawLabel =
		typeof payload[0]?.payload?.label === 'string'
			? payload[0].payload.label
			: typeof payload[0]?.name === 'string'
				? payload[0].name
				: '';

	return (
		<div className='dashboard-tooltip'>
			{rawLabel ? <strong>{rawLabel}</strong> : null}
			{payload.map((item, index) => {
				if (item.value == null) return null;
				const percentage =
					typeof item.payload?.percentage === 'number'
						? item.payload.percentage
						: null;
				const showName = payload.length > 1 && typeof item.name === 'string';
				return (
					<div key={`${item.name ?? 'value'}-${index}`}>
						{showName ? `${item.name}: ` : null}
						{formatCurrency(Number(item.value ?? 0), currency)}
						{percentage != null ? ` (${percentage.toFixed(1)}%)` : null}
					</div>
				);
			})}
		</div>
	);
}

interface DashboardChartsProps {
	currency: string;
	categoryData: CategoryData;
	trendData: MonthlyTrendData;
	pacingData?: SpendPacingData;
	budgetData?: BudgetProgressData;
	spikesData?: SpikesData;
	patternData?: DailyPatternData;
	projection?: ProjectionData;
	dashboardMonth: number;
	dashboardYear: number;
}

export default function DashboardCharts({
	currency,
	categoryData,
	trendData,
	pacingData,
	budgetData,
	spikesData,
	dashboardMonth,
	dashboardYear
}: DashboardChartsProps) {
	const navigate = useNavigate();
	const { resolvedTheme } = useTheme();
	const isDark = resolvedTheme === 'dark';

	const gridStroke = isDark
		? 'rgba(255, 255, 255, 0.09)'
		: 'rgba(0, 0, 0, 0.08)';
	const axisTick = { fontSize: 12, fill: isDark ? '#94a3b8' : '#6b7280' };

	// ── 1. Cash Flow Data ──
	const cashFlowChartData = trendData.series.map((item) => {
		const income = Number(item.totalIncome ?? 0);
		const expenses = Number(item.totalExpenses ?? 0);
		const investments = Number(item.totalInvestments ?? 0);
		const netFlow = Number(item.netCashFlow ?? income - expenses - investments);

		return {
			label: item.label,
			Income: income,
			Spend: expenses,
			Invested: investments,
			'Net Flow': netFlow
		};
	});

	// ── 2. Spend Pacing Data ──
	const pacingChartData =
		pacingData?.pacingDays.map((p) => ({
			label: `Day ${p.day}`,
			day: p.day,
			'This Month': p.currentMonthCumulative,
			'Last Month': p.previousMonthCumulative,
			'Benchmark Pace': p.idealPacing ?? null
		})) ?? [];

	// ── 3. Category Donut Data with Smart Consolidation ──
	const allCategories = categoryData.categories;
	let donutChartData: Array<{
		categoryId?: string;
		label: string;
		value: number;
		percentage: number;
		fill: string;
	}> = [];

	if (allCategories.length > 7) {
		const topCategories = allCategories.slice(0, 6);
		const otherCategories = allCategories.slice(6);
		const otherTotal = otherCategories.reduce(
			(acc, c) => acc + Number(c.total),
			0
		);
		const totalExpensesNum = Number(categoryData.totalExpenses) || 1;
		const otherPercentage = (otherTotal / totalExpensesNum) * 100;

		donutChartData = [
			...topCategories.map((item, index) => ({
				categoryId: item.categoryId,
				label: item.categoryName,
				value: Number(item.total),
				percentage: Number(item.percentage),
				fill: chartPalette[index % chartPalette.length]
			})),
			{
				categoryId: undefined,
				label: `Other (${otherCategories.length} categories)`,
				value: otherTotal,
				percentage: otherPercentage,
				fill: '#94a3b8'
			}
		];
	} else {
		donutChartData = allCategories.map((item, index) => ({
			categoryId: item.categoryId,
			label: item.categoryName,
			value: Number(item.total),
			percentage: Number(item.percentage),
			fill: chartPalette[index % chartPalette.length]
		}));
	}

	// ── 4. Spikes Data ──
	const spikesList = spikesData?.spikes ?? [];

	return (
		<div className='dashboard-grid'>
			{/* ── 1. Monthly Cash Flow (Multi-Stream) ── */}
			<div className='table-wrap dashboard-card dashboard-card-chart dashboard-card-full'>
				<div className='dashboard-card-header'>
					<div>
						<h2>Monthly Cash Flow</h2>
						<p className='muted'>
							Income, spend, investments, and net flow across the last{' '}
							{trendData.months} months.
						</p>
					</div>
					<div className='dashboard-inline-legend' aria-hidden='true'>
						<span>
							<span
								className='dashboard-color-dot'
								style={{ backgroundColor: '#10b981' }}
							/>{' '}
							Income
						</span>
						<span>
							<span
								className='dashboard-color-dot'
								style={{ backgroundColor: '#ef4444' }}
							/>{' '}
							True Spend
						</span>
						<span>
							<span
								className='dashboard-color-dot'
								style={{ backgroundColor: '#3b82f6' }}
							/>{' '}
							Invested
						</span>
						<span>
							<span
								className='dashboard-color-dot'
								style={{ backgroundColor: '#8b5cf6' }}
							/>{' '}
							Net Flow
						</span>
					</div>
				</div>

				{cashFlowChartData.length === 0 ? (
					<p className='muted'>No cash flow trend data available.</p>
				) : (
					<div className='dashboard-chart-shell dashboard-chart-shell-trend'>
						<ResponsiveContainer width='100%' height='100%'>
							<BarChart data={cashFlowChartData} margin={chartMargin}>
								<CartesianGrid
									strokeDasharray='3 3'
									stroke={gridStroke}
									vertical={false}
								/>
								<XAxis
									dataKey='label'
									tickLine={false}
									axisLine={false}
									interval='preserveStartEnd'
									minTickGap={18}
									tick={axisTick}
								/>
								<YAxis
									tickFormatter={(value) =>
										formatCompactCurrency(value, currency)
									}
									tickLine={false}
									axisLine={false}
									width={56}
									tick={axisTick}
								/>
								<Tooltip content={<DashboardTooltip currency={currency} />} />
								<Bar
									dataKey='Income'
									fill='#10b981'
									radius={[4, 4, 0, 0]}
									name='Income'
								/>
								<Bar
									dataKey='Spend'
									fill='#ef4444'
									radius={[4, 4, 0, 0]}
									name='True Spend'
								/>
								<Bar
									dataKey='Invested'
									fill='#3b82f6'
									radius={[4, 4, 0, 0]}
									name='Invested & Saved'
								/>
								<Line
									type='monotone'
									dataKey='Net Flow'
									stroke='#8b5cf6'
									strokeWidth={2.5}
									dot={{ r: 3, fill: '#8b5cf6' }}
									name='Net Flow'
								/>
							</BarChart>
						</ResponsiveContainer>
					</div>
				)}
			</div>

			{/* ── 2. Monthly Spend Pacing / Burn Rate Curve ── */}
			{pacingData && (
				<div className='table-wrap dashboard-card dashboard-card-chart dashboard-card-full'>
					<div className='dashboard-card-header'>
						<div>
							<div className='dashboard-title-row'>
								<h2>Monthly Spend Pacing</h2>
								{pacingData.burnRateStatus === 'under' && (
									<span className='dashboard-pacing-badge is-good'>
										🟢 Spending{' '}
										{Math.abs(Number(pacingData.pacePercentChange)).toFixed(1)}%
										slower than last month at Day {pacingData.daysElapsed}
									</span>
								)}
								{pacingData.burnRateStatus === 'over' && (
									<span className='dashboard-pacing-badge is-bad'>
										🔴 Spending{' '}
										{Math.abs(Number(pacingData.pacePercentChange)).toFixed(1)}%
										faster than last month at Day {pacingData.daysElapsed}
									</span>
								)}
								{pacingData.burnRateStatus === 'equal' && (
									<span className='dashboard-pacing-badge is-neutral'>
										⚪ On par with last month's pace at Day{' '}
										{pacingData.daysElapsed}
									</span>
								)}
							</div>
							<p className='muted'>
								Cumulative month-to-date spending vs same calendar point last
								month.
							</p>
						</div>
						<div className='dashboard-inline-legend' aria-hidden='true'>
							<span>
								<span className='dashboard-color-line is-solid' /> This Month
							</span>
							<span>
								<span className='dashboard-color-line is-dashed' /> Last Month
							</span>
						</div>
					</div>

					<div className='dashboard-chart-shell dashboard-chart-shell-wide'>
						<ResponsiveContainer width='100%' height='100%'>
							<LineChart data={pacingChartData} margin={chartMargin}>
								<CartesianGrid
									strokeDasharray='3 3'
									stroke={gridStroke}
									vertical={false}
								/>
								<XAxis
									dataKey='label'
									tickLine={false}
									axisLine={false}
									interval={4}
									tick={axisTick}
								/>
								<YAxis
									tickFormatter={(value) =>
										formatCompactCurrency(value, currency)
									}
									tickLine={false}
									axisLine={false}
									width={56}
									tick={axisTick}
								/>
								<Tooltip content={<DashboardTooltip currency={currency} />} />
								<Line
									type='monotone'
									dataKey='This Month'
									stroke={isDark ? '#38bdf8' : '#0284c7'}
									strokeWidth={3}
									dot={{ r: 2 }}
									activeDot={{ r: 6 }}
									connectNulls={false}
									name='This Month'
								/>
								<Line
									type='monotone'
									dataKey='Last Month'
									stroke={isDark ? '#94a3b8' : '#64748b'}
									strokeWidth={2}
									strokeDasharray='5 5'
									dot={false}
									name='Last Month'
								/>
							</LineChart>
						</ResponsiveContainer>
					</div>
				</div>
			)}

			{/* ── 3. Category Breakdown & Velocity ── */}
			<div className='table-wrap dashboard-card dashboard-card-chart dashboard-card-full'>
				<div className='dashboard-card-header'>
					<div>
						<h2>Category Breakdown & Velocity</h2>
						<p className='muted'>
							Click any category to filter transactions for this month.
						</p>
					</div>
					<strong>
						{formatCurrency(categoryData.totalExpenses, currency)}
					</strong>
				</div>

				{/* Month-over-Month Velocity Callouts */}
				{(categoryData.topRiser || categoryData.topSaver) && (
					<div className='dashboard-velocity-row'>
						{categoryData.topRiser && (
							<div className='dashboard-velocity-pill is-riser'>
								<span className='velocity-icon'>📈</span>
								<span className='velocity-text'>
									Highest Jump:{' '}
									<strong>{categoryData.topRiser.categoryName}</strong> (+
									{formatCurrency(categoryData.topRiser.delta, currency)} · +
									{categoryData.topRiser.percentChange}%)
								</span>
							</div>
						)}
						{categoryData.topSaver && (
							<div className='dashboard-velocity-pill is-saver'>
								<span className='velocity-icon'>📉</span>
								<span className='velocity-text'>
									Highest Saving:{' '}
									<strong>{categoryData.topSaver.categoryName}</strong> (-
									{formatCurrency(categoryData.topSaver.delta, currency)} · -
									{categoryData.topSaver.percentChange}%)
								</span>
							</div>
						)}
					</div>
				)}

				{donutChartData.length === 0 ? (
					<p className='muted'>No category data for the selected period.</p>
				) : (
					<div className='dashboard-category-body'>
						<div className='dashboard-chart-shell'>
							<ResponsiveContainer width='100%' height='100%'>
								<PieChart>
									<Pie
										data={donutChartData}
										dataKey='value'
										nameKey='label'
										innerRadius={68}
										outerRadius={108}
										paddingAngle={donutChartData.length > 8 ? 1 : 3}
										style={{ cursor: 'pointer' }}
										onClick={(_, index) => {
											const category = donutChartData[index];
											if (category?.categoryId) {
												navigate(
													buildDashboardCategoryTransactionsUrl(
														category.categoryId,
														dashboardMonth,
														dashboardYear
													)
												);
											}
										}}
									>
										{donutChartData.map((entry, index) => (
											<Cell
												key={entry.categoryId ?? `other-${index}`}
												fill={entry.fill}
											/>
										))}
									</Pie>
									<Tooltip content={<DashboardTooltip currency={currency} />} />
								</PieChart>
							</ResponsiveContainer>
						</div>

						<div className='dashboard-legend-list'>
							{allCategories.map((category, index) => (
								<Link
									key={category.categoryId}
									to={buildDashboardCategoryTransactionsUrl(
										category.categoryId,
										dashboardMonth,
										dashboardYear
									)}
									className='dashboard-legend-row dashboard-legend-link'
									aria-label={`View ${category.categoryName} transactions`}
								>
									<span className='dashboard-legend-name'>
										<span
											className='dashboard-color-dot'
											style={{
												backgroundColor:
													chartPalette[index % chartPalette.length]
											}}
										/>
										<span className='dashboard-legend-label'>
											{category.categoryName}
										</span>
									</span>
									<span className='dashboard-legend-stats'>
										<span>{formatCurrency(category.total, currency)}</span>
										<span>{Number(category.percentage).toFixed(1)}%</span>
									</span>
								</Link>
							))}
						</div>
					</div>
				)}
			</div>

			{/* ── 4. Category Budget Health ── */}
			<div className='table-wrap dashboard-card dashboard-card-chart'>
				<div className='dashboard-card-header'>
					<div>
						<h2>Category Budget Health</h2>
						<p className='muted'>Track spend vs active monthly limits.</p>
					</div>
					{budgetData?.hasBudgets && (
						<span className='dashboard-budget-meta'>
							{formatCurrency(budgetData.totalSpent, currency)} /{' '}
							{formatCurrency(budgetData.totalBudgeted, currency)} (
							{Number(budgetData.overallPercentage).toFixed(0)}%)
						</span>
					)}
				</div>

				{!budgetData?.hasBudgets || budgetData.budgets.length === 0 ? (
					<div className='dashboard-empty-budget'>
						<p className='muted'>No category budgets active for this month.</p>
						<p className='dashboard-empty-hint'>
							Set category limits to keep your discretionary spending in check.
						</p>
					</div>
				) : (
					<div className='dashboard-budget-list'>
						{budgetData.budgets.map((b) => {
							const pct = Math.min(Number(b.percentageUsed), 100);
							return (
								<div key={b.budgetId} className='dashboard-budget-item'>
									<div className='dashboard-budget-row-header'>
										<span className='dashboard-budget-name'>
											{b.categoryName}
										</span>
										<span className='dashboard-budget-numbers'>
											{formatCurrency(b.actualSpent, currency)} of{' '}
											{formatCurrency(b.budgetAmount, currency)}
										</span>
									</div>
									<div className='dashboard-budget-bar-track'>
										<div
											className={`dashboard-budget-bar-fill is-${b.status}`}
											style={{ width: `${pct}%` }}
										/>
									</div>
									<div className='dashboard-budget-row-footer'>
										<span
											className={`dashboard-budget-status-tag is-${b.status}`}
										>
											{Number(b.percentageUsed).toFixed(0)}% used
										</span>
										<span className='dashboard-budget-remaining'>
											{Number(b.remaining) >= 0
												? `${formatCurrency(b.remaining, currency)} left`
												: `${formatCurrency(Math.abs(Number(b.remaining)), currency)} over`}
										</span>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* ── 5. Unusual Spending & High-Spend Events ── */}
			<div className='table-wrap dashboard-card dashboard-card-chart'>
				<div className='dashboard-card-header'>
					<div>
						<h2>Unusual Spending Days</h2>
						<p className='muted'>
							Dates exceeding {spikesData?.threshold ?? 2}x your baseline daily
							average.
						</p>
					</div>
				</div>

				{spikesList.length === 0 ? (
					<p className='muted'>
						No unusual spending spikes detected in the selected window.
					</p>
				) : (
					<div className='dashboard-anomalies-list'>
						{spikesList.map((spike) => (
							<div key={spike.date} className='dashboard-anomaly-card'>
								<div className='dashboard-anomaly-header'>
									<div className='dashboard-anomaly-date'>
										<strong>
											{safeLocaleDateString(spike.date, {
												month: 'short',
												day: 'numeric',
												year: 'numeric'
											})}
										</strong>
										<span
											className={`dashboard-severity-badge is-${spike.severity}`}
										>
											{spike.ratio}x baseline
										</span>
									</div>
									<span className='dashboard-anomaly-total'>
										{formatCurrency(spike.total, currency)}
									</span>
								</div>

								{spike.topTransactions && spike.topTransactions.length > 0 && (
									<div className='dashboard-anomaly-txs'>
										<span className='anomaly-tx-label'>Top Transactions:</span>
										<div className='anomaly-tx-chips'>
											{spike.topTransactions.map((tx) => (
												<div key={tx.id} className='anomaly-tx-chip'>
													<span className='tx-desc'>{tx.description}</span>
													<span className='tx-cat'>{tx.categoryName}</span>
													<span className='tx-amt'>
														{formatCurrency(tx.amount, currency)}
													</span>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
