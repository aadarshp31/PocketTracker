import { DataType, FindOptions, Op, Order } from "sequelize";
import TransactionModel from "../models/TransactionModel";
import Transaction from "../interfaces/Transaction";

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
}