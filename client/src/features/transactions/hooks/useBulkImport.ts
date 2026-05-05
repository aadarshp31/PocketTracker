import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bulkImportPreview, bulkImportSubmit, type BulkImportPayload } from '../api/bulkImport'

export function useBulkImportPreview() {
  return useMutation({
    mutationFn: (payload: BulkImportPayload) => bulkImportPreview(payload),
  })
}

export function useBulkImportSubmit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: BulkImportPayload) => bulkImportSubmit(payload),
    onSuccess: () => {
      // Invalidate transactions and insights caches
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['insights'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['daily-pattern'] })
      queryClient.invalidateQueries({ queryKey: ['monthly-trend'] })
      queryClient.invalidateQueries({ queryKey: ['spikes'] })
      queryClient.invalidateQueries({ queryKey: ['projection'] })
    },
  })
}
