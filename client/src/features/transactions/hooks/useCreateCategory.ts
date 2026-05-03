import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createCategory, type CreateCategoryPayload } from '../api/createCategory'

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateCategoryPayload) => createCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['insights'] })
    },
  })
}