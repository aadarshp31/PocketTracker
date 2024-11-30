import express from 'express';
import UserController from '../controllers/UserController';
import UserService from '../services/UserService';

const userRoute = express.Router();
const userController = new UserController(new UserService());

userRoute.param("userId", userController.getById.bind(userController));

userRoute.get("/:userId", userController.getOne.bind(userController));
userRoute.get("/", userController.getAll.bind(userController));
userRoute.post("/", userController.create.bind(userController));
userRoute.put("/:userId", userController.updateById.bind(userController));
userRoute.delete("/:userId", userController.deleteById.bind(userController));

export default userRoute;