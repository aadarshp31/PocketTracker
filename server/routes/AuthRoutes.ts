import express from 'express'
import AuthController from '../controllers/AuthController';
import AuthService from '../services/AuthService';

const authController = new AuthController(new AuthService());
const authRoute = express.Router();

authRoute.post("/signup", authController.signup.bind(authController));
authRoute.post("/signin", authController.signin.bind(authController));
authRoute.post("/signout", authController.signout.bind(authController));
authRoute.post("/verify", authController.verify.bind(authController));

export default authRoute;