import { Op, QueryTypes } from "sequelize";
import { sequelize } from "../config/dbConnection";
import TransactionModel from "../models/TransactionModel";

interface MonthWindow {
  start: Date;
  end: Date;
}

interface MonthRef {
  year: number;
  month: number;
}

function getMonthWindow(year: number, month: number): MonthWindow {
  // month is 1-12 from API
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start, end };
}

function getPreviousMonth(year: number, month: number) {
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
}

function getRecentMonths(count: number, fromYear: number, fromMonth: number): MonthRef[] {
  const months: MonthRef[] = [];

  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(Date.UTC(fromYear, fromMonth - 1 - index, 1));
    months.push({
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
    });
  }

  return months;
}

function toFixed2(value: number): string {
  return value.toFixed(2);
}

export default class InsightsService {
  async getMonthlyTrend(userId: string, months: number = 6, year?: number, month?: number) {
    const now = new Date();
    const targetYear = year ?? now.getUTCFullYear();
    const targetMonth = month ?? now.getUTCMonth() + 1;
    const safeMonths = Math.min(Math.max(months, 3), 12);
    const monthRefs = getRecentMonths(safeMonths, targetYear, targetMonth);

    const series = await Promise.all(
      monthRefs.map(async ({ year: refYear, month: refMonth }) => {
        const window = getMonthWindow(refYear, refMonth);
        const totalRaw = await TransactionModel.sum("amount", {
          where: {
            user_id: userId,
            type: "expense",
            date: { [Op.between]: [window.start, window.end] }
          }
        });

        return {
          month: refMonth,
          year: refYear,
          label: new Date(Date.UTC(refYear, refMonth - 1, 1)).toLocaleString("en-US", {
            month: "short",
            year: "2-digit",
            timeZone: "UTC"
          }),
          totalExpenses: toFixed2(Number(totalRaw || 0))
        };
      })
    );

    return {
      months: safeMonths,
      series,
    };
  }

  async getMonthlySummary(userId: string, month?: number, year?: number) {
    const now = new Date();
    const targetYear = year ?? now.getUTCFullYear();
    const targetMonth = month ?? now.getUTCMonth() + 1;
    const previous = getPreviousMonth(targetYear, targetMonth);

    const currentWindow = getMonthWindow(targetYear, targetMonth);
    const previousWindow = getMonthWindow(previous.year, previous.month);

    const [currentTotalRaw, previousTotalRaw] = await Promise.all([
      TransactionModel.sum("amount", {
        where: {
          user_id: userId,
          type: "expense",
          date: { [Op.between]: [currentWindow.start, currentWindow.end] }
        }
      }),
      TransactionModel.sum("amount", {
        where: {
          user_id: userId,
          type: "expense",
          date: { [Op.between]: [previousWindow.start, previousWindow.end] }
        }
      })
    ]);

    const currentTotal = Number(currentTotalRaw || 0);
    const previousTotal = Number(previousTotalRaw || 0);
    const delta = currentTotal - previousTotal;
    const percentChange = previousTotal === 0 ? 0 : (delta / previousTotal) * 100;

    return {
      currentMonth: {
        month: targetMonth,
        year: targetYear,
        totalExpenses: toFixed2(currentTotal)
      },
      previousMonth: {
        month: previous.month,
        year: previous.year,
        totalExpenses: toFixed2(previousTotal)
      },
      comparison: {
        delta: toFixed2(delta),
        percentChange: toFixed2(percentChange),
        trend: delta > 0 ? "up" : delta < 0 ? "down" : "flat"
      }
    };
  }

  async getCategoryBreakdown(userId: string, month?: number, year?: number, limit: number = 8) {
    const now = new Date();
    const targetYear = year ?? now.getUTCFullYear();
    const targetMonth = month ?? now.getUTCMonth() + 1;
    const window = getMonthWindow(targetYear, targetMonth);

    const [rows, fullTotalRaw] = await Promise.all([
      sequelize.query(
      `
        SELECT
          t.category_id,
          c.name as category_name,
          SUM(t.amount)::numeric(12,2) AS total
        FROM transactions t
        JOIN categories c ON c.id = t.category_id
        WHERE t.user_id = :userId
          AND t.type = 'expense'
          AND t.date BETWEEN :startDate AND :endDate
        GROUP BY t.category_id, c.name
        ORDER BY total DESC
        LIMIT :limit
      `,
      {
        replacements: {
          userId,
          startDate: window.start,
          endDate: window.end,
          limit
        },
        type: QueryTypes.SELECT
      }
    ) as Promise<Array<{ category_id: string; category_name: string; total: string }>>,
      TransactionModel.sum("amount", {
        where: {
          user_id: userId,
          type: "expense",
          date: { [Op.between]: [window.start, window.end] }
        }
      })
    ]);

    const totalAmount = Number(fullTotalRaw || 0);

    return {
      month: targetMonth,
      year: targetYear,
      totalExpenses: toFixed2(totalAmount),
      categories: rows.map((row) => {
        const amount = Number(row.total);
        const percentage = totalAmount === 0 ? 0 : (amount / totalAmount) * 100;

        return {
          categoryId: row.category_id,
          categoryName: row.category_name,
          total: toFixed2(amount),
          percentage: toFixed2(percentage)
        };
      })
    };
  }

  async getDailyPattern(userId: string, days: number = 30) {
    const safeDays = Math.min(Math.max(days, 7), 90);
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - safeDays);

    const rows = await sequelize.query(
      `
        SELECT
          EXTRACT(DOW FROM date) AS dow,
          COUNT(*)::int AS tx_count,
          SUM(amount)::numeric(12,2) AS total
        FROM transactions
        WHERE user_id = :userId
          AND type = 'expense'
          AND date >= :startDate
        GROUP BY dow
      `,
      {
        replacements: { userId, startDate: start },
        type: QueryTypes.SELECT
      }
    ) as Array<{ dow: string; tx_count: number; total: string }>;

    const labels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const dayMap = new Map<number, { count: number; total: number }>();
    rows.forEach((row) => {
      dayMap.set(Number(row.dow), {
        count: Number(row.tx_count),
        total: Number(row.total)
      });
    });

    const weekPattern = labels.map((label, dow) => {
      const found = dayMap.get(dow) ?? { count: 0, total: 0 };
      return {
        day: label,
        transactionCount: found.count,
        total: toFixed2(found.total),
        average: toFixed2(found.count === 0 ? 0 : found.total / found.count)
      };
    });

    return {
      days: safeDays,
      weekPattern
    };
  }

  async getSpikes(userId: string, days: number = 30, threshold: number = 2) {
    const safeDays = Math.min(Math.max(days, 7), 120);
    const safeThreshold = Number.isFinite(threshold) ? Math.max(1, threshold) : 2;

    const start = new Date();
    start.setUTCDate(start.getUTCDate() - safeDays);

    const rows = await sequelize.query(
      `
        SELECT
          DATE(date) AS day,
          SUM(amount)::numeric(12,2) AS total
        FROM transactions
        WHERE user_id = :userId
          AND type = 'expense'
          AND date >= :startDate
        GROUP BY DATE(date)
        ORDER BY day ASC
      `,
      {
        replacements: { userId, startDate: start },
        type: QueryTypes.SELECT
      }
    ) as Array<{ day: string; total: string }>;

    const totals = rows.map((row) => Number(row.total));
    const average = totals.length === 0 ? 0 : totals.reduce((acc, n) => acc + n, 0) / totals.length;

    const spikes = rows
      .map((row) => {
        const total = Number(row.total);
        const ratio = average === 0 ? 0 : total / average;
        const isSpike = average > 0 && ratio >= safeThreshold;

        return {
          date: row.day,
          total: toFixed2(total),
          ratio: toFixed2(ratio),
          severity: ratio >= safeThreshold * 1.5 ? "high" : "medium",
          isSpike
        };
      })
      .filter((row) => row.isSpike)
      .map(({ isSpike, ...rest }) => rest);

    return {
      days: safeDays,
      threshold: safeThreshold,
      baselineAverage: toFixed2(average),
      spikes
    };
  }

  async getProjection(userId: string, month?: number, year?: number) {
    const now = new Date();
    const targetYear = year ?? now.getUTCFullYear();
    const targetMonth = month ?? now.getUTCMonth() + 1;

    const daysInMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
    const dayOfMonth = (targetYear === now.getUTCFullYear() && targetMonth === now.getUTCMonth() + 1)
      ? now.getUTCDate()
      : daysInMonth;

    const window = getMonthWindow(targetYear, targetMonth);
    const monthTotalRaw = await TransactionModel.sum("amount", {
      where: {
        user_id: userId,
        type: "expense",
        date: { [Op.between]: [window.start, window.end] }
      }
    });

    const monthTotal = Number(monthTotalRaw || 0);
    const averagePerDay = dayOfMonth === 0 ? 0 : monthTotal / dayOfMonth;
    const projected = averagePerDay * daysInMonth;

    return {
      month: targetMonth,
      year: targetYear,
      daysElapsed: dayOfMonth,
      daysInMonth,
      monthToDateExpenses: toFixed2(monthTotal),
      averagePerDay: toFixed2(averagePerDay),
      projectedMonthEndExpenses: toFixed2(projected)
    };
  }
}
