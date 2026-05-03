import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTransaction, type CreateTransactionPayload } from '../api/createTransaction'

export function useCreateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateTransactionPayload) => createTransaction(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['insights'] })
    },
  })
}
