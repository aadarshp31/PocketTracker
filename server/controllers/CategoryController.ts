import { NextFunction, Request, Response } from "express";
import CategoryService from "../services/CategoryService";
import UserService from "../services/UserService";
import AuthService from "../services/AuthService";

export default class CategoryController {
  private categoryService: CategoryService;
  private authService: AuthService;

  constructor(categoryService: CategoryService, _userService: UserService) {
    this.categoryService = categoryService;
    this.authService = new AuthService();
  }

  private async getUserIdFromSupabaseId(supabaseId: string): Promise<string | null> {
    const user = await this.authService.getUserBySuperbaseId(supabaseId);
    return user ? (user.get("id") as string) : null;
  }

  async getAll(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          message: 'User not authenticated'
        });
        return;
      }

      const userId = await this.getUserIdFromSupabaseId(req.user.id);
      if (!userId) {
        res.status(404).json({
          message: 'User profile not found in database'
        });
        return;
      }

      const categories = await this.categoryService.getAllCategories(userId);

      if (!categories || categories.length === 0) {
        res.status(200).json({ categories: [] });
        return;
      }

      const categoriesList = categories.map(cat => ({
        id: cat.get("id"),
        name: cat.get("name"),
        type: cat.get("type"),
        is_default: cat.get("is_default")
      }));

      res.json({
        categories: categoriesList
      });
    } catch (error: any) {
      res.status(400).json({
        message: "something went wrong"
      })
    }
  }

  async getOne(req: Request, res: Response) {
    try {
      // @ts-ignore
      if (!req.category) {
        res.status(204).send();
        return;
      }

      const category = {
        // @ts-ignore
        id: req.category.id,
        // @ts-ignore
        name: req.category.name,
        // @ts-ignore
        type: req.category.type,
        // @ts-ignore
        is_default: req.category.is_default,
      }

      res.json({
        categories: [category]
      });
    } catch (error: any) {
      res.status(400).json({
        message: "something went wrong"
      });
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          message: 'User not authenticated'
        });
        return;
      }

      const userId = await this.getUserIdFromSupabaseId(req.user.id);
      if (!userId) {
        res.status(404).json({
          message: 'User profile not found in database'
        });
        return;
      }

      const category = await this.categoryService.getCategoryById(req.params.categoryId, userId);
      
      // @ts-ignore
      req.category = category;
      next();
    } catch (error: any) {
      res.status(400).json({
        message: "something went wrong"
      });
    }
  }

  async updateById(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          message: 'User not authenticated'
        });
        return;
      }

      const userId = await this.getUserIdFromSupabaseId(req.user.id);
      if (!userId) {
        res.status(404).json({
          message: 'User profile not found in database'
        });
        return;
      }

      // @ts-ignore
      const category = req.category;

      if (!category) {
        throw new Error(`No category found with the id ${req.params.categoryId}`);
      }

      const updatedCategory = await this.categoryService.updateCategoryById(category.id, req.body, userId);

      res.json({
        message: "category updated successfully",
        categories: [
          {
            id: updatedCategory.get("id"),
            name: updatedCategory.get("name"),
            type: updatedCategory.get("type"),
            is_default: updatedCategory.get("is_default")
          }
        ]
      });

    } catch (error) {
      res.status(400).json({
        message: "something went wrong"
      });
    }
  }

  async deleteById(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          message: 'User not authenticated'
        });
        return;
      }

      const userId = await this.getUserIdFromSupabaseId(req.user.id);
      if (!userId) {
        res.status(404).json({
          message: 'User profile not found in database'
        });
        return;
      }

      // @ts-ignore
      const category = req.category;

      if (!category) {
        throw new Error(`No category found with the id ${req.params.categoryId}`);
      }

      await this.categoryService.deleteCategoryById(category.id, userId);

      res.json({
        message: "category deleted successfully",
      });

    } catch (error) {
      res.status(400).json({
        message: "something went wrong"
      });
    }
  }

  async create(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          message: 'User not authenticated'
        });
        return;
      }

      const userId = await this.getUserIdFromSupabaseId(req.user.id);
      if (!userId) {
        res.status(404).json({
          message: 'User profile not found in database'
        });
        return;
      }

      const categoryDetails = req.body;

      const createdCategory = await this.categoryService.createCategory({
        name: categoryDetails.name,
        type: categoryDetails.type,
        user_id: userId,
        is_default: categoryDetails.is_default
      })

      res.status(201).json({
        categories: createdCategory
      });
    } catch (error: any) {
      res.status(400).json({
        message: "something went wrong"
      })
    }
  }

  async createBulk(req: Request, res: Response) {
    try {
      await this.categoryService.createBulk(req.body);

      res.json({
        message: "bulk categories created successfully",
      });

    } catch (error) {
      res.status(400).json({
        message: "something went wrong"
      });
    }
  }
}