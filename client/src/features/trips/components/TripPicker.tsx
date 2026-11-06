import type { Trip } from '../types'

interface TripPickerProps {
	trips: Trip[]
	value: string | null   // current trip_id or null
	disabled?: boolean
	onChange: (tripId: string | null) => void
}

export function TripPicker({ trips, value, disabled = false, onChange }: TripPickerProps) {
	const selectedTrip = trips.find((t) => t.id === value)

	return (
		<div className="trip-picker">
			<select
				className="trip-picker-select"
				value={value ?? ''}
				disabled={disabled}
				style={selectedTrip?.color ? { borderLeft: `3px solid ${selectedTrip.color}` } : undefined}
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
				onChange={(e) => {
					e.stopPropagation()
					onChange(e.target.value || null)
				}}
				aria-label="Assign trip"
			>
				<option value="">No trip</option>
				{trips.map((trip) => (
					<option key={trip.id} value={trip.id}>
						{trip.emoji ? `${trip.emoji} ` : ''}{trip.name}
					</option>
				))}
			</select>
			<a
				href="/trips"
				target="_blank"
				rel="noopener noreferrer"
				className="trip-picker-new ghost-chip"
				onClick={(e) => e.stopPropagation()}
				title="Manage trips in new tab"
				style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
			>
				✈ Trips
			</a>
		</div>
	)
}
