import { Op, QueryTypes } from "sequelize";
import { sequelize } from "../config/dbConnection";
import TripModel from "../models/TripModel";
import TransactionModel from "../models/TransactionModel";
import CategoryModel from "../models/CategoryModel";
import Trip from "../interfaces/Trip";

export interface TripSummary {
  trip: Trip
  totalExpense: string
  totalIncome: string
  totalInvestment: string
  totalTransfer: string
  transactionCount: number
  dailyBurnRate: string
  byCategory: Array<{
    category_id: string
    category_name: string
    total: string
  }>
}

export default class TripService {

  constructor() { }

  async getAllTrips(userId: string): Promise<Trip[]> {
    const trips = await TripModel.findAll({
      where: { user_id: userId },
      order: [['start_date', 'desc']],
      attributes: {
        include: [
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM transactions AS t
              WHERE t.trip_id = "trip"."id"
            )`),
            'transactionCount'
          ]
        ]
      }
    });

    return trips.map(trip => ({
      id: trip.get('id') as string,
      user_id: trip.get('user_id') as string,
      name: trip.get('name') as string,
      start_date: trip.get('start_date') as string,
      end_date: trip.get('end_date') as string,
      budget: trip.get('budget') as number | null,
      color: trip.get('color') as string | null,
      emoji: trip.get('emoji') as string | null,
      transactionCount: Number(trip.get('transactionCount') ?? 0),
      createdAt: trip.get('createdAt') as string,
      updatedAt: trip.get('updatedAt') as string,
    }));
  }

  async getTripById(tripId: string, userId: string): Promise<Trip | null> {
    const trip = await TripModel.findOne({
      where: {
        [Op.and]: [
          { id: tripId },
          { user_id: userId }
        ]
      },
      attributes: {
        include: [
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM transactions AS t
              WHERE t.trip_id = "trip"."id"
            )`),
            'transactionCount'
          ]
        ]
      }
    });

    if (!trip) return null;

    return {
      id: trip.get('id') as string,
      user_id: trip.get('user_id') as string,
      name: trip.get('name') as string,
      start_date: trip.get('start_date') as string,
      end_date: trip.get('end_date') as string,
      budget: trip.get('budget') as number | null,
      color: trip.get('color') as string | null,
      emoji: trip.get('emoji') as string | null,
      transactionCount: Number(trip.get('transactionCount') ?? 0),
      createdAt: trip.get('createdAt') as string,
      updatedAt: trip.get('updatedAt') as string,
    };
  }

  async createTrip(trip: Trip): Promise<Trip> {
    const created = await TripModel.create({
      user_id: trip.user_id,
      name: trip.name,
      start_date: trip.start_date,
      end_date: trip.end_date,
      budget: trip.budget ?? null,
      color: trip.color ?? null,
      emoji: trip.emoji ?? null
    });

    return {
      id: created.get('id') as string,
      user_id: created.get('user_id') as string,
      name: created.get('name') as string,
      start_date: created.get('start_date') as string,
      end_date: created.get('end_date') as string,
      budget: created.get('budget') as number | null,
      color: created.get('color') as string | null,
      emoji: created.get('emoji') as string | null,
      createdAt: created.get('createdAt') as string,
      updatedAt: created.get('updatedAt') as string,
    };
  }

  async updateTripById(tripId: string, updates: Partial<Trip>, userId: string): Promise<Trip> {
    const trip = await TripModel.findOne({
      where: {
        [Op.and]: [
          { id: tripId },
          { user_id: userId }
        ]
      }
    });

    if (!trip) {
      throw new Error(`No trip found with the id ${tripId}`);
    }

    if (updates.name !== undefined) trip.set('name', updates.name);
    if (updates.start_date !== undefined) trip.set('start_date', updates.start_date);
    if (updates.end_date !== undefined) trip.set('end_date', updates.end_date);
    if (updates.budget !== undefined) trip.set('budget', updates.budget ?? null);
    if (updates.color !== undefined) trip.set('color', updates.color ?? null);
    if (updates.emoji !== undefined) trip.set('emoji', updates.emoji ?? null);

    await trip.save();

    return {
      id: trip.get('id') as string,
      user_id: trip.get('user_id') as string,
      name: trip.get('name') as string,
      start_date: trip.get('start_date') as string,
      end_date: trip.get('end_date') as string,
      budget: trip.get('budget') as number | null,
      color: trip.get('color') as string | null,
      emoji: trip.get('emoji') as string | null,
      createdAt: trip.get('createdAt') as string,
      updatedAt: trip.get('updatedAt') as string,
    };
  }

  async deleteTripById(tripId: string, userId: string): Promise<void> {
    const trip = await TripModel.findOne({
      where: {
        [Op.and]: [
          { id: tripId },
          { user_id: userId }
        ]
      }
    });

    if (!trip) {
      throw new Error(`No trip found with the id ${tripId}`);
    }

    // Nullify trip_id on linked transactions (DB ON DELETE SET NULL handles this too,
    // but being explicit ensures consistency even if FK constraint is deferred)
    await TransactionModel.update(
      { trip_id: null },
      { where: { trip_id: tripId } }
    );

    await trip.destroy();
  }

  async getTripSummary(tripId: string, userId: string): Promise<TripSummary> {
    const trip = await this.getTripById(tripId, userId);

    if (!trip) {
      throw new Error(`No trip found with the id ${tripId}`);
    }

    type AggRow = {
      total_expense: string | null
      total_income: string | null
      total_investment: string | null
      total_transfer: string | null
      transaction_count: string
    };

    type CategoryRow = {
      category_id: string
      category_name: string
      total: string
    };

    const [aggRows, categoryRows] = await Promise.all([
      sequelize.query<AggRow>(
        `SELECT
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense,
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income,
          SUM(CASE WHEN type = 'investment' THEN amount ELSE 0 END) AS total_investment,
          SUM(CASE WHEN type = 'transfer' THEN amount ELSE 0 END) AS total_transfer,
          COUNT(*) AS transaction_count
        FROM transactions
        WHERE trip_id = :tripId`,
        {
          replacements: { tripId },
          type: QueryTypes.SELECT
        }
      ),
      sequelize.query<CategoryRow>(
        `SELECT
          t.category_id,
          c.name AS category_name,
          SUM(t.amount) AS total
        FROM transactions t
        JOIN categories c ON c.id = t.category_id
        WHERE t.trip_id = :tripId AND t.type = 'expense'
        GROUP BY t.category_id, c.name
        ORDER BY total DESC`,
        {
          replacements: { tripId },
          type: QueryTypes.SELECT
        }
      )
    ]);

    const agg = aggRows[0];
    const totalExpense = Number(agg?.total_expense ?? 0);
    const transactionCount = Number(agg?.transaction_count ?? 0);

    // Calculate trip duration in days (at least 1 to avoid division by zero)
    const startMs = new Date(trip.start_date).getTime();
    const endMs = new Date(trip.end_date).getTime();
    const durationDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);

    const dailyBurnRate = totalExpense / durationDays;

    return {
      trip,
      totalExpense: totalExpense.toFixed(2),
      totalIncome: Number(agg?.total_income ?? 0).toFixed(2),
      totalInvestment: Number(agg?.total_investment ?? 0).toFixed(2),
      totalTransfer: Number(agg?.total_transfer ?? 0).toFixed(2),
      transactionCount,
      dailyBurnRate: dailyBurnRate.toFixed(2),
      byCategory: categoryRows.map(row => ({
        category_id: row.category_id,
        category_name: row.category_name,
        total: Number(row.total).toFixed(2)
      }))
    };
  }
}
