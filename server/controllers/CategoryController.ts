import { NextFunction, Request, Response } from "express";
import CategoryService from "../services/CategoryService";
import UserService from "../services/UserService";

export default class CategoryController {
  private categoryService: CategoryService;
  private userService: UserService;

  constructor(categoryService: CategoryService, userService: UserService) {
    this.categoryService = categoryService;
    this.userService = userService;
  }

  async getAll(req: Request, res: Response) {
    try {
      const userId = req.query.userId;

      if (!userId) {
        res.status(400).json({
          message: 'user id is required for getting categories'
        });
        return;
      }


      const user = await this.userService.getUserById((req.query.userId as string));

      if(!user){
        res.status(400).send({
          message: 'invalid userId'
        });
        return;
      }
      
      // @ts-ignore
      req.user = user;

      const categories = await this.categoryService.getAllCategories((userId as string));

      if (!categories || categories.length === 0) {
        res.status(204).send();
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
      if (!req.query.userId) {
        res.status(400).json({
          message: 'user id is required for getting categories'
        });
        return;
      }

      const user = await this.userService.getUserById((req.query.userId as string));
      const category = await this.categoryService.getCategoryById(req.params.categoryId, (req.query.userId as string));
      
      // @ts-ignore
      req.user = user;
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
      if (!req.query.userId) {
        res.status(400).json({
          message: 'user id is required for getting categories'
        });
        return;
      }

      // @ts-ignore
      const category = req.category;

      if (!category) {
        throw new Error(`No category found with the id ${req.params.categoryId}`);
      }

      const updatedCategory = await this.categoryService.updateCategoryById(category.id, req.body, (req.query.userId as string));

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
      if (!req.query.userId) {
        res.status(400).json({
          message: 'user id is required for getting categories'
        });
        return;
      }

      // @ts-ignore
      const category = req.category;

      if (!category) {
        throw new Error(`No category found with the id ${req.params.categoryId}`);
      }

      await this.categoryService.deleteCategoryById(category.id, (req.query.userId as string));

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
      const categoryDetails = req.body;

      const user = await this.userService.getUserById(categoryDetails.user_id);

      if(!user){
        res.status(400).send({
          message: 'invalid userId'
        });
        return;
      }

      const createdCategory = await this.categoryService.createCategory({
        name: categoryDetails.name,
        type: categoryDetails.type,
        user_id: categoryDetails.user_id,
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