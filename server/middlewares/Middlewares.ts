import { NextFunction, Request, Response } from "express";
import supabaseClient from "../config/authConfig";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
                first_name?: string;
                last_name?: string;
      };
    }
  }
}

export default class Middlewares {

    static async verifyAuth(req: Request, res: Response, next: NextFunction) {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                res.status(401).json({ message: "Missing or invalid authorization header" });
                return;
            }

            const token = authHeader.substring(7);

            const { data, error } = await supabaseClient.auth.getUser(token);

            if (error || !data.user) {
                res.status(401).json({ message: "Invalid or expired token" });
                return;
            }

            // Extract user info from Supabase token
            req.user = {
                id: data.user.id,
                email: data.user.email || "",
                first_name: data.user.user_metadata?.first_name,
                last_name: data.user.user_metadata?.last_name
            };

            next();
        } catch (error) {
            res.status(401).json({ message: "Authentication failed" });
        }
    }

    static async notFound(req: Request, res: Response, next: NextFunction) {
        res.status(404).json({ message: 'Not Found' });
    }

    static async errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
        res.status(500).json({ message: err.message });
    }
}