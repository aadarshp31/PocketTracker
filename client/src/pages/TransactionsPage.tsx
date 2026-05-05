import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTransactions } from '../features/transactions/hooks/useTransactions'
import { useCategories } from '../features/transactions/hooks/useCategories'
import { useCreateTransaction } from '../features/transactions/hooks/useCreateTransaction'
import { useCreateCategory } from '../features/transactions/hooks/useCreateCategory'
import { useUpdateTransaction } from '../features/transactions/hooks/useUpdateTransaction'
import { useDeleteTransaction } from '../features/transactions/hooks/useDeleteTransaction'
import { useProfile } from '../features/profile/hooks/useProfile'
import { formatCurrency } from '../shared/utils/currency'
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

function buildQuickAddState(form: TransactionFormState): TransactionFormState {
  return {
    amount: '',
    description: '',
    type: form.type,
    category_id: form.category_id,
    date: form.date,
  }
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
  const [formNotice, setFormNotice] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryError, setNewCategoryError] = useState('')
  const amountInputRef = useRef<HTMLInputElement | null>(null)

  const limit = 10

  const query = useTransactions({ page, limit })
  const categoriesQuery = useCategories()
  const profileQuery = useProfile()
  const createMutation = useCreateTransaction()
  const createCategoryMutation = useCreateCategory()
  const updateMutation = useUpdateTransaction()
  const deleteMutation = useDeleteTransaction()

  const categories = categoriesQuery.data?.categories ?? []
  const filteredCategories = useMemo(
    () => categories.filter((cat) => cat.type === form.type),
    [categories, form.type]
  )
  const recentTransaction = query.data?.transactions?.[0] ?? null

  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    createCategoryMutation.isPending

  useEffect(() => {
    if (!editingId) {
      amountInputRef.current?.focus()
    }
  }, [editingId])

  function validateForm() {
    if (!form.amount || Number(form.amount) <= 0) return 'Amount must be greater than 0.'
    if (!form.category_id) return 'Please select a category.'
    if (!form.date) return 'Please select a date.'
    return ''
  }

  function resetForm(clearDefaults = false) {
    setForm((prev) => (clearDefaults ? initialFormState : buildQuickAddState(prev)))
    setEditingId(null)
    setFormError('')
    setFormNotice('')
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
      setForm(initialFormState)
      setFormNotice('Transaction updated.')
    } else {
      await createMutation.mutateAsync(toPayload(form))
      setForm(buildQuickAddState(form))
      setFormNotice('Saved. Amount and note cleared for the next entry.')
    }

    setEditingId(null)
    setFormError('')
    amountInputRef.current?.focus()
  }

  function onEdit(transaction: {
    id: string
    amount: string
    type: TransactionType
    description: string | null
    category_id: string
    date: string
  }) {
    setFormNotice('')
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

  async function onCreateCategory() {
    const name = newCategoryName.trim()
    if (!name) {
      setNewCategoryError('Please enter a category name.')
      return
    }

    const existing = categories.find(
      (category) => category.type === form.type && category.name.toLowerCase() === name.toLowerCase()
    )

    if (existing) {
      setForm((prev) => ({ ...prev, category_id: existing.id }))
      setNewCategoryError('')
      setFormNotice('Selected existing category.')
      setNewCategoryName('')
      return
    }

    setNewCategoryError('')
    const created = await createCategoryMutation.mutateAsync({
      name,
      type: form.type,
    })

    const createdCategoryId = created.categories?.id
    if (createdCategoryId) {
      setForm((prev) => ({ ...prev, category_id: createdCategoryId }))
    }

    setNewCategoryName('')
    setFormNotice(`Added ${name} category.`)
  }

  function applyDateShortcut(offsetDays: number) {
    const date = new Date()
    date.setDate(date.getDate() + offsetDays)
    setForm((prev) => ({
      ...prev,
      date: date.toISOString().slice(0, 10),
    }))
  }

  if (query.isLoading || categoriesQuery.isLoading || profileQuery.isLoading) {
    return (
      <section>
        <h1>Transactions</h1>
        <p>Loading transactions...</p>
      </section>
    )
  }

  if (query.isError || categoriesQuery.isError || profileQuery.isError) {
    return (
      <section>
        <h1>Transactions</h1>
        <p className="error">Failed to load transactions.</p>
      </section>
    )
  }

  const transactions = query.data?.transactions ?? []
  const meta = query.data?.meta
  const currency = profileQuery.data?.users?.[0]?.currency ?? 'INR'

  return (
    <section className="transactions-page">
      <div className="transactions-hero">
        <div>
          <h1>Transactions</h1>
          <p className="muted transactions-subtitle">
            Quick add is optimized for repeated entry. Your type, category, and date stay in place after each save.
          </p>
          <div className="transactions-import-callout">
            <div>
              <span className="transactions-import-eyebrow">Bulk Import</span>
              <p className="transactions-import-copy">
                Upload a bank statement or add many rows at once when quick add is too slow.
              </p>
            </div>
            <NavLink to="/transactions/bulk-import" className="primary-button transactions-import-link" role="button">
              Bulk Import
            </NavLink>
          </div>
        </div>
        <div className="transactions-hero-stats">
          <div className="transactions-stat-card">
            <span className="transactions-stat-label">Shown here</span>
            <strong>{transactions.length}</strong>
          </div>
          <div className="transactions-stat-card">
            <span className="transactions-stat-label">Latest</span>
            <strong>{recentTransaction ? formatCurrency(recentTransaction.amount, currency) : 'No entries'}</strong>
          </div>
        </div>
      </div>

      <div className="table-wrap quick-entry-card">
        <div className="quick-entry-header">
          <div>
            <span className={`quick-entry-badge ${editingId ? 'is-editing' : 'is-adding'}`}>
              {editingId ? 'Editing' : 'Quick Add'}
            </span>
            <h2>{editingId ? 'Update this transaction' : 'Add a transaction in seconds'}</h2>
            <p className="muted quick-entry-helper">
              Pick the type once, tap a category, enter the amount, and keep moving.
            </p>
          </div>
          <button type="button" className="ghost-button" onClick={() => resetForm(true)} disabled={isMutating}>
            Reset Defaults
          </button>
        </div>

        <form onSubmit={onSubmit} className="quick-entry-form">
          <div className="quick-type-toggle" role="tablist" aria-label="transaction type">
            {(['expense', 'income'] as TransactionType[]).map((type) => (
              <button
                key={type}
                type="button"
                className={`type-pill ${form.type === type ? 'is-active' : ''}`}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    type,
                    category_id: prev.type === type ? prev.category_id : '',
                  }))
                }
                disabled={isMutating}
              >
                {type === 'expense' ? 'Expense' : 'Income'}
              </button>
            ))}
          </div>

          <div className="quick-form-grid">
            <label className="quick-field quick-field-amount" htmlFor="txn-amount">
              <span>Amount</span>
              <div className="amount-input-shell">
                <span className="amount-currency">{currency}</span>
                <input
                  ref={amountInputRef}
                  id="txn-amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  disabled={isMutating}
                />
              </div>
            </label>

            <label className="quick-field" htmlFor="txn-date">
              <span>Date</span>
              <input
                id="txn-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                disabled={isMutating}
              />
            </label>

            <label className="quick-field quick-field-description" htmlFor="txn-description">
              <span>Note</span>
              <input
                id="txn-description"
                type="text"
                placeholder="Optional note or merchant"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                disabled={isMutating}
              />
            </label>
          </div>

          <div className="quick-date-shortcuts">
            <span className="quick-date-label">Shortcuts</span>
            <button type="button" className="ghost-chip" onClick={() => applyDateShortcut(0)} disabled={isMutating}>
              Today
            </button>
            <button type="button" className="ghost-chip" onClick={() => applyDateShortcut(-1)} disabled={isMutating}>
              Yesterday
            </button>
          </div>

          <div className="quick-category-section">
            <div className="quick-category-header">
              <label htmlFor="txn-category">Category</label>
              <span className="muted">Tap once to keep using the same bucket for the next entries.</span>
            </div>
            <div className="quick-category-create">
              <input
                id="txn-new-category"
                type="text"
                placeholder="Add custom category (e.g., Other)"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                disabled={isMutating}
              />
              <button
                type="button"
                className="ghost-button"
                onClick={onCreateCategory}
                disabled={isMutating}
              >
                Add Category
              </button>
            </div>
            {newCategoryError ? <p className="error quick-feedback">{newCategoryError}</p> : null}
            <div className="quick-category-list" aria-label="category shortcuts">
              {filteredCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`category-chip ${form.category_id === category.id ? 'is-selected' : ''}`}
                  onClick={() => setForm((prev) => ({ ...prev, category_id: category.id }))}
                  disabled={isMutating}
                >
                  {category.name}
                </button>
              ))}
            </div>
            <select
              id="txn-category"
              className="quick-category-select"
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

          {formError ? <p className="error quick-feedback">{formError}</p> : null}
          {!formError && formNotice ? <p className="quick-feedback quick-feedback-success">{formNotice}</p> : null}

          <div className="quick-entry-actions">
            <button type="submit" className="primary-button" disabled={isMutating}>
              {editingId ? 'Save Changes' : 'Save Transaction'}
            </button>
            {editingId ? (
              <button type="button" className="ghost-button" onClick={() => resetForm(true)} disabled={isMutating}>
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
                  <td>
                    <span className={`transaction-type-badge ${item.type === 'income' ? 'is-income' : 'is-expense'}`}>
                      {item.type}
                    </span>
                  </td>
                  <td>{formatCurrency(item.amount, currency)}</td>
                  <td>{item.description ?? '-'}</td>
                  <td className="transaction-actions-cell">
                    <button onClick={() => onEdit(item)} disabled={isMutating}>
                      Edit
                    </button>
                    <button className="danger-button" onClick={() => onDelete(item.id)} disabled={isMutating}>
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
