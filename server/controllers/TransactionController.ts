import { NextFunction, Request, Response } from "express";
import TransactionService from "../services/TransactionService";
import UserService from "../services/UserService";
import AuthService from "../services/AuthService";
import { Order } from "sequelize";

export default class TransactionController {
  private transactionService: TransactionService;
  private userService: UserService;
  private authService: AuthService;

  constructor(transactionService: TransactionService, userService: UserService) {
    this.transactionService = transactionService;
    this.userService = userService;
    this.authService = new AuthService();
  }

  private async getUserIdFromSupabaseId(supabaseId: string): Promise<string | null> {
    const user = await this.authService.getUserBySuperbaseId(supabaseId);
    return user ? (user.get("id") as string) : null;
  }

  async getAll(req: Request, res: Response) {
    try {
      // Get user ID from authenticated user (middleware sets req.user)
      if (!req.user?.id) {
        res.status(401).json({
          message: 'User not authenticated'
        });
        return;
      }

      const userId = await this.getUserIdFromSupabaseId(req.user.id);
      
      if (!userId) {
        res.status(404).json({
          message: 'User profile not found in database'
        });
        return;
      }

      const options: {limit?: number, page?: number, order?: Order} = {};
      
      if(req.query.limit) options.limit = parseInt((req.query.limit as string));
      if(req.query.page) options.page = parseInt((req.query.page as string));
      if (req.query.sort) options.order = [[req.query.sort as string, req.query.order ? req.query.order as string : "desc"]]

      const result = await this.transactionService.getAllTransactions(userId, options);

      if (!result.transactions || result.transactions.length === 0) {
        res.status(200).json({
          transactions: [],
          meta: result.meta
        });
        return;
      }

      const transactionsList = result.transactions.map(tn => ({
        id: tn.get("id"),
        amount: tn.get("amount"),
        type: tn.get("type"),
        description: tn.get("description"),
        date: tn.get("date"),
        category_id: tn.get("category_id"),
        user_id: tn.get("user_id"),
        createdAt: tn.get("createdAt"),
        updatedAt: tn.get("updatedAt")
      }));

      res.json({
        transactions: transactionsList,
        meta: result.meta
      });
      
    } catch (error: any) {
      res.status(400).json({
        message: "something went wrong",
        error: error.message
      });
    }
  }

  async getOne(req: Request, res: Response) {
    try {
      // @ts-ignore
      if (!req.transaction) {
        res.status(204).send();
        return;
      }

      const transaction = {
        // @ts-ignore
        id: req.transaction.get("id"),
        // @ts-ignore
        amount: req.transaction.get("amount"),
        // @ts-ignore
        type: req.transaction.get("type"),
        // @ts-ignore
        description: req.transaction.get("description"),
        // @ts-ignore
        date: req.transaction.get("date"),
        // @ts-ignore
        category_id: req.transaction.get("category_id"),
        // @ts-ignore
        user_id: req.transaction.get("user_id"),
        // @ts-ignore
        createdAt: req.transaction.get("createdAt"),
        // @ts-ignore
        updatedAt: req.transaction.get("updatedAt")
      }

      res.json({
        transactions: [transaction]
      });
    } catch (error: any) {
      res.status(400).json({
        message: "something went wrong"
      });
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          message: 'User not authenticated'
        });
        return;
      }

      const userId = await this.getUserIdFromSupabaseId(req.user.id);
      
      if (!userId) {
        res.status(404).json({
          message: 'User profile not found in database'
        });
        return;
      }

      const result = await this.transactionService.getTransactionById(req.params.transactionId, userId);
      
      if(result.transactions) {
        // @ts-ignore
        req.transaction = result.transactions;
      }
      next();
    } catch (error: any) {
      res.status(400).json({
        message: "something went wrong"
      });
    }
  }

  async updateById(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          message: 'User not authenticated'
        });
        return;
      }

      // @ts-ignore
      const transaction = req.transaction;

      if (!transaction) {
        throw new Error(`No transaction found with the id ${req.params.transactionId}`);
      }

      const userId = await this.getUserIdFromSupabaseId(req.user.id);
      
      if (!userId) {
        res.status(404).json({
          message: 'User profile not found in database'
        });
        return;
      }

      const result = await this.transactionService.updateTransactionById(transaction.id, req.body, userId);

      if(!result.transactions){
        res.status(400).json({
          message: "failed to update transaction",
        });
        return;
      }

      res.json({
        message: "transaction updated successfully",
        transactions: [
          {
            id: result.transactions.get("id"),
            amount: result.transactions.get("amount"),
            type: result.transactions.get("type"),
            description: result.transactions.get("description"),
            date: result.transactions.get("date"),
            category_id: result.transactions.get("category_id"),
            user_id: result.transactions.get("user_id"),
            createdAt: result.transactions.get("createdAt"),
            updatedAt: result.transactions.get("updatedAt")
          }
        ]
      });

    } catch (error) {
      res.status(400).json({
        message: "something went wrong"
      });
    }
  }

  async deleteById(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          message: 'User not authenticated'
        });
        return;
      }

      // @ts-ignore
      const transaction = req.transaction;

      if (!transaction) {
        throw new Error(`No transaction found with the id ${req.params.transactionId}`);
      }

      const userId = await this.getUserIdFromSupabaseId(req.user.id);
      
      if (!userId) {
        res.status(404).json({
          message: 'User profile not found in database'
        });
        return;
      }

      await this.transactionService.deleteTransactionById(transaction.id, userId);

      res.json({
        message: "transaction deleted successfully",
      });
    } catch (error) {
      res.status(400).json({
        message: "something went wrong"
      });
    }
  }

  async create(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          message: 'User not authenticated'
        });
        return;
      }

      const userId = await this.getUserIdFromSupabaseId(req.user.id);
      
      if (!userId) {
        res.status(404).json({
          message: 'User profile not found in database'
        });
        return;
      }

      const transactionDetails = req.body;

      const result = await this.transactionService.createTransaction({
        amount: transactionDetails.amount,
        type: transactionDetails.type,
        description: transactionDetails.description,
        user_id: userId,
        category_id: transactionDetails.category_id,
        date: transactionDetails.date
      });

      res.status(201).json({
        transactions: result.transactions
      });

    } catch (error: any) {
      res.status(400).json({
        message: "something went wrong",
        error: error.message
      });
    }
  }

  async bulkCreatePreview(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          message: 'User not authenticated'
        });
        return;
      }

      const userId = await this.getUserIdFromSupabaseId(req.user.id);
      
      if (!userId) {
        res.status(404).json({
          message: 'User profile not found in database'
        });
        return;
      }

      const { transactions } = req.body;

      if (!Array.isArray(transactions) || transactions.length === 0) {
        res.status(400).json({
          message: "Invalid or empty transactions array"
        });
        return;
      }

      const preview = await this.transactionService.previewBulkImport(transactions, userId);

      res.status(200).json({
        preview,
        message: `Preview ready: ${preview.categorizedCount} transactions categorized, ${preview.flaggedDuplicateCount} potential duplicates flagged`
      });

    } catch (error: any) {
      res.status(400).json({
        message: "Preview failed",
        error: error.message
      });
    }
  }

  async bulkCreate(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          message: 'User not authenticated'
        });
        return;
      }

      const userId = await this.getUserIdFromSupabaseId(req.user.id);
      
      if (!userId) {
        res.status(404).json({
          message: 'User profile not found in database'
        });
        return;
      }

      const { transactions } = req.body;

      if (!Array.isArray(transactions) || transactions.length === 0) {
        res.status(400).json({
          message: "Invalid or empty transactions array"
        });
        return;
      }

      const result = await this.transactionService.createBulkWithCategorization(transactions, userId);

      res.status(201).json({
        result,
        message: `Successfully created ${result.created.length} transactions, ${result.failed.length} failed`
      });

    } catch (error: any) {
      res.status(400).json({
        message: "Bulk creation failed",
        error: error.message
      });
    }
  }
}
