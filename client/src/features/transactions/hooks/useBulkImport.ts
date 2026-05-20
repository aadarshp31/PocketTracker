import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { bulkImportPreview, bulkImportSubmit, getBulkImportConfig, type BulkImportPayload } from '../api/bulkImport'

export function useBulkImportConfig() {
  return useQuery({
    queryKey: ['bulk-import-config'],
    queryFn: getBulkImportConfig,
    staleTime: 5 * 60 * 1000,
  })
}

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
