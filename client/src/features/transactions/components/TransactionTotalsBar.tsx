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
