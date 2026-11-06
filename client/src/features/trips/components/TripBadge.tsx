import type { Trip } from '../types'

interface TripBadgeProps {
	trip: Trip
	disabled?: boolean
	onRemove?: () => void
}

export function TripBadge({ trip, disabled = false, onRemove }: TripBadgeProps) {
	const color = trip.color ?? '#6366f1'
	return (
		<span
			className="trip-badge"
			style={{ '--trip-color': color } as React.CSSProperties}
			title={trip.name}
		>
			{trip.emoji ? <span className="trip-badge-emoji">{trip.emoji}</span> : null}
			<span className="trip-badge-name">{trip.name}</span>
			{onRemove ? (
				<button
					type="button"
					className="trip-badge-remove"
					onClick={(e) => { e.stopPropagation(); onRemove() }}
					disabled={disabled}
					aria-label={`Remove trip ${trip.name}`}
				>
					×
				</button>
			) : null}
		</span>
	)
}
