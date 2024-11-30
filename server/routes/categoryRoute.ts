import express from 'express';
import CategoryController from '../controllers/CategoryController';
import CategoryService from '../services/CategoryService';
import UserService from '../services/UserService';

const categoryRoute = express.Router();
const categoryController = new CategoryController(new CategoryService(), new UserService());

categoryRoute.param("categoryId", categoryController.getById.bind(categoryController));

categoryRoute.get("/:categoryId", categoryController.getOne.bind(categoryController));
categoryRoute.get("/", categoryController.getAll.bind(categoryController));
categoryRoute.post("/", categoryController.create.bind(categoryController));
categoryRoute.put("/:categoryId", categoryController.updateById.bind(categoryController));
categoryRoute.delete("/:categoryId", categoryController.deleteById.bind(categoryController));

export default categoryRoute;