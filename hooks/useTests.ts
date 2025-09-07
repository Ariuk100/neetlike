import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { useAuth } from '@/app/context/AuthContext'
import { queryKeys, mutationErrorHandler, mutationSuccessHandler } from '@/lib/react-query'
import { monitor } from '@/lib/monitoring'

export interface Test {
  id: string
  title: string
  description: string
  subject: string
  difficulty: 'easy' | 'medium' | 'hard'
  timeLimit: number
  questionCount: number
  createdBy: string
  createdAt: string
  updatedAt: string
  isPublished: boolean
  tags: string[]
}

export interface TestFilters {
  subject?: string
  difficulty?: string
  search?: string
  publishedOnly?: boolean
  createdBy?: string
  page?: number
  limit?: number
}

export interface TestResult {
  id: string
  testId: string
  userId: string
  score: number
  totalQuestions: number
  correctAnswers: number
  timeSpent: number
  completedAt: string
  answers: Record<string, any>
}

// Fetch tests with filters and pagination
export function useTests(filters: TestFilters = {}) {
  const { firebaseUser } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.tests.list(filters),
    queryFn: async () => {
      if (!firebaseUser) {
        throw new Error('Authentication required')
      }
      
      return monitor.monitorApiCall('/api/tests', async () => {
        const searchParams = new URLSearchParams()
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            searchParams.append(key, value.toString())
          }
        })
        
        const response = await fetch(`/api/tests?${searchParams}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${await firebaseUser.getIdToken()}`
          }
        })
        
        if (!response.ok) {
          throw new Error(`Failed to fetch tests: ${response.statusText}`)
        }
        
        return response.json()
      })
    },
    enabled: !!firebaseUser,
    staleTime: 2 * 60 * 1000, // Tests data is fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
    placeholderData: { tests: [], total: 0, page: 1 },
  })
}

// Infinite query for tests (for pagination)
export function useTestsInfinite(filters: Omit<TestFilters, 'page'> = {}) {
  const { firebaseUser } = useAuth()
  
  return useInfiniteQuery({
    queryKey: [...queryKeys.tests.list(filters), 'infinite'],
    queryFn: async ({ pageParam = 1 }) => {
      if (!firebaseUser) {
        throw new Error('Authentication required')
      }
      
      return monitor.monitorApiCall('/api/tests', async () => {
        // Convert all values to strings for URLSearchParams
        const stringFilters = Object.entries(filters).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            acc[key] = String(value)
          }
          return acc
        }, {} as Record<string, string>)
        
        const searchParams = new URLSearchParams({
          ...stringFilters,
          page: pageParam.toString(),
          limit: '10'
        })
        
        const response = await fetch(`/api/tests?${searchParams}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${await firebaseUser.getIdToken()}`
          }
        })
        
        if (!response.ok) {
          throw new Error(`Failed to fetch tests: ${response.statusText}`)
        }
        
        return response.json()
      })
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage
      return page < totalPages ? page + 1 : undefined
    },
    enabled: !!firebaseUser,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

// Fetch single test by ID
export function useTest(testId: string) {
  const { firebaseUser } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.tests.detail(testId),
    queryFn: async () => {
      if (!firebaseUser) {
        throw new Error('Authentication required')
      }
      
      return monitor.monitorDbOperation('read', 'tests', async () => {
        const response = await fetch(`/api/tests/${testId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${await firebaseUser.getIdToken()}`
          }
        })
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Test not found')
          }
          throw new Error(`Failed to fetch test: ${response.statusText}`)
        }
        
        return response.json()
      })
    },
    enabled: !!firebaseUser && !!testId,
    staleTime: 5 * 60 * 1000, // Single test data is fresh for 5 minutes
    gcTime: 10 * 60 * 1000,
  })
}

// Fetch test results
export function useTestResults(testId: string) {
  const { firebaseUser } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.tests.results(testId),
    queryFn: async () => {
      if (!firebaseUser) {
        throw new Error('Authentication required')
      }
      
      return monitor.monitorApiCall(`/api/tests/${testId}/results`, async () => {
        const response = await fetch(`/api/tests/${testId}/results`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${await firebaseUser.getIdToken()}`
          }
        })
        
        if (!response.ok) {
          throw new Error(`Failed to fetch test results: ${response.statusText}`)
        }
        
        return response.json()
      })
    },
    enabled: !!firebaseUser && !!testId,
    staleTime: 30 * 1000, // Results are fresh for 30 seconds
    gcTime: 2 * 60 * 1000,
  })
}

// Create test mutation
export function useCreateTest() {
  const queryClient = useQueryClient()
  const { firebaseUser } = useAuth()
  
  return useMutation({
    mutationFn: async (testData: Partial<Test>) => {
      if (!firebaseUser) {
        throw new Error('Authentication required')
      }
      
      return monitor.monitorDbOperation('create', 'tests', async () => {
        const response = await fetch('/api/tests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await firebaseUser.getIdToken()}`
          },
          body: JSON.stringify(testData)
        })
        
        if (!response.ok) {
          throw new Error(`Failed to create test: ${response.statusText}`)
        }
        
        return response.json()
      })
    },
    onSuccess: (data, variables, context) => {
      // Invalidate tests list to show new test
      queryClient.invalidateQueries({ queryKey: queryKeys.tests.all })
      
      // Add new test to the cache
      queryClient.setQueryData(queryKeys.tests.detail(data.id), data)
      
      mutationSuccessHandler(data, variables, context, { mutationId: 'createTest' })
    },
    onError: mutationErrorHandler,
  })
}

// Update test mutation
export function useUpdateTest() {
  const queryClient = useQueryClient()
  const { firebaseUser } = useAuth()
  
  return useMutation({
    mutationFn: async ({ testId, updates }: { testId: string; updates: Partial<Test> }) => {
      if (!firebaseUser) {
        throw new Error('Authentication required')
      }
      
      return monitor.monitorDbOperation('update', 'tests', async () => {
        const response = await fetch(`/api/tests/${testId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await firebaseUser.getIdToken()}`
          },
          body: JSON.stringify(updates)
        })
        
        if (!response.ok) {
          throw new Error(`Failed to update test: ${response.statusText}`)
        }
        
        return response.json()
      })
    },
    onSuccess: (data, variables, context) => {
      const { testId } = variables
      
      // Update the specific test in cache
      queryClient.setQueryData(queryKeys.tests.detail(testId), data)
      
      // Invalidate tests list to reflect changes
      queryClient.invalidateQueries({ queryKey: queryKeys.tests.all })
      
      mutationSuccessHandler(data, variables, context, { mutationId: 'updateTest' })
    },
    onError: mutationErrorHandler,
  })
}

// Delete test mutation
export function useDeleteTest() {
  const queryClient = useQueryClient()
  const { firebaseUser } = useAuth()
  
  return useMutation({
    mutationFn: async (testId: string) => {
      if (!firebaseUser) {
        throw new Error('Authentication required')
      }
      
      return monitor.monitorDbOperation('delete', 'tests', async () => {
        const response = await fetch(`/api/tests/${testId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${await firebaseUser.getIdToken()}`
          }
        })
        
        if (!response.ok) {
          throw new Error(`Failed to delete test: ${response.statusText}`)
        }
        
        return { id: testId }
      })
    },
    onSuccess: (data, variables, context) => {
      // Remove test from cache
      queryClient.removeQueries({ queryKey: queryKeys.tests.detail(variables) })
      
      // Invalidate tests list
      queryClient.invalidateQueries({ queryKey: queryKeys.tests.all })
      
      mutationSuccessHandler(data, variables, context, { mutationId: 'deleteTest' })
    },
    onError: mutationErrorHandler,
  })
}

// Submit test result mutation
export function useSubmitTestResult() {
  const queryClient = useQueryClient()
  const { firebaseUser } = useAuth()
  
  return useMutation({
    mutationFn: async (resultData: {
      testId: string
      answers: Record<string, any>
      timeSpent: number
    }) => {
      if (!firebaseUser) {
        throw new Error('Authentication required')
      }
      
      return monitor.monitorApiCall('/api/tests/submit', async () => {
        const response = await fetch('/api/tests/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await firebaseUser.getIdToken()}`
          },
          body: JSON.stringify(resultData)
        })
        
        if (!response.ok) {
          throw new Error(`Failed to submit test result: ${response.statusText}`)
        }
        
        return response.json()
      })
    },
    onSuccess: (data, variables, context) => {
      const { testId } = variables
      
      // Invalidate test results to show new submission
      queryClient.invalidateQueries({ queryKey: queryKeys.tests.results(testId) })
      
      mutationSuccessHandler(data, variables, context, { mutationId: 'submitTestResult' })
    },
    onError: mutationErrorHandler,
  })
}