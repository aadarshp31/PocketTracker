import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useSearchParams } from 'react-router-dom'
import { useTransactions } from '../features/transactions/hooks/useTransactions'
import { useTransactionSummary } from '../features/transactions/hooks/useTransactionSummary'
import { useCategories } from '../features/transactions/hooks/useCategories'
import { useCreateTransaction } from '../features/transactions/hooks/useCreateTransaction'
import { useCreateCategory } from '../features/transactions/hooks/useCreateCategory'
import { useUpdateTransaction } from '../features/transactions/hooks/useUpdateTransaction'
import { useDeleteTransaction } from '../features/transactions/hooks/useDeleteTransaction'
import { useProfile } from '../features/profile/hooks/useProfile'
import { formatCurrency } from '../shared/utils/currency'
import { todayString } from '../shared/utils/importDate'
import type { Transaction, TransactionType } from '../features/transactions/types'
import { TransactionFilters, defaultTransactionFilters } from '../features/transactions/components/TransactionFilters'
import { TransactionList } from '../features/transactions/components/TransactionList'
import { TransactionPagination } from '../features/transactions/components/TransactionPagination'
import { TransactionTotalsBar } from '../features/transactions/components/TransactionTotalsBar'
import { ConfirmDialog } from '../shared/components/ConfirmDialog'
import {
  buildTransactionSearchParams,
  parseTransactionUrlState,
} from '../features/transactions/utils/transactionUrlSync'
import {
  filtersAreEqual,
  filtersToApiParams,
  getEmptyListMessage,
  getSortLabel,
  hasActiveFilters,
  isPeriodScoped,
  type TransactionFilterState,
} from '../features/transactions/utils/transactionFilters'

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
  date: todayString(),
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
    date: form.date,
  }
}

export function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const skipUrlParseRef = useRef(false)

  const [draftFilters, setDraftFilters] = useState(() => parseTransactionUrlState(searchParams).filters)
  const [appliedFilters, setAppliedFilters] = useState(() => parseTransactionUrlState(searchParams).filters)
  const [page, setPage] = useState(() => parseTransactionUrlState(searchParams).page)
  const [limit, setLimit] = useState(() => parseTransactionUrlState(searchParams).limit)
  const [form, setForm] = useState<TransactionFormState>(initialFormState)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [formNotice, setFormNotice] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryError, setNewCategoryError] = useState('')
  const amountInputRef = useRef<HTMLInputElement | null>(null)
  const quickEntryRef = useRef<HTMLDivElement | null>(null)

  const filterApiParams = useMemo(() => filtersToApiParams(appliedFilters), [appliedFilters])
  const hasPendingFilterChanges = !filtersAreEqual(draftFilters, appliedFilters)

  const listParams = useMemo(
    () => ({
      ...filterApiParams,
      page,
      limit,
    }),
    [filterApiParams, page, limit]
  )

  const query = useTransactions(listParams)
  const summaryQuery = useTransactionSummary(filterApiParams)
  const categoriesQuery = useCategories()
  const profileQuery = useProfile()
  const createMutation = useCreateTransaction()
  const createCategoryMutation = useCreateCategory()
  const updateMutation = useUpdateTransaction()
  const deleteMutation = useDeleteTransaction()

  const categories = categoriesQuery.data?.categories ?? []
  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  )
  const filteredCategories = useMemo(
    () => categories.filter((cat) => cat.type === form.type),
    [categories, form.type]
  )
  const recentTransaction = query.data?.transactions?.[0] ?? null
  const filtersActive = hasActiveFilters(appliedFilters)
  const emptyListMessage = getEmptyListMessage(appliedFilters)
  const isInitialLoading =
    (query.isLoading && !query.data) || categoriesQuery.isLoading || profileQuery.isLoading
  const isListFetching = query.isFetching && !isInitialLoading

  function syncFiltersToUrl(nextFilters: TransactionFilterState, nextPage: number, nextLimit: number) {
    skipUrlParseRef.current = true
    setSearchParams(buildTransactionSearchParams(nextFilters, nextPage, nextLimit, nextFilters.search), {
      replace: true,
    })
  }

  useEffect(() => {
    if (skipUrlParseRef.current) {
      skipUrlParseRef.current = false
      return
    }

    const parsed = parseTransactionUrlState(searchParams)
    setDraftFilters(parsed.filters)
    setAppliedFilters(parsed.filters)
    setPage(parsed.page)
    setLimit(parsed.limit)
  }, [searchParams])

  useEffect(() => {
    if (!editingId) {
      amountInputRef.current?.focus()
    }
  }, [editingId])

  const totalPages = query.data?.meta?.totalPages ?? 0

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    createCategoryMutation.isPending

  function applyFilters() {
    setAppliedFilters(draftFilters)
    setPage(1)
    syncFiltersToUrl(draftFilters, 1, limit)
  }

  function resetDraftFilters() {
    setDraftFilters(appliedFilters)
  }

  function clearFilters() {
    setDraftFilters(defaultTransactionFilters)
    setAppliedFilters(defaultTransactionFilters)
    setPage(1)
    syncFiltersToUrl(defaultTransactionFilters, 1, limit)
  }

  function showAllTime() {
    const nextFilters = { ...appliedFilters, period: 'all-time' as const }
    setDraftFilters(nextFilters)
    setAppliedFilters(nextFilters)
    setPage(1)
    syncFiltersToUrl(nextFilters, 1, limit)
  }

  function onPageChange(nextPage: number) {
    setPage(nextPage)
    syncFiltersToUrl(appliedFilters, nextPage, limit)
  }

  function updateLimit(nextLimit: number) {
    setLimit(nextLimit)
    setPage(1)
    syncFiltersToUrl(appliedFilters, 1, nextLimit)
  }

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

  function onEdit(transaction: Transaction) {
    setFormNotice('')
    setEditingId(transaction.id)
    setForm({
      amount: transaction.amount,
      type: transaction.type,
      description: transaction.description ?? '',
      category_id: transaction.category_id,
      date: String(transaction.date).slice(0, 10),
    })
    quickEntryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function onDeleteRequest(transactionId: string) {
    setDeleteTargetId(transactionId)
  }

  async function onConfirmDelete() {
    if (!deleteTargetId) return

    await deleteMutation.mutateAsync(deleteTargetId)

    if (editingId === deleteTargetId) {
      resetForm(true)
    }

    setDeleteTargetId(null)
  }

  async function onCategoryChange(transactionId: string, categoryId: string) {
    const transaction = query.data?.transactions.find((item) => item.id === transactionId)
    if (!transaction || transaction.category_id === categoryId) return

    try {
      await updateMutation.mutateAsync({
        transactionId,
        payload: { category_id: categoryId },
      })

      if (editingId === transactionId) {
        setForm((prev) => ({ ...prev, category_id: categoryId }))
      }
    } catch {
      setFormNotice('Could not update category. Please try again.')
    }
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
    const d = new Date()
    d.setDate(d.getDate() + offsetDays)
    setForm((prev) => ({
      ...prev,
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    }))
  }

  if (isInitialLoading) {
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
  const heroSecondaryLabel =
    appliedFilters.sort === 'newest' ? 'Latest in list' : getSortLabel(appliedFilters.sort)

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
            <span className="transactions-stat-label">Matching</span>
            <strong>{meta?.totalCount ?? 0}</strong>
          </div>
          <div className="transactions-stat-card">
            <span className="transactions-stat-label">{heroSecondaryLabel}</span>
            <strong>{recentTransaction ? formatCurrency(recentTransaction.amount, currency) : 'No entries'}</strong>
          </div>
        </div>
      </div>

      <div className="table-wrap quick-entry-card" ref={quickEntryRef}>
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

      <TransactionFilters
        filters={draftFilters}
        appliedFilters={appliedFilters}
        categories={categories}
        hasPendingChanges={hasPendingFilterChanges}
        disabled={isMutating}
        onChange={setDraftFilters}
        onApply={applyFilters}
        onResetDraft={resetDraftFilters}
        onClear={clearFilters}
      />

      <TransactionTotalsBar
        summary={summaryQuery.data}
        currency={currency}
        isLoading={summaryQuery.isFetching}
      />

      <TransactionList
        transactions={transactions}
        categories={categories}
        categoryNames={categoryNames}
        currency={currency}
        editingId={editingId}
        emptyMessage={emptyListMessage}
        showClearFilters={filtersActive}
        showAllTimeAction={!filtersActive && isPeriodScoped(appliedFilters)}
        isMutating={isMutating}
        onEdit={onEdit}
        onDelete={onDeleteRequest}
        onCategoryChange={onCategoryChange}
        onClearFilters={clearFilters}
        onShowAllTime={showAllTime}
      />

      {hasPendingFilterChanges ? (
        <p className="muted transaction-list-stale-note">
          List reflects your last applied filters. Click Apply filters to update results.
        </p>
      ) : null}

      {isListFetching ? <p className="muted transaction-list-loading">Updating list...</p> : null}

      {meta ? (
        <TransactionPagination
          meta={meta}
          page={page}
          limit={limit}
          disabled={isMutating || isListFetching}
          onPageChange={onPageChange}
          onLimitChange={updateLimit}
        />
      ) : null}

      <ConfirmDialog
        open={deleteTargetId !== null}
        title="Delete transaction?"
        message="This transaction will be permanently removed. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep transaction"
        isConfirming={deleteMutation.isPending}
        onConfirm={onConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </section>
  )
}
