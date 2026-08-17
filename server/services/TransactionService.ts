import { Op, Order, WhereOptions } from "sequelize";
import TransactionModel from "../models/TransactionModel";
import CategoryModel from "../models/CategoryModel";
import Transaction from "../interfaces/Transaction";

export interface GetAllTransactionsOptions {
  page?: number;
  limit?: number;
  order?: Order;
  type?: "income" | "expense";
  category_id?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface BulkCreatePayload {
  amount: number;
  type: "income" | "expense";
  description: string;
  date: string;
  category_id: string;
}

export interface BulkCreateResponse {
  created: Array<{ id: string; amount: number; description: string; date: string }>;
  total: number;
}

export default class TransactionService {

  constructor() { }

  private buildTransactionWhere(userId: string, filters: GetAllTransactionsOptions): WhereOptions {
    const where: WhereOptions = { user_id: userId };

    if (filters.type === "income" || filters.type === "expense") {
      where.type = filters.type;
    }

    if (filters.category_id) {
      where.category_id = filters.category_id;
    }

    if (filters.dateFrom && filters.dateTo) {
      where.date = { [Op.between]: [filters.dateFrom, filters.dateTo] };
    } else if (filters.dateFrom) {
      where.date = { [Op.gte]: filters.dateFrom };
    } else if (filters.dateTo) {
      where.date = { [Op.lte]: filters.dateTo };
    }

    if (filters.search?.trim()) {
      const escaped = filters.search.trim().replace(/[%_\\]/g, '\\$&')
      where.description = { [Op.iLike]: `%${escaped}%` };
    }

    return where;
  }

  async getAllTransactions(
    userId: string,
    options: GetAllTransactionsOptions = { page: 1, limit: 10, order: [["date", "desc"]] }
  ) {
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = Math.min(options.limit && options.limit > 0 ? options.limit : 10, 100);
    const order = options.order ?? [["date", "desc"]];
    const where = this.buildTransactionWhere(userId, options);

    const count = await TransactionModel.count({ where });

    const totalPages = Math.max(1, Math.ceil(count / limit));
    const offset = (page - 1) * limit;

    const transactions = await TransactionModel.findAll({
      limit,
      offset,
      order,
      where,
    });

    return {
      transactions,
      meta: {
        page,
        limit,
        totalPages: count === 0 ? 0 : totalPages,
        totalCount: count,
      },
    };
  }

  async getTransactionSummary(userId: string, filters: GetAllTransactionsOptions = {}) {
    const where = this.buildTransactionWhere(userId, filters);

    const [incomeRaw, expensesRaw, transactionCount] = await Promise.all([
      TransactionModel.sum("amount", { where: { ...where, type: "income" } }),
      TransactionModel.sum("amount", { where: { ...where, type: "expense" } }),
      TransactionModel.count({ where }),
    ]);

    const income = Number(incomeRaw ?? 0);
    const expenses = Number(expensesRaw ?? 0);
    const net = income - expenses;

    return {
      income: income.toFixed(2),
      expenses: expenses.toFixed(2),
      net: net.toFixed(2),
      transactionCount,
    };
  }

  async getTransactionById(transactionId: string, userId: string) {
    const transactions = await TransactionModel.findOne({
      where: {
        [Op.and]: [
          { id: transactionId },
          { user_id: userId }
        ]
      }
    });

    return { transactions };
  }

  async createTransaction(transaction: Transaction) {
    const transactions = await TransactionModel.create({
      amount: transaction.amount,
      type: transaction.type,
      description: transaction.description,
      user_id: transaction.user_id,
      category_id: transaction.category_id,
      date: transaction.date
    });

    return { transactions };
  }

  async updateTransactionById(transactionId: string, transactionDetails: Transaction, userId: string) {
    const transaction = await TransactionModel.findOne({
      where: {
        [Op.and]: [
          { "id": transactionId },
          { "user_id": userId }
        ]
      }
    });

    if (!transaction) {
      throw new Error(`No transaction found with the id ${transactionId}`);
    }

    if (transactionDetails.amount) transaction.set("amount", transactionDetails.amount);
    if (transactionDetails.type) transaction.set("type", transactionDetails.type);
    if (transactionDetails.description !== undefined) {
      transaction.set("description", transactionDetails.description);
    }
    if (transactionDetails.date) transaction.set("date", transactionDetails.date);

    if (transactionDetails.category_id) {
      const category = await CategoryModel.findOne({
        where: { id: transactionDetails.category_id },
        attributes: ["id", "type"],
      });

      if (!category) {
        throw new Error("Category not found");
      }

      const effectiveType = (transactionDetails.type ?? transaction.get("type")) as string;
      if (category.get("type") !== effectiveType) {
        throw new Error("Category type does not match transaction type");
      }

      transaction.set("category_id", transactionDetails.category_id);
    }

    const transactions = await transaction.save();



    return { transactions };
  }

  async deleteTransactionById(transactionId: string, userId: string) {
    const transaction = await TransactionModel.findOne({
      where: {
        [Op.and]: [
          { "id": transactionId },
          { "user_id": userId }
        ]
      }
    });

    if (transaction === null) {
      throw new Error(`No transaction found with the id ${transactionId}`);
    }

    await transaction.destroy();
  }

  async createBulk(transactions: Transaction[]) {
    const records = transactions.map((tn) => (
      {
        id: tn.id,
        amount: tn.amount,
        type: tn.type,
        description: tn.description,
        user_id: tn.user_id,
        category_id: tn.category_id,
        date: tn.date,
        createdAt: tn.createdAt,
        updatedAt: tn.updatedAt
      }));

    const createdRecords = await TransactionModel.bulkCreate(records);
    return { transactions: createdRecords };
  }

  /**
   * Import bulk transactions using client-provided categories (batch insert).
   */
  async createBulkImport(
    transactions: BulkCreatePayload[],
    userId: string
  ): Promise<BulkCreateResponse> {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    for (let index = 0; index < transactions.length; index++) {
      const tx = transactions[index];

      if (!tx.category_id) {
        throw new Error(`Row ${index + 1}: category_id is required`);
      }
      if (!tx.description?.trim()) {
        throw new Error(`Row ${index + 1}: description is required`);
      }
      if (!tx.type || (tx.type !== "income" && tx.type !== "expense")) {
        throw new Error(`Row ${index + 1}: type must be income or expense`);
      }
      if (!Number.isFinite(tx.amount) || tx.amount <= 0) {
        throw new Error(`Row ${index + 1}: amount must be greater than 0`);
      }
      if (!tx.date || !datePattern.test(tx.date)) {
        throw new Error(`Row ${index + 1}: date must be YYYY-MM-DD`);
      }
    }

    const categoryIds = [...new Set(transactions.map((tx) => tx.category_id))];
    const categories = await CategoryModel.findAll({
      where: { id: { [Op.in]: categoryIds } },
      attributes: ["id", "type"],
    });
    const categoryById = new Map(
      categories.map((category) => [category.get("id") as string, category.get("type") as string])
    );

    for (let index = 0; index < transactions.length; index++) {
      const tx = transactions[index];
      const categoryType = categoryById.get(tx.category_id);

      if (!categoryType) {
        throw new Error(`Row ${index + 1}: category not found`);
      }
      if (categoryType !== tx.type) {
        throw new Error(`Row ${index + 1}: category type does not match transaction type`);
      }
    }

    const createdRecords = await TransactionModel.bulkCreate(
      transactions.map((tx) => ({
        amount: tx.amount,
        type: tx.type,
        description: tx.description.trim(),
        user_id: userId,
        category_id: tx.category_id,
        date: tx.date,
      }))
    );

    return {
      created: createdRecords.map((record) => ({
        id: record.get("id") as string,
        amount: Number(record.get("amount")),
        description: record.get("description") as string,
        date: record.get("date") as string,
      })),
      total: transactions.length,
    };
  }
}