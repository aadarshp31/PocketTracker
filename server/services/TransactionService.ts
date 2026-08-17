import { Op, Order } from "sequelize";
import TransactionModel from "../models/TransactionModel";
import CategoryModel from "../models/CategoryModel";
import Transaction from "../interfaces/Transaction";

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

  async getAllTransactions(userId: string, options: { page?: number, limit?: number, order?: Order } = { page: 1, limit: 10, order: [["date", "desc"]] }) {
    const count = await TransactionModel.count({
      where: {
        user_id: userId
      }
    });

    options.page = options.page ? options.page : 1;
    options.limit = options.limit ? options.limit : 10;
    options.order = options.order ? options.order : [["date", "desc"]];

    const totalPages = Math.ceil(count / options.limit);
    const offset = (options.page - 1) * options.limit;

    const transactions = await TransactionModel.findAll({
      limit: options.limit,
      offset: offset,
      order: options.order,
      where: {
        "user_id": userId
      }
    });

    return {
      transactions,
      meta: {
        page: options.page,
        limit: options.limit,
        totalPages: totalPages,
        totalCount: count
      }
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
    if (transactionDetails.description) transaction.set("description", transactionDetails.description);
    if (transactionDetails.date) transaction.set("date", transactionDetails.date);

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