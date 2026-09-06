import { Op, QueryTypes } from "sequelize";
import { sequelize } from "../config/dbConnection";
import TransactionModel from "../models/TransactionModel";
import BudgetModel from "../models/BudgetModel";
import CategoryModel from "../models/CategoryModel";

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
        const [expensesRaw, incomeRaw, investmentsRaw] = await Promise.all([
          TransactionModel.sum("amount", {
            where: {
              user_id: userId,
              type: "expense",
              date: { [Op.between]: [window.start, window.end] }
            }
          }),
          TransactionModel.sum("amount", {
            where: {
              user_id: userId,
              type: "income",
              date: { [Op.between]: [window.start, window.end] }
            }
          }),
          TransactionModel.sum("amount", {
            where: {
              user_id: userId,
              type: "investment",
              date: { [Op.between]: [window.start, window.end] }
            }
          })
        ]);

        const totalExpenses = Number(expensesRaw || 0);
        const totalIncome = Number(incomeRaw || 0);
        const totalInvestments = Number(investmentsRaw || 0);
        const netCashFlow = totalIncome - totalExpenses - totalInvestments;

        return {
          month: refMonth,
          year: refYear,
          label: new Date(Date.UTC(refYear, refMonth - 1, 1)).toLocaleString("en-US", {
            month: "short",
            year: "2-digit",
            timeZone: "UTC"
          }),
          totalExpenses: toFixed2(totalExpenses),
          totalIncome: toFixed2(totalIncome),
          totalInvestments: toFixed2(totalInvestments),
          netCashFlow: toFixed2(netCashFlow)
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

    const [
      currentExpensesRaw, previousExpensesRaw,
      currentIncomeRaw,
      currentInvestmentsRaw, previousInvestmentsRaw,
      currentTransfersRaw,
    ] = await Promise.all([
      TransactionModel.sum("amount", {
        where: { user_id: userId, type: "expense", date: { [Op.between]: [currentWindow.start, currentWindow.end] } }
      }),
      TransactionModel.sum("amount", {
        where: { user_id: userId, type: "expense", date: { [Op.between]: [previousWindow.start, previousWindow.end] } }
      }),
      TransactionModel.sum("amount", {
        where: { user_id: userId, type: "income", date: { [Op.between]: [currentWindow.start, currentWindow.end] } }
      }),
      TransactionModel.sum("amount", {
        where: { user_id: userId, type: "investment", date: { [Op.between]: [currentWindow.start, currentWindow.end] } }
      }),
      TransactionModel.sum("amount", {
        where: { user_id: userId, type: "investment", date: { [Op.between]: [previousWindow.start, previousWindow.end] } }
      }),
      TransactionModel.sum("amount", {
        where: { user_id: userId, type: "transfer", date: { [Op.between]: [currentWindow.start, currentWindow.end] } }
      }),
    ]);

    const currentExpenses = Number(currentExpensesRaw || 0);
    const previousExpenses = Number(previousExpensesRaw || 0);
    const currentIncome = Number(currentIncomeRaw || 0);
    const currentInvestments = Number(currentInvestmentsRaw || 0);
    const previousInvestments = Number(previousInvestmentsRaw || 0);
    const currentTransfers = Number(currentTransfersRaw || 0);

    const delta = currentExpenses - previousExpenses;
    const percentChange = previousExpenses === 0 ? 0 : (delta / previousExpenses) * 100;

    const investmentDelta = currentInvestments - previousInvestments;
    const savingsRate = currentIncome === 0 ? 0 : (currentInvestments / currentIncome) * 100;

    return {
      currentMonth: {
        month: targetMonth,
        year: targetYear,
        totalExpenses: toFixed2(currentExpenses),
        totalIncome: toFixed2(currentIncome),
        totalInvestments: toFixed2(currentInvestments),
        totalTransfers: toFixed2(currentTransfers),
        savingsRate: toFixed2(savingsRate),
      },
      previousMonth: {
        month: previous.month,
        year: previous.year,
        totalExpenses: toFixed2(previousExpenses),
        totalInvestments: toFixed2(previousInvestments),
      },
      comparison: {
        delta: toFixed2(delta),
        percentChange: toFixed2(percentChange),
        trend: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
        investmentDelta: toFixed2(investmentDelta),
      }
    };
  }

  async getCategoryBreakdown(userId: string, month?: number, year?: number, limit: number = 50) {
    const now = new Date();
    const targetYear = year ?? now.getUTCFullYear();
    const targetMonth = month ?? now.getUTCMonth() + 1;
    const window = getMonthWindow(targetYear, targetMonth);
    const safeLimit = Math.min(Math.max(limit || 50, 1), 50);

    const previous = getPreviousMonth(targetYear, targetMonth);
    const prevWindow = getMonthWindow(previous.year, previous.month);

    const [rows, fullTotalRaw, prevRows] = await Promise.all([
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
            limit: safeLimit
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
      }),
      sequelize.query(
        `
        SELECT
          t.category_id,
          SUM(t.amount)::numeric(12,2) AS total
        FROM transactions t
        WHERE t.user_id = :userId
          AND t.type = 'expense'
          AND t.date BETWEEN :startDate AND :endDate
        GROUP BY t.category_id
      `,
        {
          replacements: {
            userId,
            startDate: prevWindow.start,
            endDate: prevWindow.end
          },
          type: QueryTypes.SELECT
        }
      ) as Promise<Array<{ category_id: string; total: string }>>
    ]);

    const totalAmount = Number(fullTotalRaw || 0);
    const prevCategoryMap = new Map<string, number>();
    prevRows.forEach((r) => prevCategoryMap.set(r.category_id, Number(r.total)));

    let topRiser: { categoryName: string; delta: string; percentChange: string } | null = null;
    let topSaver: { categoryName: string; delta: string; percentChange: string } | null = null;
    let maxIncrease = 0;
    let maxDecrease = 0;

    const categories = rows.map((row) => {
      const amount = Number(row.total);
      const percentage = totalAmount === 0 ? 0 : (amount / totalAmount) * 100;
      const prevAmount = prevCategoryMap.get(row.category_id) ?? 0;
      const delta = amount - prevAmount;
      const percentChange = prevAmount === 0 ? (amount > 0 ? 100 : 0) : (delta / prevAmount) * 100;

      if (delta > maxIncrease && delta > 0) {
        maxIncrease = delta;
        topRiser = {
          categoryName: row.category_name,
          delta: toFixed2(delta),
          percentChange: toFixed2(percentChange)
        };
      } else if (delta < maxDecrease && delta < 0) {
        maxDecrease = delta;
        topSaver = {
          categoryName: row.category_name,
          delta: toFixed2(Math.abs(delta)),
          percentChange: toFixed2(Math.abs(percentChange))
        };
      }

      return {
        categoryId: row.category_id,
        categoryName: row.category_name,
        total: toFixed2(amount),
        percentage: toFixed2(percentage),
        previousTotal: toFixed2(prevAmount),
        delta: toFixed2(delta),
        percentChange: toFixed2(percentChange)
      };
    });

    return {
      month: targetMonth,
      year: targetYear,
      totalExpenses: toFixed2(totalAmount),
      topRiser,
      topSaver,
      categories
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
          severity: ratio >= safeThreshold * 1.5 ? ("high" as const) : ("medium" as const),
          isSpike
        };
      })
      .filter((row) => row.isSpike)
      .map(({ isSpike, ...rest }) => rest);

    const spikeDates = spikes.map((row) => row.date);
    const topTransactionsMap = new Map<string, Array<{ id: string; description: string; amount: string; categoryName: string }>>();

    if (spikeDates.length > 0) {
      const txRows = (await sequelize.query(
        `
          SELECT
            t.id,
            t.description,
            t.amount::numeric(12,2) AS amount,
            DATE(t.date)::text AS day,
            COALESCE(c.name, 'General') AS category_name
          FROM transactions t
          LEFT JOIN categories c ON c.id = t.category_id
          WHERE t.user_id = :userId
            AND t.type = 'expense'
            AND DATE(t.date) IN (:spikeDates)
          ORDER BY t.amount DESC
        `,
        {
          replacements: { userId, spikeDates },
          type: QueryTypes.SELECT
        }
      )) as Array<{ id: string; description: string; amount: string; day: string; category_name: string }>;

      for (const tx of txRows) {
        const list = topTransactionsMap.get(tx.day) ?? [];
        if (list.length < 3) {
          list.push({
            id: tx.id,
            description: tx.description || "Unnamed transaction",
            amount: toFixed2(Number(tx.amount)),
            categoryName: tx.category_name
          });
          topTransactionsMap.set(tx.day, list);
        }
      }
    }

    const enhancedSpikes = spikes.map((s) => ({
      ...s,
      topTransactions: topTransactionsMap.get(s.date) || []
    }));

    return {
      days: safeDays,
      threshold: safeThreshold,
      baselineAverage: toFixed2(average),
      spikes: enhancedSpikes
    };
  }

  async getSpendPacing(userId: string, month?: number, year?: number) {
    const now = new Date();
    const targetYear = year ?? now.getUTCFullYear();
    const targetMonth = month ?? now.getUTCMonth() + 1;

    const daysInMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
    const isCurrentMonth = targetYear === now.getUTCFullYear() && targetMonth === now.getUTCMonth() + 1;
    const isPastMonth =
      targetYear < now.getUTCFullYear() ||
      (targetYear === now.getUTCFullYear() && targetMonth < now.getUTCMonth() + 1);

    const daysElapsed = isCurrentMonth
      ? Math.min(now.getUTCDate(), daysInMonth)
      : isPastMonth
        ? daysInMonth
        : 0;

    const currentWindow = getMonthWindow(targetYear, targetMonth);
    const prevMonthRef = getPreviousMonth(targetYear, targetMonth);
    const prevWindow = getMonthWindow(prevMonthRef.year, prevMonthRef.month);
    const prevDaysInMonth = new Date(Date.UTC(prevMonthRef.year, prevMonthRef.month, 0)).getUTCDate();

    const [currentRows, prevRows] = await Promise.all([
      sequelize.query(
        `
          SELECT
            EXTRACT(DAY FROM date)::int AS day,
            SUM(amount)::numeric(12,2) AS total
          FROM transactions
          WHERE user_id = :userId
            AND type = 'expense'
            AND date BETWEEN :startDate AND :endDate
          GROUP BY EXTRACT(DAY FROM date)
          ORDER BY day ASC
        `,
        {
          replacements: { userId, startDate: currentWindow.start, endDate: currentWindow.end },
          type: QueryTypes.SELECT
        }
      ) as Promise<Array<{ day: number; total: string }>>,
      sequelize.query(
        `
          SELECT
            EXTRACT(DAY FROM date)::int AS day,
            SUM(amount)::numeric(12,2) AS total
          FROM transactions
          WHERE user_id = :userId
            AND type = 'expense'
            AND date BETWEEN :startDate AND :endDate
          GROUP BY EXTRACT(DAY FROM date)
          ORDER BY day ASC
        `,
        {
          replacements: { userId, startDate: prevWindow.start, endDate: prevWindow.end },
          type: QueryTypes.SELECT
        }
      ) as Promise<Array<{ day: number; total: string }>>
    ]);

    const currentDayMap = new Map<number, number>();
    currentRows.forEach((r) => currentDayMap.set(Number(r.day), Number(r.total)));

    const prevDayMap = new Map<number, number>();
    prevRows.forEach((r) => prevDayMap.set(Number(r.day), Number(r.total)));

    let prevTotal = 0;
    prevRows.forEach((r) => {
      prevTotal += Number(r.total);
    });

    let currentCumulative = 0;
    let prevCumulative = 0;
    let prevCumulativeAtElapsed = 0;

    const pacingDays = [];
    for (let day = 1; day <= daysInMonth; day += 1) {
      if (day <= prevDaysInMonth) {
        prevCumulative += prevDayMap.get(day) ?? 0;
      }
      if (day === Math.min(daysElapsed, prevDaysInMonth)) {
        prevCumulativeAtElapsed = prevCumulative;
      }

      let currentMonthVal: number | null = null;
      if (day <= daysElapsed) {
        currentCumulative += currentDayMap.get(day) ?? 0;
        currentMonthVal = Number(toFixed2(currentCumulative));
      }

      const idealPacing = prevTotal > 0 ? Number(toFixed2((prevTotal / daysInMonth) * day)) : null;

      pacingDays.push({
        day,
        label: `Day ${day}`,
        currentMonthCumulative: currentMonthVal,
        previousMonthCumulative: Number(toFixed2(prevCumulative)),
        idealPacing
      });
    }

    if (daysElapsed === 0) {
      prevCumulativeAtElapsed = 0;
    }

    const paceDelta = currentCumulative - prevCumulativeAtElapsed;
    const pacePercentChange =
      prevCumulativeAtElapsed === 0 ? 0 : (paceDelta / prevCumulativeAtElapsed) * 100;
    const burnRateStatus: "under" | "over" | "equal" =
      paceDelta < -0.01 ? "under" : paceDelta > 0.01 ? "over" : "equal";

    return {
      month: targetMonth,
      year: targetYear,
      daysElapsed,
      daysInMonth,
      currentMonthToDate: toFixed2(currentCumulative),
      previousMonthAtSameDay: toFixed2(prevCumulativeAtElapsed),
      previousMonthTotal: toFixed2(prevTotal),
      paceDelta: toFixed2(paceDelta),
      pacePercentChange: toFixed2(pacePercentChange),
      burnRateStatus,
      pacingDays
    };
  }

  async getBudgetProgress(userId: string, month?: number, year?: number) {
    const now = new Date();
    const targetYear = year ?? now.getUTCFullYear();
    const targetMonth = month ?? now.getUTCMonth() + 1;
    const window = getMonthWindow(targetYear, targetMonth);

    const budgets = await BudgetModel.findAll({
      where: {
        user_id: userId,
        start_date: { [Op.lte]: window.end },
        end_date: { [Op.gte]: window.start }
      }
    });

    if (budgets.length === 0) {
      return {
        hasBudgets: false,
        month: targetMonth,
        year: targetYear,
        totalBudgeted: "0.00",
        totalSpent: "0.00",
        overallPercentage: "0.00",
        budgets: []
      };
    }

    const categoryIds = Array.from(new Set(budgets.map((b) => b.get("category_id") as string)));
    const categories = await CategoryModel.findAll({
      where: { id: { [Op.in]: categoryIds } }
    });
    const categoryNameMap = new Map<string, string>();
    categories.forEach((c) => categoryNameMap.set(c.get("id") as string, c.get("name") as string));

    let totalBudgetedNum = 0;
    let totalSpentNum = 0;

    const budgetItems = await Promise.all(
      budgets.map(async (budget) => {
        const categoryId = budget.get("category_id") as string;
        const budgetAmount = Number(budget.get("amount") || 0);
        totalBudgetedNum += budgetAmount;

        const spentRaw = await TransactionModel.sum("amount", {
          where: {
            user_id: userId,
            type: "expense",
            category_id: categoryId,
            date: { [Op.between]: [window.start, window.end] }
          }
        });

        const actualSpent = Number(spentRaw || 0);
        totalSpentNum += actualSpent;
        const remaining = budgetAmount - actualSpent;
        const percentageUsed = budgetAmount === 0 ? 0 : (actualSpent / budgetAmount) * 100;
        const status: "ok" | "warning" | "exceeded" =
          percentageUsed >= 100 ? "exceeded" : percentageUsed >= 80 ? "warning" : "ok";

        return {
          budgetId: budget.get("id") as string,
          categoryId,
          categoryName: categoryNameMap.get(categoryId) || "Uncategorized",
          budgetAmount: toFixed2(budgetAmount),
          actualSpent: toFixed2(actualSpent),
          remaining: toFixed2(remaining),
          percentageUsed: toFixed2(percentageUsed),
          status
        };
      })
    );

    budgetItems.sort((a, b) => Number(b.percentageUsed) - Number(a.percentageUsed));
    const overallPercentage = totalBudgetedNum === 0 ? 0 : (totalSpentNum / totalBudgetedNum) * 100;

    return {
      hasBudgets: true,
      month: targetMonth,
      year: targetYear,
      totalBudgeted: toFixed2(totalBudgetedNum),
      totalSpent: toFixed2(totalSpentNum),
      overallPercentage: toFixed2(overallPercentage),
      budgets: budgetItems
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
