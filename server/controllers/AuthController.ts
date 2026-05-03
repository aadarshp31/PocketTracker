import { Request, Response } from "express";
import UserSignupDTO from "../interfaces/DTO/UserSignupDTO";
import AuthService from "../services/AuthService";

function getCookieOptions(req: Request) {
    const isSecure = process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https';
    const configuredSameSite = (process.env.AUTH_COOKIE_SAME_SITE || '').toLowerCase();
    const sameSite = configuredSameSite === 'none' || configuredSameSite === 'strict' || configuredSameSite === 'lax'
        ? (configuredSameSite as 'none' | 'strict' | 'lax')
        : (isSecure ? 'none' : 'lax');

    return {
        httpOnly: true,
        secure: isSecure,
        sameSite,
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7,
    };
}


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

            // Always clear the session cookie on sign-out regardless of client-side call
            res.clearCookie('pt_auth_token', { path: '/' });
            res.json({
                message: "user signout success"
            });

        } catch (error) {
            res.status(400).json({
                message: "something went wrong"
            });
        }
    }

    async createSession(req: Request, res: Response) {
        try {
            const token = req.body?.access_token;

            if (!token) {
                res.status(400).json({ message: 'Missing access token' });
                return;
            }

            const { data, error } = await this.authService.getAuthUser(token);
            if (error || !data?.user) {
                res.status(401).json({ message: 'Invalid access token' });
                return;
            }

            res.cookie('pt_auth_token', token, getCookieOptions(req));
            res.json({ message: 'session cookie set' });
        } catch (error) {
            res.status(400).json({ message: 'something went wrong' });
        }
    }

    async clearSession(req: Request, res: Response) {
        try {
            res.clearCookie('pt_auth_token', {
                path: '/',
            });
            res.json({ message: 'session cookie cleared' });
        } catch (error) {
            res.status(400).json({ message: 'something went wrong' });
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