import express, { Request, Response } from 'express';

const authRoutes = express.Router();


authRoutes.get("/", (req: Request, res: Response) => {
  res.json({
    message: "/auth route success"
  });
})



export default authRoutes;
