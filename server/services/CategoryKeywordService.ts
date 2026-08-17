import CategoryKeywordModel from '../models/CategoryKeywordModel';
import CategoryModel from '../models/CategoryModel';
import CategoryService from './CategoryService';

export const MAX_KEYWORDS_PER_CATEGORY = 50;
export const MAX_KEYWORDS_PER_USER = 200;

export interface CategoryKeywordMappingRecord {
  id: string;
  category_id: string;
  category_name: string;
  category_type: 'income' | 'expense';
  keywords: string[];
}

export default class CategoryKeywordService {
  private categoryService: CategoryService;

  constructor(categoryService?: CategoryService) {
    this.categoryService = categoryService ?? new CategoryService();
  }

  normalizeKeyword(keyword: string): string {
    return keyword.trim().toLowerCase();
  }

  private normalizeKeywords(keywords: unknown): string[] {
    if (!Array.isArray(keywords)) {
      return [];
    }

    const normalized: string[] = [];
    for (const entry of keywords) {
      if (typeof entry !== 'string') continue;
      const value = this.normalizeKeyword(entry);
      if (!value || value.length > 100) continue;
      if (!normalized.includes(value)) {
        normalized.push(value);
      }
    }

    return normalized;
  }

  async getMappingsForUser(userId: string): Promise<CategoryKeywordMappingRecord[]> {
    const rows = await CategoryKeywordModel.findAll({
      where: { user_id: userId },
      order: [['updatedAt', 'DESC']],
    });

    if (rows.length === 0) {
      return [];
    }

    const categoryIds = [...new Set(rows.map((row) => row.get('category_id') as string))];
    const categories = await CategoryModel.findAll({
      where: { id: categoryIds },
    });
    const categoryById = new Map(categories.map((category) => [category.get('id') as string, category]));

    const mappings: CategoryKeywordMappingRecord[] = [];

    for (const row of rows) {
      const categoryId = row.get('category_id') as string;
      const category = categoryById.get(categoryId);
      if (!category) continue;

      const keywords = this.normalizeKeywords(row.get('keywords'));
      if (keywords.length === 0) continue;

      mappings.push({
        id: row.get('id') as string,
        category_id: categoryId,
        category_name: category.get('name') as string,
        category_type: category.get('type') as 'income' | 'expense',
        keywords,
      });
    }

    return mappings;
  }

  private async getTotalKeywordCount(userId: string): Promise<number> {
    const rows = await CategoryKeywordModel.findAll({
      where: { user_id: userId },
    });

    return rows.reduce((count, row) => {
      return count + this.normalizeKeywords(row.get('keywords')).length;
    }, 0);
  }

  private async findKeywordOwner(userId: string, keyword: string, excludeMappingId?: string) {
    const rows = await CategoryKeywordModel.findAll({
      where: { user_id: userId },
    });

    for (const row of rows) {
      if (excludeMappingId && row.get('id') === excludeMappingId) continue;
      const keywords = this.normalizeKeywords(row.get('keywords'));
      if (keywords.includes(keyword)) {
        return row;
      }
    }

    return null;
  }

  async addKeyword(userId: string, categoryId: string, rawKeyword: string): Promise<CategoryKeywordMappingRecord> {
    const keyword = this.normalizeKeyword(rawKeyword);
    if (!keyword) {
      throw new Error('Keyword cannot be empty');
    }
    if (keyword.length > 100) {
      throw new Error('Keyword must be 100 characters or fewer');
    }

    const category = await this.categoryService.getCategoryById(categoryId, userId);
    if (!category) {
      throw new Error('Category not found or not accessible');
    }

    const existingOwner = await this.findKeywordOwner(userId, keyword);
    if (existingOwner) {
      const conflict = new Error('This keyword is already mapped to another category');
      (conflict as Error & { statusCode?: number }).statusCode = 409;
      throw conflict;
    }

    let row = await CategoryKeywordModel.findOne({
      where: { user_id: userId, category_id: categoryId },
    });

    const currentKeywords = row ? this.normalizeKeywords(row.get('keywords')) : [];
    if (currentKeywords.includes(keyword)) {
      const duplicate = new Error('This keyword is already added for this category');
      (duplicate as Error & { statusCode?: number }).statusCode = 409;
      throw duplicate;
    }

    const totalKeywords = await this.getTotalKeywordCount(userId);
    if (totalKeywords >= MAX_KEYWORDS_PER_USER) {
      throw new Error(`You can store up to ${MAX_KEYWORDS_PER_USER} keywords total`);
    }

    if (currentKeywords.length >= MAX_KEYWORDS_PER_CATEGORY) {
      throw new Error(`You can store up to ${MAX_KEYWORDS_PER_CATEGORY} keywords per category`);
    }

    const nextKeywords = [...currentKeywords, keyword];

    if (row) {
      row.set('keywords', nextKeywords);
      await row.save();
    } else {
      row = await CategoryKeywordModel.create({
        user_id: userId,
        category_id: categoryId,
        keywords: nextKeywords,
      });
    }

    return {
      id: row.get('id') as string,
      category_id: categoryId,
      category_name: category.get('name') as string,
      category_type: category.get('type') as 'income' | 'expense',
      keywords: nextKeywords,
    };
  }

  async removeKeyword(userId: string, mappingId: string, rawKeyword: string): Promise<void> {
    const keyword = this.normalizeKeyword(rawKeyword);
    if (!keyword) {
      throw new Error('Keyword cannot be empty');
    }

    const row = await CategoryKeywordModel.findOne({
      where: { id: mappingId, user_id: userId },
    });

    if (!row) {
      throw new Error('Keyword mapping not found');
    }

    const nextKeywords = this.normalizeKeywords(row.get('keywords')).filter((entry) => entry !== keyword);
    if (nextKeywords.length === 0) {
      await row.destroy();
      return;
    }

    row.set('keywords', nextKeywords);
    await row.save();
  }
}
