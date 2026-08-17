import express from 'express';
import UserService from '../services/UserService';
import TransactionController from '../controllers/TransactionController';
import TransactionService from '../services/TransactionService';

const transactionRoute = express.Router();
const transactionController = new TransactionController(new TransactionService(), new UserService());

// Bulk import routes MUST come before param middleware to avoid conflict
transactionRoute.get("/summary", transactionController.getSummary.bind(transactionController));
transactionRoute.get("/bulk/config", transactionController.getBulkConfig.bind(transactionController));
transactionRoute.post("/bulk", transactionController.bulkCreate.bind(transactionController));

// Standard transaction routes
transactionRoute.param("transactionId", transactionController.getById.bind(transactionController));

transactionRoute.get("/:transactionId", transactionController.getOne.bind(transactionController));
transactionRoute.get("/", transactionController.getAll.bind(transactionController));
transactionRoute.post("/", transactionController.create.bind(transactionController));
transactionRoute.put("/:transactionId", transactionController.updateById.bind(transactionController));
transactionRoute.delete("/:transactionId", transactionController.deleteById.bind(transactionController));

export default transactionRoute;
