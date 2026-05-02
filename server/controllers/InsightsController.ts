import { Request, Response } from "express";
import AuthService from "../services/AuthService";
import InsightsService from "../services/InsightsService";

function parseOptionalInt(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseOptionalFloat(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export default class InsightsController {
  private insightsService: InsightsService;
  private authService: AuthService;

  constructor(insightsService: InsightsService) {
    this.insightsService = insightsService;
    this.authService = new AuthService();
  }

  private async resolveUserId(req: Request): Promise<string | null> {
    if (!req.user?.id) return null;

    const user = await this.authService.getUserBySuperbaseId(req.user.id);
    return user ? (user.get("id") as string) : null;
  }

  private respondSuccess(res: Response, data: unknown) {
    res.json({
      data,
      meta: {
        generatedAt: new Date().toISOString()
      }
    });
  }

  async getSummary(req: Request, res: Response) {
    try {
      const userId = await this.resolveUserId(req);
      if (!userId) {
        res.status(401).json({ message: "User not authenticated" });
        return;
      }

      const month = parseOptionalInt(req.query.month);
      const year = parseOptionalInt(req.query.year);

      const data = await this.insightsService.getMonthlySummary(userId, month, year);
      this.respondSuccess(res, data);
    } catch (error: any) {
      res.status(400).json({ message: "something went wrong", error: error.message });
    }
  }

  async getCategories(req: Request, res: Response) {
    try {
      const userId = await this.resolveUserId(req);
      if (!userId) {
        res.status(401).json({ message: "User not authenticated" });
        return;
      }

      const month = parseOptionalInt(req.query.month);
      const year = parseOptionalInt(req.query.year);
      const limit = parseOptionalInt(req.query.limit);

      const data = await this.insightsService.getCategoryBreakdown(userId, month, year, limit);
      this.respondSuccess(res, data);
    } catch (error: any) {
      res.status(400).json({ message: "something went wrong", error: error.message });
    }
  }

  async getDailyPattern(req: Request, res: Response) {
    try {
      const userId = await this.resolveUserId(req);
      if (!userId) {
        res.status(401).json({ message: "User not authenticated" });
        return;
      }

      const days = parseOptionalInt(req.query.days);
      const data = await this.insightsService.getDailyPattern(userId, days);
      this.respondSuccess(res, data);
    } catch (error: any) {
      res.status(400).json({ message: "something went wrong", error: error.message });
    }
  }

  async getSpikes(req: Request, res: Response) {
    try {
      const userId = await this.resolveUserId(req);
      if (!userId) {
        res.status(401).json({ message: "User not authenticated" });
        return;
      }

      const days = parseOptionalInt(req.query.days);
      const threshold = parseOptionalFloat(req.query.threshold);
      const data = await this.insightsService.getSpikes(userId, days, threshold);
      this.respondSuccess(res, data);
    } catch (error: any) {
      res.status(400).json({ message: "something went wrong", error: error.message });
    }
  }

  async getProjection(req: Request, res: Response) {
    try {
      const userId = await this.resolveUserId(req);
      if (!userId) {
        res.status(401).json({ message: "User not authenticated" });
        return;
      }

      const month = parseOptionalInt(req.query.month);
      const year = parseOptionalInt(req.query.year);
      const data = await this.insightsService.getProjection(userId, month, year);
      this.respondSuccess(res, data);
    } catch (error: any) {
      res.status(400).json({ message: "something went wrong", error: error.message });
    }
  }
}
