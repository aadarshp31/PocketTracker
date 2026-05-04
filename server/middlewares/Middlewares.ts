import { NextFunction, Request, Response } from "express";
import supabaseClient from "../config/authConfig";
import UserModel from "../models/UserModel";

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

            const email = data.user.email || "";
            const metadata = data.user.user_metadata || {};
            const firstName = (metadata.first_name || metadata.firstName || email.split("@")[0] || "User").toString();
            const lastName = (metadata.last_name || metadata.lastName || "Account").toString();

            // Ensure there is always an application user mapped to the Supabase user id.
            let dbUser = await UserModel.findOne({ where: { supabase_id: data.user.id } });

            if (!dbUser && email) {
                const existingByEmail = await UserModel.findOne({ where: { email } });

                if (existingByEmail) {
                    existingByEmail.set("supabase_id", data.user.id);
                    if (!existingByEmail.get("first_name")) existingByEmail.set("first_name", firstName);
                    if (!existingByEmail.get("last_name")) existingByEmail.set("last_name", lastName);
                    dbUser = await existingByEmail.save();
                } else {
                    dbUser = await UserModel.create({
                        supabase_id: data.user.id,
                        email,
                        first_name: firstName,
                        last_name: lastName,
                        currency: "INR",
                    });
                }
            }

            if (!dbUser) {
                res.status(500).json({ message: "Unable to initialize user profile" });
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
            console.error("verifyAuth error:", error);
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