import { NextFunction, Request, Response } from "express";
import TransactionService from "../services/TransactionService";
import UserService from "../services/UserService";
import { Order } from "sequelize";

export default class TransactionController {
  private transactionService: TransactionService;
  private userService: UserService;

  constructor(transactionService: TransactionService, userService: UserService) {
    this.transactionService = transactionService;
    this.userService = userService;
  }

  async getAll(req: Request, res: Response) {
    try {
      const userId = req.query.userId;

      if (!userId) {
        res.status(400).json({
          message: 'user id is required for getting transactions'
        });
        return;
      }


      const user = await this.userService.getUserById((req.query.userId as string));

      if(!user){
        res.status(400).send({
          message: 'invalid userId'
        });
        return;
      }
      
      // @ts-ignore
      req.user = user;

      
      const options: {limit?: number, page?: number, order?: Order} = {};
      
      
      if(req.query.limit) options.limit = parseInt((req.query.limit as string));
      if(req.query.page) options.page = parseInt((req.query.page as string));
      if (req.query.sort) options.order = [[req.query.sort as string, req.query.order ? req.query.order as string : "desc"]]

      const result = await this.transactionService.getAllTransactions((userId as string), options);

      if (!result.transactions || result.transactions.length === 0) {
        res.status(204).send();
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
        message: "something went wrong"
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
      if (!req.query.userId) {
        res.status(400).json({
          message: 'user id is required for getting transactions'
        });
        return;
      }

      const user = await this.userService.getUserById((req.query.userId as string));
      const result = await this.transactionService.getTransactionById(req.params.transactionId, (req.query.userId as string));
      
      // @ts-ignore
      if(user) req.user = user;
      // @ts-ignore
      if(result.transaction) req.transaction = result.transaction;
      next();
    } catch (error: any) {
      res.status(400).json({
        message: "something went wrong"
      });
    }
  }

  async updateById(req: Request, res: Response) {
    try {
      if (!req.query.userId) {
        res.status(400).json({
          message: 'user id is required for getting transactions'
        });
        return;
      }

      // @ts-ignore
      const transaction = req.transaction;

      if (!transaction) {
        throw new Error(`No transaction found with the id ${req.params.transactionId}`);
      }

      const result = await this.transactionService.updateTransactionById(transaction.id, req.body, (req.query.userId as string));

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
      if (!req.query.userId) {
        res.status(400).json({
          message: 'user id is required for getting transactions'
        });
        return;
      }

      // @ts-ignore
      const transaction = req.transaction;

      if (!transaction) {
        throw new Error(`No transaction found with the id ${req.params.transactionId}`);
      }

      await this.transactionService.deleteTransactionById(transaction.id, (req.query.userId as string));

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
      const transactionDetails = req.body;
      const userId = req.query.userId;

      if (!userId) {
        res.status(400).json({
          message: 'user id is required'
        });
        return;
      }

      const user = await this.userService.getUserById(userId as string);

      if(!user){
        res.status(400).send({
          message: 'invalid userId'
        });
        return;
      }

      const result = await this.transactionService.createTransaction({
        amount: transactionDetails.amount,
        type: transactionDetails.type,
        description: transactionDetails.description,
        user_id: userId as string,
        category_id: transactionDetails.category_id,
        date: transactionDetails.date
      });

      res.status(201).json({
        transactions: result.transactions
      });
    } catch (error: any) {
      res.status(400).json({
        message: "something went wrong"
      })
    }
  }

  async createBulk(req: Request, res: Response) {
    try {
      await this.transactionService.createBulk(req.body);

      res.json({
        message: "bulk transactions created successfully",
      });
    } catch (error) {
      res.status(400).json({
        message: "something went wrong"
      });
    }
  }
}