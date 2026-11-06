export interface Trip {
	id: string
	user_id: string
	name: string
	start_date: string   // YYYY-MM-DD
	end_date: string     // YYYY-MM-DD
	budget?: number | null
	color?: string | null
	emoji?: string | null
	transactionCount?: number
	createdAt: string
	updatedAt: string
}

export interface TripCategoryBreakdown {
	category_id: string
	category_name: string
	total: string
}

export interface TripSummary {
	trip: Trip
	totalExpense: string
	totalIncome: string
	totalInvestment: string
	totalTransfer: string
	transactionCount: number
	dailyBurnRate: string
	byCategory: TripCategoryBreakdown[]
}
