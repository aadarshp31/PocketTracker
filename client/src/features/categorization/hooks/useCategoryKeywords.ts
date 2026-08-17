import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/contexts/AuthContext'
import {
  addCategoryKeyword,
  getCategoryKeywords,
  removeCategoryKeyword,
  type AddCategoryKeywordPayload,
  type RemoveCategoryKeywordPayload,
} from '../api/categoryKeywords'
import {
  flattenCategoryKeywordMappings,
  type CategoryKeywordMapping,
  type CategoryKeywordRule,
} from '../../../shared/utils/categorizeTransaction'

export function useCategoryKeywordMappings() {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['category-keywords'],
    queryFn: () => getCategoryKeywords(),
    enabled: isAuthenticated,
    select: (data) => data.mappings,
  })
}

export function useCategoryKeywordRules(): {
  mappings: CategoryKeywordMapping[]
  rules: CategoryKeywordRule[]
  isLoading: boolean
  isError: boolean
} {
  const query = useCategoryKeywordMappings()

  return {
    mappings: query.data ?? [],
    rules: flattenCategoryKeywordMappings(query.data ?? []),
    isLoading: query.isLoading,
    isError: query.isError,
  }
}

export function useAddCategoryKeyword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: AddCategoryKeywordPayload) => addCategoryKeyword(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['category-keywords'] })
    },
  })
}

export function useRemoveCategoryKeyword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: RemoveCategoryKeywordPayload) => removeCategoryKeyword(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['category-keywords'] })
    },
  })
}
