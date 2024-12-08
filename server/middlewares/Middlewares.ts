import { NextFunction, Request, Response } from "express";

export default class Middlewares {

    static async notFound(req: Request, res: Response, next: NextFunction) {
        res.status(404).json({ message: 'Not Found' });
    }

    static async errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
        res.status(500).json({ message: err.message });
    }
}