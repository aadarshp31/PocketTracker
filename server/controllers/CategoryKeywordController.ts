import { Request, Response } from 'express';
import CategoryKeywordService from '../services/CategoryKeywordService';
import AuthService from '../services/AuthService';

export default class CategoryKeywordController {
  private categoryKeywordService: CategoryKeywordService;
  private authService: AuthService;

  constructor(categoryKeywordService?: CategoryKeywordService) {
    this.categoryKeywordService = categoryKeywordService ?? new CategoryKeywordService();
    this.authService = new AuthService();
  }

  private async getUserIdFromSupabaseId(supabaseId: string): Promise<string | null> {
    const user = await this.authService.getUserBySuperbaseId(supabaseId);
    return user ? (user.get('id') as string) : null;
  }

  private async resolveUserId(req: Request, res: Response): Promise<string | null> {
    if (!req.user?.id) {
      res.status(401).json({ message: 'User not authenticated' });
      return null;
    }

    const userId = await this.getUserIdFromSupabaseId(req.user.id);
    if (!userId) {
      res.status(404).json({ message: 'User profile not found in database' });
      return null;
    }

    return userId;
  }

  async getAll(req: Request, res: Response) {
    try {
      const userId = await this.resolveUserId(req, res);
      if (!userId) return;

      const mappings = await this.categoryKeywordService.getMappingsForUser(userId);
      res.json({ mappings });
    } catch {
      res.status(400).json({ message: 'something went wrong' });
    }
  }

  async addKeyword(req: Request, res: Response) {
    try {
      const userId = await this.resolveUserId(req, res);
      if (!userId) return;

      const { category_id: categoryId, keyword } = req.body ?? {};
      if (!categoryId || typeof categoryId !== 'string') {
        res.status(400).json({ message: 'category_id is required' });
        return;
      }
      if (!keyword || typeof keyword !== 'string') {
        res.status(400).json({ message: 'keyword is required' });
        return;
      }

      const mapping = await this.categoryKeywordService.addKeyword(userId, categoryId, keyword);
      res.status(201).json({ mapping });
    } catch (error: unknown) {
      const err = error as Error & { statusCode?: number };
      if (err.statusCode === 409) {
        res.status(409).json({ message: err.message });
        return;
      }
      if (err.message) {
        res.status(400).json({ message: err.message });
        return;
      }
      res.status(400).json({ message: 'something went wrong' });
    }
  }

  async removeKeyword(req: Request, res: Response) {
    try {
      const userId = await this.resolveUserId(req, res);
      if (!userId) return;

      const keyword = typeof req.body?.keyword === 'string'
        ? req.body.keyword
        : typeof req.params.keyword === 'string'
          ? decodeURIComponent(req.params.keyword)
          : '';

      if (!keyword) {
        res.status(400).json({ message: 'keyword is required' });
        return;
      }

      await this.categoryKeywordService.removeKeyword(userId, req.params.mappingId, keyword);
      res.json({ message: 'keyword removed' });
    } catch (error: unknown) {
      const err = error as Error;
      if (err.message) {
        res.status(400).json({ message: err.message });
        return;
      }
      res.status(400).json({ message: 'something went wrong' });
    }
  }
}
