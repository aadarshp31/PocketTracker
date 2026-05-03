import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateProfile, type UpdateProfilePayload } from '../api/updateProfile'

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}