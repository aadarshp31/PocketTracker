import { NextFunction, Request, Response } from "express";
import BudgetService from "../services/BudgetService";
import UserService from "../services/UserService";
import { Order } from "sequelize";

export default class BudgetController {
  private budgetService: BudgetService;
  private userService: UserService;

  constructor(budgetService: BudgetService, userService: UserService) {
    this.budgetService = budgetService;
    this.userService = userService;
  }

  async getAll(req: Request, res: Response) {
    try {
      const userId = req.query.userId;

      if (!userId) {
        res.status(400).json({
          message: 'user id is required for getting budgets'
        });
        return;
      }


      const user = await this.userService.getUserById((req.query.userId as string));

      if (!user) {
        res.status(400).send({
          message: 'invalid userId'
        });
        return;
      }

      // @ts-ignore
      req.user = user;


      const options: { limit?: number, page?: number, order?: Order } = {};


      if (req.query.limit) options.limit = parseInt((req.query.limit as string));
      if (req.query.page) options.page = parseInt((req.query.page as string));
      if (req.query.sort) options.order = [[req.query.sort as string, req.query.order ? req.query.order as string : "desc"]]

      const result = await this.budgetService.getAllBudgets((userId as string), options);

      if (!result.budgets || result.budgets.length === 0) {
        res.status(204).send();
        return;
      }

      const budgetsList = result.budgets.map(budget => ({
        id: budget.get("id"),
        amount: budget.get("amount"),
        category_id: budget.get("category_id"),
        user_id: budget.get("user_id"),
        start_date: budget.get("start_date"),
        end_date: budget.get("end_date"),
        createdAt: budget.get("createdAt"),
        updatedAt: budget.get("updatedAt")
      }));

      res.json({
        budgets: budgetsList,
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
      if (!req.budget) {
        res.status(204).send();
        return;
      }

      const budget = {
        // @ts-ignore
        id: req.budget.get("id"),
        // @ts-ignore
        amount: req.budget.get("amount"),
        // @ts-ignore
        start_date: req.budget.get("start_date"),
        // @ts-ignore
        end_date: req.budget.get("end_date"),
        // @ts-ignore
        category_id: req.budget.get("category_id"),
        // @ts-ignore
        user_id: req.budget.get("user_id"),
        // @ts-ignore
        createdAt: req.budget.get("createdAt"),
        // @ts-ignore
        updatedAt: req.budget.get("updatedAt")
      }

      res.json({
        budgets: [budget]
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
          message: 'user id is required for getting budgets'
        });
        return;
      }

      const user = await this.userService.getUserById((req.query.userId as string));
      const result = await this.budgetService.getBudgetById(req.params.budgetId, (req.query.userId as string));

      // @ts-ignore
      if (user) req.user = user;
      // @ts-ignore
      if (result.budget) req.budget = result.budget;
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
          message: 'user id is required for getting budgets'
        });
        return;
      }

      // @ts-ignore
      const budget = req.budget;

      if (!budget) {
        throw new Error(`No budget found with the id ${req.params.budgetId}`);
      }

      const result = await this.budgetService.updateBudgetById(budget.id, req.body, (req.query.userId as string));

      if (!result.budgets) {
        res.status(400).json({
          message: "failed to update budget",
        });
        return;
      }

      res.json({
        message: "budget updated successfully",
        budgets: [
          {
            id: result.budgets.get("id"),
            amount: result.budgets.get("amount"),
            start_date: result.budgets.get("start_date"),
            end_date: result.budgets.get("end_date"),
            category_id: result.budgets.get("category_id"),
            user_id: result.budgets.get("user_id"),
            createdAt: result.budgets.get("createdAt"),
            updatedAt: result.budgets.get("updatedAt")
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
          message: 'user id is required for getting budgets'
        });
        return;
      }

      // @ts-ignore
      const budget = req.budget;

      if (!budget) {
        throw new Error(`No budget found with the id ${req.params.budgetId}`);
      }

      await this.budgetService.deleteBudgetById(budget.id, (req.query.userId as string));

      res.json({
        message: "budget deleted successfully",
      });
    } catch (error) {
      res.status(400).json({
        message: "something went wrong"
      });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const budgetDetails = req.body;
      const userId = req.query.userId;

      if (!userId) {
        res.status(400).json({
          message: 'user id is required'
        });
        return;
      }

      const user = await this.userService.getUserById(userId as string);

      if (!user) {
        res.status(400).send({
          message: 'invalid userId'
        });
        return;
      }

      const result = await this.budgetService.createBudget({
        amount: budgetDetails.amount,
        user_id: userId as string,
        category_id: budgetDetails.category_id,
        start_date: budgetDetails.start_date,
        end_date: budgetDetails.end_date
      }, (user.get("id") as string));

      res.status(201).json({
        budgets: result.budgets
      });
    } catch (error: any) {
      res.status(400).json({
        message: "something went wrong"
      })
    }
  }

  async createBulk(req: Request, res: Response) {
    try {
      await this.budgetService.createBulk(req.body);

      res.json({
        message: "bulk budgets created successfully",
      });
    } catch (error) {
      res.status(400).json({
        message: "something went wrong"
      });
    }
  }
}