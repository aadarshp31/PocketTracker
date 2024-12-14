import { Request, Response } from "express";
import UserSignupDTO from "../interfaces/DTO/UserSignupDTO";
import AuthService from "../services/AuthService";


export default class AuthController {
    authService: AuthService;

    constructor(authService: AuthService) {
        this.authService = authService;
    }

    async signup(req: Request, res: Response) {
        try {
            const result = await this.authService.signup(req.body);

            if (result.error) {
                res.status(400).json({
                    message: result.error.message
                });
                return;
            }

            res.json({
                message: "user signup success",
                users: [result.data]
            });

        } catch (error) {
            res.status(400).json({
                message: "something went wrong"
            });
        }
    }

    async signin(req: Request, res: Response) {
        try {
            const result = await this.authService.signin(req.body);

            if (result.error) {
                res.status(400).json({
                    message: result.error.message
                });
                return;
            }

            res.json({
                message: "user signin success",
                users: [result.data]
            });

        } catch (error) {
            res.status(400).json({
                message: "something went wrong"
            });
        }
    }

    async signout(req: Request, res: Response) {
        try {
            const result = await this.authService.signout(req.body);

            if (result.error) {
                res.status(400).json({
                    message: result.error.message
                });
                return;
            }

            res.json({
                message: "user signout success"
            });

        } catch (error) {
            res.status(400).json({
                message: "something went wrong"
            });
        }
    }


    async verify(req: Request, res: Response) {
        try {
            // params recieved from supabase
            const signupVerificationParams = req.params;

            // do something with the params

            res.json({
                message: "user verification success. please signin to continue."
            });

        } catch (error) {
            res.status(400).json({
                message: "something went wrong"
            });
        }
    }
}