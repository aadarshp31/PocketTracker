import { useState } from 'react'
import { useTransactions } from '../features/transactions/hooks/useTransactions'

const DEFAULT_USER_ID = import.meta.env.VITE_DEFAULT_USER_ID ?? ''

export function TransactionsPage() {
  const [page, setPage] = useState(1)
  const limit = 10

  const query = useTransactions({
    userId: DEFAULT_USER_ID,
    page,
    limit,
  })

  if (!DEFAULT_USER_ID) {
    return (
      <section>
        <h1>Transactions</h1>
        <p className="muted">
          Set <code>VITE_DEFAULT_USER_ID</code> in client env to load transactions.
        </p>
      </section>
    )
  }

  if (query.isLoading) {
    return (
      <section>
        <h1>Transactions</h1>
        <p>Loading transactions...</p>
      </section>
    )
  }

  if (query.isError) {
    return (
      <section>
        <h1>Transactions</h1>
        <p className="error">Failed to load transactions.</p>
      </section>
    )
  }

  const transactions = query.data?.transactions ?? []
  const meta = query.data?.meta

  return (
    <section>
      <h1>Transactions</h1>
      <p className="muted">Connected to backend paginated transactions API.</p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={4}>No transactions found.</td>
              </tr>
            ) : (
              transactions.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.date).toLocaleDateString()}</td>
                  <td>{item.type}</td>
                  <td>{item.amount}</td>
                  <td>{item.description ?? '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta && (
        <div className="pager">
          <button onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>
            Previous
          </button>
          <span>
            Page {meta.page} of {meta.totalPages}
          </span>
          <button
            onClick={() => setPage((prev) => Math.min(meta.totalPages, prev + 1))}
            disabled={page >= meta.totalPages}
          >
            Next
          </button>
        </div>
      )}
    </section>
  )
}
