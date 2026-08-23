import { formatCurrency } from '../../../shared/utils/currency'
import type { TransactionSummary } from '../api/getTransactionSummary'

interface TransactionTotalsBarProps {
  summary: TransactionSummary | undefined
  currency: string
  isLoading?: boolean
}

export function TransactionTotalsBar({ summary, currency, isLoading = false }: TransactionTotalsBarProps) {
  if (isLoading && !summary) {
    return (
      <div className="transaction-totals-bar" aria-live="polite">
        <span className="muted">Calculating totals...</span>
      </div>
    )
  }

  if (!summary) return null

  const netValue = Number(summary.net)

  const savingsRateNum = Number(summary.savingsRate ?? 0)
  const investmentsNum = Number(summary.investments ?? 0)
  const transfersNum = Number(summary.transfers ?? 0)

  return (
    <div className="transaction-totals-bar" aria-label="Filtered transaction totals">
      <div className="transaction-totals-item">
        <span className="transaction-totals-label">Income</span>
        <strong className="transaction-totals-value is-income">{formatCurrency(summary.income, currency)}</strong>
      </div>
      <div className="transaction-totals-item">
        <span className="transaction-totals-label">Expenses</span>
        <strong className="transaction-totals-value is-expense">{formatCurrency(summary.expenses, currency)}</strong>
      </div>
      {investmentsNum > 0 && (
        <div className="transaction-totals-item">
          <span className="transaction-totals-label">Invested</span>
          <strong className="transaction-totals-value is-investment">{formatCurrency(summary.investments, currency)}</strong>
        </div>
      )}
      {transfersNum > 0 && (
        <div className="transaction-totals-item">
          <span className="transaction-totals-label">Transfers</span>
          <strong className="transaction-totals-value is-transfer">{formatCurrency(summary.transfers, currency)}</strong>
        </div>
      )}
      {savingsRateNum > 0 && (
        <div className="transaction-totals-item">
          <span className="transaction-totals-label">Savings Rate</span>
          <strong className={`transaction-totals-value ${savingsRateNum >= 20 ? 'is-savings-high' : savingsRateNum >= 10 ? 'is-savings-mid' : 'is-savings-low'}`}>
            {savingsRateNum.toFixed(1)}%
          </strong>
        </div>
      )}
      <div className="transaction-totals-item">
        <span className="transaction-totals-label">Net</span>
        <strong className={`transaction-totals-value ${netValue >= 0 ? 'is-income' : 'is-expense'}`}>
          {formatCurrency(summary.net, currency)}
        </strong>
      </div>
      <div className="transaction-totals-item transaction-totals-count">
        <span className="transaction-totals-label">Transactions</span>
        <strong>{summary.transactionCount}</strong>
      </div>
    </div>
  )
}
