import { useEffect, useMemo, useState } from 'react'
import {
  categorizeTransaction,
  type CategorizableCategory,
  type CategoryKeywordRule,
} from '../../../shared/utils/categorizeTransaction'

interface UseAutoCategorizeOptions {
  description: string
  type: 'income' | 'expense'
  categories: CategorizableCategory[]
  userRules: CategoryKeywordRule[]
  categoryManuallySet: boolean
  enabled?: boolean
  debounceMs?: number
}

export function useAutoCategorize({
  description,
  type,
  categories,
  userRules,
  categoryManuallySet,
  enabled = true,
  debounceMs = 300,
}: UseAutoCategorizeOptions): string | null {
  const [suggestedCategoryId, setSuggestedCategoryId] = useState<string | null>(null)

  const trimmedDescription = description.trim()

  const matchInput = useMemo(
    () => ({
      description: trimmedDescription,
      type,
      categories,
      userRules,
      categoryManuallySet,
      enabled,
    }),
    [trimmedDescription, type, categories, userRules, categoryManuallySet, enabled],
  )

  useEffect(() => {
    if (!matchInput.enabled || matchInput.categoryManuallySet || !matchInput.description) {
      setSuggestedCategoryId(null)
      return
    }

    const timer = window.setTimeout(() => {
      const nextCategoryId = categorizeTransaction(
        matchInput.description,
        matchInput.type,
        matchInput.categories,
        matchInput.userRules,
      )
      setSuggestedCategoryId(nextCategoryId)
    }, debounceMs)

    return () => window.clearTimeout(timer)
  }, [matchInput, debounceMs])

  return suggestedCategoryId
}
