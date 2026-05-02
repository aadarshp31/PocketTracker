import { useMemo, useState } from 'react'
import { useTransactions } from '../features/transactions/hooks/useTransactions'
import { useCategories } from '../features/transactions/hooks/useCategories'
import { useCreateTransaction } from '../features/transactions/hooks/useCreateTransaction'
import { useUpdateTransaction } from '../features/transactions/hooks/useUpdateTransaction'
import { useDeleteTransaction } from '../features/transactions/hooks/useDeleteTransaction'
import type { TransactionType } from '../features/transactions/types'

interface TransactionFormState {
  amount: string
  type: TransactionType
  description: string
  category_id: string
  date: string
}

const initialFormState: TransactionFormState = {
  amount: '',
  type: 'expense',
  description: '',
  category_id: '',
  date: new Date().toISOString().slice(0, 10),
}

function toPayload(form: TransactionFormState) {
  return {
    amount: Number(form.amount),
    type: form.type,
    description: form.description,
    category_id: form.category_id,
    date: new Date(form.date).toISOString(),
  }
}

export function TransactionsPage() {
  const [page, setPage] = useState(1)
  const [form, setForm] = useState<TransactionFormState>(initialFormState)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')

  const limit = 10

  const query = useTransactions({ page, limit })
  const categoriesQuery = useCategories()
  const createMutation = useCreateTransaction()
  const updateMutation = useUpdateTransaction()
  const deleteMutation = useDeleteTransaction()

  const categories = categoriesQuery.data?.categories ?? []
  const filteredCategories = useMemo(
    () => categories.filter((cat) => cat.type === form.type),
    [categories, form.type]
  )

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  function validateForm() {
    if (!form.amount || Number(form.amount) <= 0) return 'Amount must be greater than 0.'
    if (!form.category_id) return 'Please select a category.'
    if (!form.date) return 'Please select a date.'
    return ''
  }

  function resetForm() {
    setForm(initialFormState)
    setEditingId(null)
    setFormError('')
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationMessage = validateForm()
    if (validationMessage) {
      setFormError(validationMessage)
      return
    }

    setFormError('')

    if (editingId) {
      await updateMutation.mutateAsync({
        transactionId: editingId,
        payload: toPayload(form),
      })
    } else {
      await createMutation.mutateAsync(toPayload(form))
    }

    resetForm()
  }

  function onEdit(transaction: {
    id: string
    amount: string
    type: TransactionType
    description: string | null
    category_id: string
    date: string
  }) {
    setEditingId(transaction.id)
    setForm({
      amount: transaction.amount,
      type: transaction.type,
      description: transaction.description ?? '',
      category_id: transaction.category_id,
      date: new Date(transaction.date).toISOString().slice(0, 10),
    })
  }

  async function onDelete(transactionId: string) {
    await deleteMutation.mutateAsync(transactionId)
  }

  if (query.isLoading || categoriesQuery.isLoading) {
    return (
      <section>
        <h1>Transactions</h1>
        <p>Loading transactions...</p>
      </section>
    )
  }

  if (query.isError || categoriesQuery.isError) {
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
      <p className="muted">Create, edit, and delete your transactions.</p>

      <div className="table-wrap" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>{editingId ? 'Edit Transaction' : 'Add Transaction'}</h2>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'grid', gap: '0.25rem' }}>
            <label htmlFor="txn-amount">Amount</label>
            <input
              id="txn-amount"
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              disabled={isMutating}
            />
          </div>

          <div style={{ display: 'grid', gap: '0.25rem' }}>
            <label htmlFor="txn-type">Type</label>
            <select
              id="txn-type"
              value={form.type}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  type: e.target.value as TransactionType,
                  category_id: '',
                }))
              }
              disabled={isMutating}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>

          <div style={{ display: 'grid', gap: '0.25rem' }}>
            <label htmlFor="txn-category">Category</label>
            <select
              id="txn-category"
              value={form.category_id}
              onChange={(e) => setForm((prev) => ({ ...prev, category_id: e.target.value }))}
              disabled={isMutating}
            >
              <option value="">Select category</option>
              {filteredCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gap: '0.25rem' }}>
            <label htmlFor="txn-date">Date</label>
            <input
              id="txn-date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              disabled={isMutating}
            />
          </div>

          <div style={{ display: 'grid', gap: '0.25rem' }}>
            <label htmlFor="txn-description">Description</label>
            <input
              id="txn-description"
              type="text"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              disabled={isMutating}
            />
          </div>

          {formError ? <p className="error" style={{ margin: 0 }}>{formError}</p> : null}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={isMutating}>
              {editingId ? 'Update Transaction' : 'Create Transaction'}
            </button>
            {editingId ? (
              <button type="button" onClick={resetForm} disabled={isMutating}>
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5}>No transactions found.</td>
              </tr>
            ) : (
              transactions.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.date).toLocaleDateString()}</td>
                  <td>{item.type}</td>
                  <td>{item.amount}</td>
                  <td>{item.description ?? '-'}</td>
                  <td style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => onEdit(item)} disabled={isMutating}>
                      Edit
                    </button>
                    <button onClick={() => onDelete(item.id)} disabled={isMutating}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta && (
        <div className="pager">
          <button onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1 || isMutating}>
            Previous
          </button>
          <span>
            Page {meta.page} of {meta.totalPages}
          </span>
          <button
            onClick={() => setPage((prev) => Math.min(meta.totalPages, prev + 1))}
            disabled={page >= meta.totalPages || isMutating}
          >
            Next
          </button>
        </div>
      )}
    </section>
  )
}
