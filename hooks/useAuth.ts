import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth as useAuthContext } from '@/app/context/AuthContext'
import { queryKeys, mutationErrorHandler, mutationSuccessHandler } from '@/lib/react-query'
import { monitor } from '@/lib/monitoring'

// Enhanced auth hooks that integrate React Query with Firebase Auth
export function useAuthQuery() {
  const { user, firebaseUser, loading } = useAuthContext()
  
  // Query for user profile data with React Query caching
  const profileQuery = useQuery({
    queryKey: queryKeys.auth.profile(),
    queryFn: async () => {
      if (!firebaseUser) return null
      
      return monitor.monitorApiCall('/api/user/profile', async () => {
        const response = await fetch('/api/user/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${await firebaseUser.getIdToken()}`
          }
        })
        
        if (!response.ok) {
          throw new Error(`Profile fetch failed: ${response.statusText}`)
        }
        
        return response.json()
      })
    },
    enabled: !!firebaseUser && !loading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  })
  
  // Query for user claims/permissions
  const claimsQuery = useQuery({
    queryKey: queryKeys.auth.claims(),
    queryFn: async () => {
      if (!firebaseUser) return null
      
      return monitor.monitorApiCall('/api/auth/claims', async () => {
        const response = await fetch('/api/auth/claims', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: await firebaseUser.getIdToken()
          })
        })
        
        if (!response.ok) {
          throw new Error(`Claims fetch failed: ${response.statusText}`)
        }
        
        const data = await response.json()
        return data.claims
      })
    },
    enabled: !!firebaseUser && !loading,
    staleTime: 10 * 60 * 1000, // Claims are cached for 10 minutes
    gcTime: 15 * 60 * 1000,
    retry: 1, // Claims are critical, retry once
  })
  
  return {
    user,
    firebaseUser,
    loading,
    profile: profileQuery.data,
    claims: claimsQuery.data,
    isProfileLoading: profileQuery.isLoading,
    isClaimsLoading: claimsQuery.isLoading,
    profileError: profileQuery.error,
    claimsError: claimsQuery.error,
    refetchProfile: profileQuery.refetch,
    refetchClaims: claimsQuery.refetch,
  }
}

// Profile update mutation
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { firebaseUser } = useAuthContext()
  
  return useMutation({
    mutationFn: async (profileData: any) => {
      if (!firebaseUser) {
        throw new Error('User not authenticated')
      }
      
      return monitor.monitorApiCall('/api/user/profile', async () => {
        const response = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await firebaseUser.getIdToken()}`
          },
          body: JSON.stringify(profileData)
        })
        
        if (!response.ok) {
          throw new Error(`Profile update failed: ${response.statusText}`)
        }
        
        return response.json()
      })
    },
    onSuccess: (data, variables, context) => {
      // Invalidate and refetch profile data
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile() })
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() })
      
      // Update the cache optimistically
      queryClient.setQueryData(queryKeys.auth.profile(), data)
      
      mutationSuccessHandler(data, variables, context, { mutationId: 'updateProfile' })
    },
    onError: mutationErrorHandler,
  })
}

// Login mutation (for additional post-login processing)
export function useLoginMutation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      return monitor.monitorApiCall('/api/auth/login', async () => {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials)
        })
        
        if (!response.ok) {
          throw new Error(`Login failed: ${response.statusText}`)
        }
        
        return response.json()
      })
    },
    onSuccess: (data, variables, context) => {
      // Clear all cached data and refetch
      queryClient.clear()
      
      // Set user data if returned
      if (data.user) {
        queryClient.setQueryData(queryKeys.auth.user(), data.user)
      }
      
      mutationSuccessHandler(data, variables, context, { mutationId: 'login' })
    },
    onError: mutationErrorHandler,
  })
}

// Logout mutation
export function useLogoutMutation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      return monitor.monitorApiCall('/api/auth/logout', async () => {
        const response = await fetch('/api/auth/logout', {
          method: 'POST',
        })
        
        if (!response.ok) {
          throw new Error(`Logout failed: ${response.statusText}`)
        }
        
        return response.json()
      })
    },
    onSuccess: (data, variables, context) => {
      // Clear all cached data
      queryClient.clear()
      
      mutationSuccessHandler(data, variables, context, { mutationId: 'logout' })
    },
    onError: mutationErrorHandler,
  })
}