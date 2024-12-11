import { Op, Order } from "sequelize";
import BudgetModel from "../models/BudgetModel";
import Budget from "../interfaces/Budget";

export default class BudgetService {

  constructor() { }

  async getAllBudgets(userId: string, options: { page?: number, limit?: number, order?: Order } = { page: 1, limit: 10, order: [["start_date", "desc"]] }) {
    const count = await BudgetModel.count({
      where: {
        user_id: userId
      }
    });

    options.page = options.page ? options.page : 1;
    options.limit = options.limit ? options.limit : 10;
    options.order = options.order ? options.order : [["createdAt", "desc"]];

    const totalPages = Math.ceil(count / options.limit);
    const offset = (options.page - 1) * options.limit;

    const budgets = await BudgetModel.findAll({
      limit: options.limit,
      offset: offset,
      order: options.order,
      where: {
        "user_id": userId
      }
    });

    return {
      budgets,
      meta: {
        page: options.page,
        limit: options.limit,
        totalPages: totalPages,
        totalCount: count
      }
    };
  }

  async getBudgetById(budgetId: string, userId: string) {
    const budgets = await BudgetModel.findOne({
      where: {
        [Op.and]: [
          { id: budgetId },
          { user_id: userId }
        ]
      }
    });

    return { budgets };
  }

  async createBudget(budget: Budget, userId: string) {
    const budgets = await BudgetModel.create({
      amount: budget.amount,
      start_date: budget.start_date,
      end_date: budget.end_date,
      category_id: budget.category_id,
      user_id: userId
    });

    return { budgets };
  }

  async updateBudgetById(budgetId: string, budgetDetails: Budget, userId: string) {
    const budget = await BudgetModel.findOne({
      where: {
        [Op.and]: [
          { "id": budgetId },
          { "user_id": userId }
        ]
      }
    });

    if (!budget) {
      throw new Error(`No budget found with the id ${budgetId}`);
    }

    if (budgetDetails.amount) budget.set("amount", budgetDetails.amount);
    if (budgetDetails.category_id) budget.set("category_id", budgetDetails.category_id);
    if (budgetDetails.start_date) budget.set("start_date", budgetDetails.start_date);
    if (budgetDetails.end_date) budget.set("end_date", budgetDetails.end_date);

    const budgets = await budget.save();



    return { budgets };
  }

  async deleteBudgetById(budgetId: string, userId: string) {
    const budget = await BudgetModel.findOne({
      where: {
        [Op.and]: [
          { "id": budgetId },
          { "user_id": userId }
        ]
      }
    });

    if (budget === null) {
      throw new Error(`No budget found with the id ${budgetId}`);
    }

    await budget.destroy();
  }

  async createBulk(budgets: Budget[]) {
    const records = budgets.map((budget) => (
      {
        id: budget.id,
        amount: budget.amount,
        user_id: budget.user_id,
        category_id: budget.category_id,
        start_date: budget.start_date,
        end_date: budget.end_date,
        createdAt: budget.createdAt,
        updatedAt: budget.updatedAt
      }));

    const createdRecords = await BudgetModel.bulkCreate(records);
    return { budgets: createdRecords };
  }
}