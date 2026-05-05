import { Op, Order } from "sequelize";
import TransactionModel from "../models/TransactionModel";
import Transaction from "../interfaces/Transaction";
import CategorizationService from "./CategorizationService";
import DuplicateDetectionService, { TransactionWithDuplicates } from "./DuplicateDetectionService";

export interface BulkCreatePayload {
  amount: number;
  type: "income" | "expense";
  description: string;
  date: string;
  category_id?: string;
}

export interface BulkCreateResponse {
  created: Array<{ id: string; amount: number; description: string; date: string }>;
  failed: Array<{ index: number; amount: number; description: string; error: string }>;
  total: number;
}

export interface BulkCreateWithPreviewResponse {
  transactions: Array<{
    index: number;
    amount: number;
    description: string;
    date: string;
    type: "income" | "expense";
    category_id: string;
  }>;
  duplicates: TransactionWithDuplicates[];
  categorizedCount: number;
  flaggedDuplicateCount: number;
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
   * Create bulk transactions with categorization and duplicate detection
   * This is the main endpoint for importing statements/bulk entries
   */
  async createBulkWithCategorization(
    transactions: BulkCreatePayload[],
    userId: string
  ): Promise<BulkCreateResponse> {
    const categorizationService = new CategorizationService();
    await categorizationService.loadCategoriesFromDatabase();

    const created: Array<{ id: string; amount: number; description: string; date: string }> = [];
    const failed: Array<{ index: number; amount: number; description: string; error: string }> = [];

    for (let index = 0; index < transactions.length; index++) {
      try {
        const tx = transactions[index];

        // Auto-categorize if category_id not provided
        let categoryId = tx.category_id;
        if (!categoryId) {
          categoryId = await categorizationService.categorizTransaction(
            tx.description,
            tx.type,
            userId
          );
        }

        if (!categoryId) {
          throw new Error("Failed to determine category for transaction");
        }

        // Create transaction
        const createdTx = await TransactionModel.create({
          amount: tx.amount,
          type: tx.type,
          description: tx.description,
          user_id: userId,
          category_id: categoryId,
          date: tx.date,
        });

        created.push({
          id: createdTx.get("id") as string,
          amount: tx.amount,
          description: tx.description,
          date: tx.date,
        });
      } catch (error) {
        failed.push({
          index,
          amount: transactions[index].amount,
          description: transactions[index].description,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      created,
      failed,
      total: transactions.length,
    };
  }

  /**
   * Preview bulk import with categorization and duplicate detection
   * Returns categorized transactions and potential duplicates without creating them
   */
  async previewBulkImport(
    transactions: BulkCreatePayload[],
    userId: string
  ): Promise<BulkCreateWithPreviewResponse> {
    const categorizationService = new CategorizationService();
    await categorizationService.loadCategoriesFromDatabase();

    const categorizedTransactions: Array<{
      index: number;
      amount: number;
      description: string;
      date: string;
      type: "income" | "expense";
      category_id: string;
    }> = [];

    // Categorize all transactions
    for (let index = 0; index < transactions.length; index++) {
      const tx = transactions[index];

      let categoryId = tx.category_id;
      if (!categoryId) {
        categoryId = await categorizationService.categorizTransaction(
          tx.description,
          tx.type,
          userId
        );
      }

      if (categoryId) {
        categorizedTransactions.push({
          index,
          amount: tx.amount,
          description: tx.description,
          date: tx.date,
          type: tx.type,
          category_id: categoryId,
        });
      }
    }

    // Detect duplicates
    const duplicateDetection = await DuplicateDetectionService.detectDuplicates(
      transactions.map((tx) => ({
        amount: tx.amount,
        description: tx.description,
        date: tx.date,
        type: tx.type,
      })),
      userId
    );

    const flaggedDuplicates = duplicateDetection.filter((dup) => dup.potentialMatches.length > 0);

    return {
      transactions: categorizedTransactions,
      duplicates: duplicateDetection,
      categorizedCount: categorizedTransactions.length,
      flaggedDuplicateCount: flaggedDuplicates.length,
    };
  }
}