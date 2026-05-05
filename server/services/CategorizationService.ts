import CategoryModel from "../models/CategoryModel";

export interface KeywordMapping {
  [categoryId: string]: string[]; // categoryId -> list of keywords
}

export interface CategoryKeywords {
  categoryId: string;
  categoryName: string;
  type: "income" | "expense";
  keywords: string[];
}

export default class CategorizationService {
  private categoryKeywordMap: Map<string, CategoryKeywords> = new Map();

  constructor() {
    this.initializeDefaultKeywords();
  }

  /**
   * Initialize default keyword mappings for common categories
   */
  private initializeDefaultKeywords(): void {
    // Default keyword mappings - will be supplemented from DB
    const defaultMappings: CategoryKeywords[] = [
      {
        categoryId: "",
        categoryName: "Groceries",
        type: "expense",
        keywords: ["grocery", "groceries", "safeway", "costco", "trader joe", "whole foods", "walmart", "kroger", "publix", "food store", "market"],
      },
      {
        categoryId: "",
        categoryName: "Dining Out",
        type: "expense",
        keywords: [
          "restaurant", "cafe", "coffee", "starbucks", "mcdonald", "burger king", "pizza", "sushi", "bar", "pub",
          "diner", "grill", "bistro", "pizzeria", "taco", "ramen", "subway", "chipotle", "panera", "chick-fil-a"
        ],
      },
      {
        categoryId: "",
        categoryName: "Transportation",
        type: "expense",
        keywords: ["gas", "petrol", "fuel", "shell", "exxon", "chevron", "bp", "taxi", "uber", "lyft", "transit", "public transport", "metro", "train"],
      },
      {
        categoryId: "",
        categoryName: "Utilities",
        type: "expense",
        keywords: ["electric", "electricity", "water", "gas bill", "internet", "phone bill", "cable", "wifi", "utility", "power company"],
      },
      {
        categoryId: "",
        categoryName: "Rent",
        type: "expense",
        keywords: ["rent", "landlord", "lease", "apartment", "housing"],
      },
      {
        categoryId: "",
        categoryName: "Entertainment",
        type: "expense",
        keywords: ["movie", "cinema", "netflix", "spotify", "hulu", "disney", "game", "gaming", "entertainment", "ticket", "concert", "theater"],
      },
      {
        categoryId: "",
        categoryName: "Healthcare",
        type: "expense",
        keywords: ["doctor", "hospital", "pharmacy", "medicine", "medical", "health", "clinic", "dental", "dentist", "cvs", "walgreens"],
      },
      {
        categoryId: "",
        categoryName: "Clothing",
        type: "expense",
        keywords: ["clothing", "apparel", "dress", "shirt", "pants", "shoes", "nike", "adidas", "zara", "h&m", "gap", "fashion", "mall"],
      },
      {
        categoryId: "",
        categoryName: "Travel",
        type: "expense",
        keywords: ["hotel", "airbnb", "flight", "airline", "airport", "booking", "expedia", "travel", "resort"],
      },
      {
        categoryId: "",
        categoryName: "Education",
        type: "expense",
        keywords: ["tuition", "school", "university", "college", "education", "course", "training", "book", "textbook"],
      },
      {
        categoryId: "",
        categoryName: "Salary",
        type: "income",
        keywords: ["salary", "paycheck", "payroll", "wages", "income"],
      },
      {
        categoryId: "",
        categoryName: "Investment Returns",
        type: "income",
        keywords: ["dividend", "interest", "return", "investment", "stock", "bond"],
      },
    ];

    // Store defaults temporarily - will be replaced with DB mappings
    defaultMappings.forEach((mapping) => {
      this.categoryKeywordMap.set(mapping.categoryName.toLowerCase(), mapping);
    });
  }

  /**
   * Load actual category IDs from database and map to keywords
   */
  async loadCategoriesFromDatabase(): Promise<void> {
    try {
      const categories = await CategoryModel.findAll();

      const defaultMappings: Record<string, string[]> = {
        groceries: ["grocery", "groceries", "safeway", "costco", "trader joe", "whole foods", "walmart", "kroger", "publix"],
        "dining out": [
          "restaurant", "cafe", "coffee", "starbucks", "mcdonald", "burger king", "pizza", "sushi",
          "bar", "pub", "diner", "grill", "bistro", "pizzeria", "taco", "chipotle", "panera",
        ],
        transportation: ["gas", "petrol", "fuel", "shell", "exxon", "chevron", "bp", "taxi", "uber", "lyft"],
        utilities: ["electric", "electricity", "water", "gas bill", "internet", "phone bill"],
        rent: ["rent", "landlord", "lease", "apartment"],
        entertainment: ["movie", "cinema", "netflix", "spotify", "hulu", "game", "ticket"],
        healthcare: ["doctor", "hospital", "pharmacy", "medicine", "medical", "clinic", "dental"],
        clothing: ["clothing", "apparel", "dress", "shoes", "nike", "adidas", "zara", "h&m"],
        travel: ["hotel", "airbnb", "flight", "airline", "booking"],
        education: ["tuition", "school", "university", "course", "book"],
        salary: ["salary", "paycheck", "payroll", "wages"],
        "investment returns": ["dividend", "interest", "investment"],
      };

      // Clear and rebuild map with actual category IDs
      this.categoryKeywordMap.clear();

      categories.forEach((category) => {
        const categoryName = category.get("name") as string;
        const categoryId = category.get("id") as string;
        const type = category.get("type") as "income" | "expense";
        const keywords = defaultMappings[categoryName.toLowerCase()] || [];

        this.categoryKeywordMap.set(categoryName.toLowerCase(), {
          categoryId,
          categoryName,
          type,
          keywords,
        });
      });
    } catch (error) {
      console.error("Failed to load categories from database:", error);
      // Continue with default mappings if DB fails
    }
  }

  /**
   * Categorize a transaction based on its description
   * Returns the category ID if a match is found, otherwise returns the "Other" category ID
   */
  async categorizTransaction(
    description: string,
    type: "income" | "expense",
    userId: string
  ): Promise<string | null> {
    // Ensure categories are loaded
    if (this.categoryKeywordMap.size === 0) {
      await this.loadCategoriesFromDatabase();
    }

    const lowerDescription = description.toLowerCase();

    // Find matching category based on keywords
    for (const [categoryName, categoryData] of this.categoryKeywordMap) {
      // Type must match (income or expense)
      if (categoryData.type !== type) continue;

      // Check if any keyword matches the description
      for (const keyword of categoryData.keywords) {
        if (lowerDescription.includes(keyword)) {
          return categoryData.categoryId;
        }
      }
    }

    // Fallback to "Other" category if no match found
    const otherCategory = await CategoryModel.findOne({
      where: {
        name: "Other",
        type: type,
      },
    });

    return otherCategory?.get("id") as string || null;
  }

  /**
   * Get all available category keywords for a specific type
   */
  async getAvailableCategories(type?: "income" | "expense"): Promise<CategoryKeywords[]> {
    if (this.categoryKeywordMap.size === 0) {
      await this.loadCategoriesFromDatabase();
    }

    return Array.from(this.categoryKeywordMap.values()).filter(
      (cat) => !type || cat.type === type
    );
  }

  /**
   * Update keywords for a specific category (for future enhancement)
   */
  async updateCategoryKeywords(categoryId: string, keywords: string[]): Promise<void> {
    // This would persist custom keyword mappings per user
    // For MVP, we'll keep it simple with default mappings
    for (const [, categoryData] of this.categoryKeywordMap) {
      if (categoryData.categoryId === categoryId) {
        categoryData.keywords = keywords;
        break;
      }
    }
  }
}
