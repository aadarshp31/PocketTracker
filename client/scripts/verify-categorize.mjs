/**
 * Smoke test for bulk-import categorization (run: node scripts/verify-categorize.mjs)
 */
const CATEGORY_KEYWORDS = {
  groceries: ['grocery', 'safeway', 'costco'],
  'dining out': ['starbucks', 'restaurant', 'coffee'],
  transportation: ['uber', 'lyft', 'taxi'],
  salary: ['salary', 'payroll', 'paycheck'],
}

function categorizeTransaction(description, type, categories) {
  const lowerDescription = description.toLowerCase()
  for (const category of categories) {
    if (category.type !== type) continue
    const keywords = CATEGORY_KEYWORDS[category.name.toLowerCase()] ?? []
    for (const keyword of keywords) {
      if (lowerDescription.includes(keyword)) return category.id
    }
  }
  return categories.find((c) => c.name === 'Other' && c.type === type)?.id ?? null
}

function buildImportReview(rows, categories) {
  let categorizedCount = 0
  const transactions = rows.map((row, index) => {
    let categoryId = row.category_id
    if (!categoryId) {
      categoryId = categorizeTransaction(row.description, row.type, categories) ?? undefined
      if (categoryId) categorizedCount += 1
    }
    return { index, ...row, category_id: categoryId ?? '' }
  })
  return { transactions, categorizedCount }
}

const categories = [
  { id: 'cat-groc', name: 'Groceries', type: 'expense' },
  { id: 'cat-dining', name: 'Dining Out', type: 'expense' },
  { id: 'cat-transport', name: 'Transportation', type: 'expense' },
  { id: 'cat-other-exp', name: 'Other', type: 'expense' },
  { id: 'cat-salary', name: 'Salary', type: 'income' },
  { id: 'cat-other-inc', name: 'Other', type: 'income' },
]

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(categorizeTransaction('STARBUCKS COFFEE', 'expense', categories) === 'cat-dining', 'starbucks -> dining')
assert(categorizeTransaction('UBER TRIP', 'expense', categories) === 'cat-transport', 'uber -> transport')
assert(categorizeTransaction('RANDOM MERCHANT', 'expense', categories) === 'cat-other-exp', 'unknown -> other')
assert(categorizeTransaction('PAYROLL DEPOSIT', 'income', categories) === 'cat-salary', 'payroll -> salary')

const review = buildImportReview([
  { amount: 10, type: 'expense', description: 'UBER TRIP', date: '2026-01-01' },
  { amount: 20, type: 'expense', description: 'CUSTOM', date: '2026-01-02', category_id: 'cat-groc' },
], categories)

assert(review.transactions.length === 2, 'two review rows')
assert(review.transactions[0].category_id === 'cat-transport', 'uber auto categorized')
assert(review.transactions[1].category_id === 'cat-groc', 'manual category preserved')
assert(review.categorizedCount === 1, 'one auto categorized row')

console.log('Bulk import categorization smoke tests passed')
