export interface CategorizableCategory {
  id: string
  name: string
  type: 'income' | 'expense'
}

export interface CategoryKeywordRule {
  keyword: string
  category_id: string
}

export interface CategoryKeywordMapping {
  id: string
  category_id: string
  category_name: string
  category_type: 'income' | 'expense'
  keywords: string[]
}

/** Keyword lists keyed by lowercase category name — mirrors server CategorizationService defaults. */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  groceries: ['grocery', 'groceries', 'safeway', 'costco', 'trader joe', 'whole foods', 'walmart', 'kroger', 'publix', 'food store', 'market'],
  'dining out': [
    'restaurant', 'cafe', 'coffee', 'starbucks', 'mcdonald', 'burger king', 'pizza', 'sushi', 'bar', 'pub',
    'diner', 'grill', 'bistro', 'pizzeria', 'taco', 'ramen', 'subway', 'chipotle', 'panera', 'chick-fil-a',
  ],
  transportation: ['gas', 'petrol', 'fuel', 'shell', 'exxon', 'chevron', 'bp', 'taxi', 'uber', 'lyft', 'transit', 'public transport', 'metro', 'train'],
  utilities: ['electric', 'electricity', 'water', 'gas bill', 'internet', 'phone bill', 'cable', 'wifi', 'utility', 'power company'],
  rent: ['rent', 'landlord', 'lease', 'apartment', 'housing'],
  entertainment: ['movie', 'cinema', 'netflix', 'spotify', 'hulu', 'disney', 'game', 'gaming', 'entertainment', 'ticket', 'concert', 'theater'],
  healthcare: ['doctor', 'hospital', 'pharmacy', 'medicine', 'medical', 'health', 'clinic', 'dental', 'dentist', 'cvs', 'walgreens'],
  clothing: ['clothing', 'apparel', 'dress', 'shirt', 'pants', 'shoes', 'nike', 'adidas', 'zara', 'h&m', 'gap', 'fashion', 'mall'],
  travel: ['hotel', 'airbnb', 'flight', 'airline', 'airport', 'booking', 'expedia', 'travel', 'resort'],
  education: ['tuition', 'school', 'university', 'college', 'education', 'course', 'training', 'book', 'textbook'],
  salary: ['salary', 'paycheck', 'payroll', 'wages', 'income'],
  'investment returns': ['dividend', 'interest', 'return', 'investment', 'stock', 'bond'],
}

export function flattenCategoryKeywordMappings(mappings: CategoryKeywordMapping[] | undefined | null): CategoryKeywordRule[] {
  const rules: CategoryKeywordRule[] = []

  for (const mapping of mappings ?? []) {
    for (const keyword of mapping.keywords ?? []) {
      if (!keyword) continue
      rules.push({
        keyword,
        category_id: mapping.category_id,
      })
    }
  }

  return rules
}

export function categorizeTransaction(
  description: string,
  type: 'income' | 'expense',
  categories: CategorizableCategory[],
  userRules: CategoryKeywordRule[] = [],
): string | null {
  const lowerDescription = description.toLowerCase()
  const categoryById = new Map(categories.map((category) => [category.id, category]))

  for (const rule of userRules) {
    const category = categoryById.get(rule.category_id)
    if (!category || category.type !== type) continue
    if (lowerDescription.includes(rule.keyword)) {
      return rule.category_id
    }
  }

  for (const category of categories) {
    if (category.type !== type) continue

    const keywords = CATEGORY_KEYWORDS[category.name.toLowerCase()] ?? []
    for (const keyword of keywords) {
      if (lowerDescription.includes(keyword)) {
        return category.id
      }
    }
  }

  const otherCategory = categories.find((category) => category.name === 'Other' && category.type === type)
  return otherCategory?.id ?? null
}

export interface ImportRowInput {
  amount: number
  type: 'income' | 'expense'
  description: string
  date: string
  category_id?: string
}

export interface ImportReviewTransaction {
  index: number
  amount: number
  description: string
  date: string
  type: 'income' | 'expense'
  category_id: string
}

export interface BuiltImportReview {
  transactions: ImportReviewTransaction[]
  categorizedCount: number
}

export function buildImportReview(
  rows: ImportRowInput[],
  categories: CategorizableCategory[],
  userRules: CategoryKeywordRule[] = [],
): BuiltImportReview {
  let categorizedCount = 0

  const transactions = rows.map((row, index) => {
    let categoryId = row.category_id

    if (!categoryId) {
      categoryId = categorizeTransaction(row.description, row.type, categories, userRules) ?? undefined
      if (categoryId) categorizedCount += 1
    }

    return {
      index,
      amount: row.amount,
      description: row.description,
      date: row.date,
      type: row.type,
      category_id: categoryId ?? '',
    }
  })

  return { transactions, categorizedCount }
}
