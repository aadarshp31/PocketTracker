import CategoryModel from "../models/CategoryModel";
import { FindOptions, Op, where } from "sequelize";
import Category from "../interfaces/Category";

export default class CategoryService {

  constructor() { }

  async getAllCategories(userId: string, options?: FindOptions) {
    return await CategoryModel.findAll({
      limit: 100, ...options, where: {
        [Op.or]: [
          { "is_default": true },
          { "user_id": userId }
        ]
      }
    });
  }

  async getCategoryById(categoryId: string, userId: string) {
    return await CategoryModel.findOne({
      where: {
        [Op.and]: [
          { id: categoryId },
          {
            [Op.or]: [
              { is_default: true },
              { user_id: userId }
            ]
          }
        ]
      }
    });
  }

  async createCategory(category: Category) {
    return await CategoryModel.create({
      name: category.name,
      type: category.type,
      user_id: category.user_id ? category.user_id : null,
      is_default: category.is_default ? category.is_default : false
    })
  }

  async updateCategoryById(categoryId: string, categoryDetails: Category, userId: string) {
    const category = await CategoryModel.findOne({
      where: {
        [Op.and]: [
          { "id": categoryId },
          { "is_default": false },
          { "user_id": userId }
        ]
      }
    });

    if (!category) {
      throw new Error(`No category found with the id ${categoryId}`);
    }

    if (category.get("is_default")) {
      throw new Error(`Default categories cannot be updated`);
    }

    if (categoryDetails.name) category.set("name", categoryDetails.name);
    if (categoryDetails.type) category.set("type", categoryDetails.type);
    return await category.save();
  }

  async deleteCategoryById(categoryId: string, userId: string) {
    const category = await CategoryModel.findOne({
      where: {
        [Op.and]: [
          { "id": categoryId },
          { "is_default": false },
          { "user_id": userId }
        ]
      }
    });

    if (category === null) {
      throw new Error(`No category found with the id ${categoryId}`);
    }

    if (category.isSoftDeleted()) {
      throw new Error(`Category has already been deleted on date ${category.get("deletedAt")}`);
    }

    await category.destroy();
  }

  async createBulk(categories: Category[]) {
    const records = categories.map((cat) => ({ id: cat.id, name: cat.name, type: cat.type, user_id: cat.user_id, is_default: cat.is_default, createdAt: cat.createdAt, updatedAt: cat.updatedAt }));
    const createdRecords = await CategoryModel.bulkCreate(records);
    return createdRecords;
  }
}