import { QueryClient, DefaultOptions } from '@tanstack/react-query'
import { errorReporter } from './monitoring'

// Default configuration for all queries
const defaultOptions: DefaultOptions = {
  queries: {
    // Data is considered fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
    
    // Cache data for 10 minutes
    gcTime: 10 * 60 * 1000, // formerly cacheTime
    
    // Retry failed requests 3 times with exponential backoff
    retry: (failureCount, error: any) => {
      // Don't retry on client errors (4xx) except 429 (rate limit)
      if (error?.status >= 400 && error?.status < 500 && error?.status !== 429) {
        return false
      }
      return failureCount < 3
    },
    
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    
    // Refetch on window focus in production, but not in development
    refetchOnWindowFocus: process.env.NODE_ENV === 'production',
    
    // Background refetch interval - every 5 minutes for important data
    refetchInterval: false, // Set per query as needed
    
    // Error handling
    throwOnError: false,
    
    // Network mode - handle offline scenarios
    networkMode: 'online',
  },
  mutations: {
    // Retry mutations once on network errors
    retry: (failureCount, error: any) => {
      if (failureCount >= 1) return false
      // Only retry on network errors, not client errors
      return error?.name === 'NetworkError' || error?.code === 'NETWORK_ERROR'
    },
    
    retryDelay: 1000,
    
    // Network mode for mutations
    networkMode: 'online',
  },
}

// Enhanced error handling and logging
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions,
    queryCache: undefined, // Use default cache
    mutationCache: undefined, // Use default cache
    // Note: logger property removed in newer versions of React Query
    // Logging is now handled through the global error handlers
  })
}

// Global error handler for queries
export const queryErrorHandler = (error: Error, query: any) => {
  const errorMessage = error?.message ?? 'Unknown error occurred'
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Query Error:', errorMessage, query)
  }
  
  // Report to Sentry with context
  errorReporter.captureError(error, {
    tags: {
      queryKey: JSON.stringify(query.queryKey),
      source: 'react_query'
    },
    extra: {
      queryHash: query.queryHash,
      queryKey: query.queryKey,
      variables: query.variables,
    },
    level: 'error'
  })
}

// Global success handler for mutations (optional)
export const mutationSuccessHandler = (data: any, variables: any, context: any, mutation: any) => {
  // Log successful mutations for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('Mutation Success:', {
      mutationKey: mutation.mutationId,
      variables,
      data
    })
  }
  
  // Report important mutations to Sentry as breadcrumbs
  errorReporter.addBreadcrumb(
    `Mutation success: ${mutation.mutationId}`,
    'mutation',
    {
      variables,
      success: true
    }
  )
}

// Global error handler for mutations
export const mutationErrorHandler = (error: Error, variables: any, context: any) => {
  const errorMessage = error?.message ?? 'Unknown mutation error'
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Mutation Error:', errorMessage, { variables, context })
  }
  
  // Report to Sentry
  errorReporter.captureError(error, {
    tags: {
      source: 'react_query_mutation'
    },
    extra: {
      variables,
      context,
    },
    level: 'error'
  })
}

// Query keys for consistent caching
export const queryKeys = {
  // User-related queries
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: string) => [...queryKeys.users.lists(), { filters }] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },
  
  // Auth-related queries
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
    profile: () => [...queryKeys.auth.all, 'profile'] as const,
    claims: () => [...queryKeys.auth.all, 'claims'] as const,
  },
  
  // Test-related queries
  tests: {
    all: ['tests'] as const,
    lists: () => [...queryKeys.tests.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.tests.lists(), filters] as const,
    details: () => [...queryKeys.tests.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tests.details(), id] as const,
    results: (testId: string) => [...queryKeys.tests.detail(testId), 'results'] as const,
  },
  
  // Question-related queries
  questions: {
    all: ['questions'] as const,
    lists: () => [...queryKeys.questions.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.questions.lists(), filters] as const,
    details: () => [...queryKeys.questions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.questions.details(), id] as const,
  },
  
  // Statistics and analytics
  analytics: {
    all: ['analytics'] as const,
    dashboard: () => [...queryKeys.analytics.all, 'dashboard'] as const,
    performance: () => [...queryKeys.analytics.all, 'performance'] as const,
    usage: (timeRange: string) => [...queryKeys.analytics.all, 'usage', timeRange] as const,
  }
} as const

// Helper function to invalidate related queries
export const invalidateQueries = {
  user: (queryClient: QueryClient, userId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    if (userId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) })
    }
  },
  
  auth: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.all })
  },
  
  tests: (queryClient: QueryClient, testId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tests.all })
    if (testId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.tests.detail(testId) })
    }
  },
  
  questions: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.questions.all })
  },
}