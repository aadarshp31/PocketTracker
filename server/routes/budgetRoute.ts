import express from 'express';
import UserService from '../services/UserService';
import BudgetController from '../controllers/BudgetController';
import BudgetService from '../services/BudgetService';

const budgetRoute = express.Router();
const budgetController = new BudgetController(new BudgetService(), new UserService());

budgetRoute.param("budgetId", budgetController.getById.bind(budgetController));

budgetRoute.get("/:budgetId", budgetController.getOne.bind(budgetController));
budgetRoute.get("/", budgetController.getAll.bind(budgetController));
budgetRoute.post("/", budgetController.create.bind(budgetController));
budgetRoute.put("/:budgetId", budgetController.updateById.bind(budgetController));
budgetRoute.delete("/:budgetId", budgetController.deleteById.bind(budgetController));

export default budgetRoute;