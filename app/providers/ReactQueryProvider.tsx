'use client'

import React, { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createQueryClient } from '@/lib/react-query'
import { monitor } from '@/lib/monitoring'

interface ReactQueryProviderProps {
  children: React.ReactNode
}

export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  // Create a stable QueryClient instance
  const [queryClient] = useState(() => {
    const client = createQueryClient()
    
    // Add global event listeners for monitoring
    client.getQueryCache().subscribe((event) => {
      const { query, type } = event
      
      // Monitor query performance
      if (type === 'updated') {
        const queryKey = JSON.stringify(query.queryKey)
        const state = query.state
        
        // Track successful queries
        if (state.status === 'success' && state.dataUpdatedAt > 0) {
          monitor.reportMetric(
            'query_success_time',
            Date.now() - state.dataUpdatedAt,
            {
              queryKey: queryKey.substring(0, 50), // Truncate for readability
              fromCache: state.status === 'success' ? 'true' : 'false'
            }
          )
        }
        
        // Track query errors
        if (state.status === 'error' && state.error) {
          monitor.reportMetric('query_error_count', 1, {
            queryKey: queryKey.substring(0, 50),
            errorType: state.error.constructor.name
          })
        }
      }
    })
    
    // Monitor mutations
    client.getMutationCache().subscribe((event) => {
      const { mutation, type } = event
      
      if (type === 'updated') {
        const state = mutation.state
        
        // Track successful mutations
        if (state.status === 'success') {
          monitor.reportMetric('mutation_success_count', 1, {
            mutationKey: mutation.mutationId?.toString() || 'unknown'
          })
        }
        
        // Track mutation errors
        if (state.status === 'error' && state.error) {
          monitor.reportMetric('mutation_error_count', 1, {
            mutationKey: mutation.mutationId?.toString() || 'unknown',
            errorType: state.error.constructor.name
          })
        }
      }
    })
    
    return client
  })

  // Performance monitoring for React Query operations
  React.useEffect(() => {
    const unsubscribeQuery = queryClient.getQueryCache().subscribe((event) => {
      const { query, type } = event
      
      if (type === 'added') {
        // Start timing when query is added
        const queryKey = JSON.stringify(query.queryKey)
        monitor.startTiming(`query:${queryKey}`)
      } else if (type === 'updated') {
        const queryKey = JSON.stringify(query.queryKey)
        const state = query.state
        
        // End timing when query completes (success or error)
        if (state.status === 'success' || state.status === 'error') {
          monitor.endTiming(`query:${queryKey}`, {
            status: state.status,
            fromCache: state.status === 'success',
            queryKey: queryKey.substring(0, 100)
          })
        }
      }
    })

    const unsubscribeMutation = queryClient.getMutationCache().subscribe((event) => {
      const { mutation, type } = event
      
      if (type === 'added') {
        // Start timing when mutation is added
        const mutationKey = mutation.mutationId?.toString() || 'unknown'
        monitor.startTiming(`mutation:${mutationKey}`)
      } else if (type === 'updated') {
        const mutationKey = mutation.mutationId?.toString() || 'unknown'
        const state = mutation.state
        
        // End timing when mutation completes
        if (state.status === 'success' || state.status === 'error') {
          monitor.endTiming(`mutation:${mutationKey}`, {
            status: state.status,
            mutationKey
          })
        }
      }
    })

    return () => {
      unsubscribeQuery()
      unsubscribeMutation()
    }
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-right"
          errorTypes={[
            { name: 'Error', initializer: (query) => new Error(query.state.error?.message) },
          ]}
        />
      )}
    </QueryClientProvider>
  )
}