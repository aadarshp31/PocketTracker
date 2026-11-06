import { useState } from 'react'
import { useTrips } from '../features/trips/hooks/useTrips'
import { useCreateTrip } from '../features/trips/hooks/useCreateTrip'
import { useUpdateTrip } from '../features/trips/hooks/useUpdateTrip'
import { useDeleteTrip } from '../features/trips/hooks/useDeleteTrip'
import { useTripSummary } from '../features/trips/hooks/useTripSummary'
import { useProfile } from '../features/profile/hooks/useProfile'
import { formatCurrency } from '../shared/utils/currency'
import { formatTransactionDate } from '../shared/utils/importDate'
import type { Trip } from '../features/trips/types'
import type { UpdateTripPayload } from '../features/trips/api/updateTrip'
import { ConfirmDialog } from '../shared/components/ConfirmDialog'

// ─── Create Trip Form ───────────────────────────────────────────────────────

interface CreateTripFormState {
	name: string
	emoji: string
	color: string
	start_date: string
	end_date: string
	budget: string
}

const initialCreateForm: CreateTripFormState = {
	name: '',
	emoji: '',
	color: '#6366f1',
	start_date: '',
	end_date: '',
	budget: '',
}

function CreateTripForm({ onSuccess }: { onSuccess: () => void }) {
	const [form, setForm] = useState<CreateTripFormState>(initialCreateForm)
	const [error, setError] = useState('')
	const createMutation = useCreateTrip()

	function validate() {
		if (!form.name.trim()) return 'Trip name is required.'
		if (!form.start_date) return 'Start date is required.'
		if (!form.end_date) return 'End date is required.'
		if (form.end_date < form.start_date) return 'End date must be on or after start date.'
		return ''
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		const msg = validate()
		if (msg) { setError(msg); return }
		setError('')
		await createMutation.mutateAsync({
			name: form.name.trim(),
			emoji: form.emoji.trim() || null,
			color: form.color || null,
			start_date: form.start_date,
			end_date: form.end_date,
			budget: form.budget ? Number(form.budget) : null,
		})
		setForm(initialCreateForm)
		onSuccess()
	}

	return (
		<div className="table-wrap trip-form-card">
			<h2>New Trip</h2>
			<form onSubmit={handleSubmit}>
				<div className="trip-form-grid">
					<div className="trip-form-field">
						<label htmlFor="trip-name">Name *</label>
						<input
							id="trip-name"
							type="text"
							placeholder="e.g. Goa 2025"
							value={form.name}
							onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
							disabled={createMutation.isPending}
						/>
					</div>
					<div className="trip-form-field">
						<label htmlFor="trip-emoji">Emoji</label>
						<input
							id="trip-emoji"
							type="text"
							placeholder="✈"
							maxLength={4}
							value={form.emoji}
							onChange={(e) => setForm((p) => ({ ...p, emoji: e.target.value }))}
							disabled={createMutation.isPending}
						/>
					</div>
					<div className="trip-form-field">
						<label htmlFor="trip-color">Color</label>
						<input
							id="trip-color"
							type="color"
							value={form.color}
							onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
							disabled={createMutation.isPending}
						/>
					</div>
					<div className="trip-form-field">
						<label htmlFor="trip-start">Start Date *</label>
						<input
							id="trip-start"
							type="date"
							value={form.start_date}
							onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
							disabled={createMutation.isPending}
						/>
					</div>
					<div className="trip-form-field">
						<label htmlFor="trip-end">End Date *</label>
						<input
							id="trip-end"
							type="date"
							value={form.end_date}
							onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
							disabled={createMutation.isPending}
						/>
					</div>
					<div className="trip-form-field">
						<label htmlFor="trip-budget">Budget</label>
						<input
							id="trip-budget"
							type="number"
							min="0"
							step="0.01"
							placeholder="Optional"
							value={form.budget}
							onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))}
							disabled={createMutation.isPending}
						/>
					</div>
				</div>
				{error ? <p className="error" style={{ marginBottom: '0.75rem' }}>{error}</p> : null}
				<div className="trip-form-actions">
					<button type="submit" className="primary-button" disabled={createMutation.isPending}>
						{createMutation.isPending ? 'Creating...' : 'Create Trip'}
					</button>
				</div>
			</form>
		</div>
	)
}

// ─── Trip Summary Panel ──────────────────────────────────────────────────────

function TripSummaryPanel({ tripId, currency }: { tripId: string; currency: string }) {
	const { data, isLoading, isError } = useTripSummary(tripId)

	if (isLoading) return <div className="trip-summary-panel"><p className="muted">Loading summary...</p></div>
	if (isError || !data) return <div className="trip-summary-panel"><p className="error">Could not load summary.</p></div>

	const { summary } = data
	return (
		<div className="trip-summary-panel">
			<div className="trip-summary-stats">
				<div className="trip-summary-stat">
					<span className="trip-summary-stat-label">Expense</span>
					<span className="trip-summary-stat-value">{formatCurrency(summary.totalExpense, currency)}</span>
				</div>
				<div className="trip-summary-stat">
					<span className="trip-summary-stat-label">Income</span>
					<span className="trip-summary-stat-value">{formatCurrency(summary.totalIncome, currency)}</span>
				</div>
				<div className="trip-summary-stat">
					<span className="trip-summary-stat-label">Investment</span>
					<span className="trip-summary-stat-value">{formatCurrency(summary.totalInvestment, currency)}</span>
				</div>
				<div className="trip-summary-stat">
					<span className="trip-summary-stat-label">Transactions</span>
					<span className="trip-summary-stat-value">{summary.transactionCount}</span>
				</div>
				<div className="trip-summary-stat">
					<span className="trip-summary-stat-label">Daily Burn</span>
					<span className="trip-summary-stat-value">{formatCurrency(summary.dailyBurnRate, currency)}/day</span>
				</div>
			</div>
			{summary.byCategory.length > 0 ? (
				<table className="trip-summary-category-table">
					<thead>
						<tr>
							<th>Category</th>
							<th>Total</th>
						</tr>
					</thead>
					<tbody>
						{summary.byCategory.map((row) => (
							<tr key={row.category_id}>
								<td>{row.category_name}</td>
								<td>{formatCurrency(row.total, currency)}</td>
							</tr>
						))}
					</tbody>
				</table>
			) : null}
		</div>
	)
}

// ─── Trip Edit Form ──────────────────────────────────────────────────────────

interface EditTripFormProps {
	trip: Trip
	onCancel: () => void
	onSaved: () => void
}

function EditTripForm({ trip, onCancel, onSaved }: EditTripFormProps) {
	const [form, setForm] = useState<UpdateTripPayload & { budget: string }>({
		name: trip.name,
		emoji: trip.emoji ?? '',
		color: trip.color ?? '#6366f1',
		start_date: trip.start_date,
		end_date: trip.end_date,
		budget: trip.budget != null ? String(trip.budget) : '',
	})
	const [error, setError] = useState('')
	const updateMutation = useUpdateTrip()

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!form.name?.trim()) { setError('Trip name is required.'); return }
		if (!form.start_date) { setError('Start date is required.'); return }
		if (!form.end_date) { setError('End date is required.'); return }
		if (form.end_date! < form.start_date!) { setError('End date must be on or after start date.'); return }
		setError('')
		const { budget: budgetStr, ...rest } = form
		await updateMutation.mutateAsync({
			tripId: trip.id,
			payload: {
				...rest,
				name: rest.name?.trim(),
				emoji: (rest.emoji as string)?.trim() || null,
				budget: budgetStr ? Number(budgetStr) : null,
			},
		})
		onSaved()
	}

	return (
		<form className="trip-edit-form" onSubmit={handleSubmit}>
			<div className="trip-edit-grid">
				<div className="trip-form-field">
					<label>Name *</label>
					<input
						type="text"
						value={form.name ?? ''}
						onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
						disabled={updateMutation.isPending}
					/>
				</div>
				<div className="trip-form-field">
					<label>Emoji</label>
					<input
						type="text"
						maxLength={4}
						placeholder="✈"
						value={(form.emoji as string) ?? ''}
						onChange={(e) => setForm((p) => ({ ...p, emoji: e.target.value }))}
						disabled={updateMutation.isPending}
					/>
				</div>
				<div className="trip-form-field">
					<label>Color</label>
					<input
						type="color"
						value={(form.color as string) ?? '#6366f1'}
						onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
						disabled={updateMutation.isPending}
					/>
				</div>
				<div className="trip-form-field">
					<label>Start Date *</label>
					<input
						type="date"
						value={form.start_date ?? ''}
						onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
						disabled={updateMutation.isPending}
					/>
				</div>
				<div className="trip-form-field">
					<label>End Date *</label>
					<input
						type="date"
						value={form.end_date ?? ''}
						onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
						disabled={updateMutation.isPending}
					/>
				</div>
				<div className="trip-form-field">
					<label>Budget</label>
					<input
						type="number"
						min="0"
						step="0.01"
						placeholder="Optional"
						value={(form as { budget: string }).budget}
						onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))}
						disabled={updateMutation.isPending}
					/>
				</div>
			</div>
			{error ? <p className="error" style={{ marginBottom: '0.5rem' }}>{error}</p> : null}
			<div className="trip-edit-actions">
				<button type="submit" className="primary-button" disabled={updateMutation.isPending}>
					{updateMutation.isPending ? 'Saving...' : 'Save'}
				</button>
				<button type="button" className="ghost-button" onClick={onCancel} disabled={updateMutation.isPending}>
					Cancel
				</button>
			</div>
		</form>
	)
}

// ─── Trip Card ───────────────────────────────────────────────────────────────

interface TripCardProps {
	trip: Trip
	currency: string
	onDeleteRequest: (id: string) => void
}

function TripCard({ trip, currency, onDeleteRequest }: TripCardProps) {
	const [showSummary, setShowSummary] = useState(false)
	const [editing, setEditing] = useState(false)

	const color = trip.color ?? '#6366f1'

	return (
		<div className="trip-card">
			<div className="trip-card-body" style={{ '--trip-color': color } as React.CSSProperties}>
				<div className="trip-card-info">
					<h3 className="trip-card-title">
						{trip.emoji ? <span>{trip.emoji}</span> : null}
						{trip.name}
					</h3>
					<div className="trip-card-meta">
						<span>{formatTransactionDate(trip.start_date)} → {formatTransactionDate(trip.end_date)}</span>
						{trip.budget != null ? <span>Budget: {formatCurrency(trip.budget, currency)}</span> : null}
						{trip.transactionCount != null ? (
							<span className="trip-card-txn-badge">{trip.transactionCount} transactions</span>
						) : null}
					</div>
				</div>
				<div className="trip-card-actions">
					<button
						type="button"
						className="ghost-button"
						onClick={() => { setShowSummary((p) => !p); setEditing(false) }}
					>
						{showSummary ? 'Hide Summary' : 'View Summary'}
					</button>
					<button
						type="button"
						onClick={() => { setEditing((p) => !p); setShowSummary(false) }}
					>
						{editing ? 'Cancel' : 'Edit'}
					</button>
					<button
						type="button"
						className="danger-button"
						onClick={() => onDeleteRequest(trip.id)}
					>
						Delete
					</button>
				</div>
			</div>

			{showSummary ? <TripSummaryPanel tripId={trip.id} currency={currency} /> : null}

			{editing ? (
				<EditTripForm
					trip={trip}
					onCancel={() => setEditing(false)}
					onSaved={() => setEditing(false)}
				/>
			) : null}
		</div>
	)
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TripsPage() {
	const tripsQuery = useTrips()
	const profileQuery = useProfile()
	const deleteMutation = useDeleteTrip()
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
	const [notice, setNotice] = useState('')

	const trips = tripsQuery.data?.trips ?? []
	const currency = profileQuery.data?.users?.[0]?.currency ?? 'INR'

	return (
		<div className="trips-page">
			<div className="trips-page-header">
				<h1>✈ Trips</h1>
				<p className="muted">
					Group transactions by trip to track spending across holidays and travel.
				</p>
			</div>

			<CreateTripForm onSuccess={() => setNotice('Trip created!')} />

			{notice ? <p className="quick-feedback quick-feedback-success" style={{ marginBottom: '1rem' }}>{notice}</p> : null}

			{tripsQuery.isLoading ? (
				<p className="muted">Loading trips...</p>
			) : tripsQuery.isError ? (
				<p className="error">Failed to load trips.</p>
			) : trips.length === 0 ? (
				<div className="trips-empty">
					<div className="trips-empty-icon">✈</div>
					<p>No trips yet. Create your first trip above!</p>
				</div>
			) : (
				<div className="trips-list">
					{trips.map((trip) => (
						<TripCard
							key={trip.id}
							trip={trip}
							currency={currency}
							onDeleteRequest={(id) => { setDeleteTargetId(id); setNotice('') }}
						/>
					))}
				</div>
			)}

			<ConfirmDialog
				open={deleteTargetId !== null}
				title="Delete trip?"
				message="This trip will be permanently removed. Transactions tagged to this trip will have their trip unlinked."
				confirmLabel="Delete"
				cancelLabel="Keep trip"
				isConfirming={deleteMutation.isPending}
				onConfirm={async () => {
					if (!deleteTargetId) return
					await deleteMutation.mutateAsync(deleteTargetId)
					setDeleteTargetId(null)
					setNotice('Trip deleted.')
				}}
				onCancel={() => setDeleteTargetId(null)}
			/>
		</div>
	)
}
