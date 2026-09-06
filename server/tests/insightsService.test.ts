import assert from 'node:assert/strict'
import InsightsService from '../services/InsightsService'

async function run() {
  const service = new InsightsService()

  // This test assumes seeded data exists in dev database and user id is valid.
  const sampleUserId = '34fa4aef-ea64-46d5-a4b8-0c863d44d534'

  const summary = await service.getMonthlySummary(sampleUserId)
  assert.ok(summary.currentMonth)
  assert.ok(summary.previousMonth)
  assert.ok(['up', 'down', 'flat'].includes(summary.comparison.trend))

  const trend = await service.getMonthlyTrend(sampleUserId, 6)
  assert.equal(trend.series.length, 6)
  assert.ok(typeof trend.series[0]?.totalExpenses === 'string')
  assert.ok(typeof trend.series[0]?.totalIncome === 'string')
  assert.ok(typeof trend.series[0]?.totalInvestments === 'string')
  assert.ok(typeof trend.series[0]?.netCashFlow === 'string')

  const categories = await service.getCategoryBreakdown(sampleUserId)
  assert.ok(Array.isArray(categories.categories))

  const pattern = await service.getDailyPattern(sampleUserId, 30)
  assert.equal(pattern.weekPattern.length, 7)

  const spikes = await service.getSpikes(sampleUserId, 30, 2)
  assert.ok(Array.isArray(spikes.spikes))

  const projection = await service.getProjection(sampleUserId)
  assert.ok(typeof projection.projectedMonthEndExpenses === 'string')

  const pacing = await service.getSpendPacing(sampleUserId)
  assert.ok(Array.isArray(pacing.pacingDays))
  assert.ok(['under', 'over', 'equal'].includes(pacing.burnRateStatus))

  const budgetProgress = await service.getBudgetProgress(sampleUserId)
  assert.ok(typeof budgetProgress.hasBudgets === 'boolean')
  assert.ok(Array.isArray(budgetProgress.budgets))

  console.log('insightsService.test.ts: PASS')
}

run().catch((error) => {
  console.error('insightsService.test.ts: FAIL')
  console.error(error)
  process.exit(1)
})
