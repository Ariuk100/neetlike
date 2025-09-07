import * as Sentry from '@sentry/nextjs'

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private marks: Map<string, number> = new Map()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  // Start timing an operation
  startTiming(operationName: string): void {
    const startTime = performance.now()
    this.marks.set(operationName, startTime)
    
    if (typeof window !== 'undefined') {
      performance.mark(`${operationName}-start`)
    }
  }

  // End timing and report to Sentry
  endTiming(operationName: string, context?: Record<string, any>): number {
    const endTime = performance.now()
    const startTime = this.marks.get(operationName)
    
    if (!startTime) {
      console.warn(`No start time found for operation: ${operationName}`)
      return 0
    }

    const duration = endTime - startTime
    this.marks.delete(operationName)

    // Mark end for browser performance API
    if (typeof window !== 'undefined') {
      performance.mark(`${operationName}-end`)
      performance.measure(operationName, `${operationName}-start`, `${operationName}-end`)
    }

    // Report to Sentry if duration is significant
    if (duration > 100) { // Only report operations > 100ms
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `Operation ${operationName} took ${Math.round(duration)}ms`,
        level: duration > 1000 ? 'warning' : 'info',
        data: {
          operationName,
          duration: Math.round(duration),
          ...context
        }
      })
    }

    return duration
  }

  // Monitor async operations
  async monitorAsync<T>(
    operationName: string,
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    this.startTiming(operationName)
    
    try {
      const result = await operation()
      this.endTiming(operationName, { ...context, success: true })
      return result
    } catch (error) {
      this.endTiming(operationName, { ...context, success: false, error: error instanceof Error ? error.message : 'Unknown error' })
      throw error
    }
  }

  // Monitor React component render performance
  monitorComponentRender(componentName: string): {
    startRender: () => void
    endRender: () => void
  } {
    return {
      startRender: () => this.startTiming(`render-${componentName}`),
      endRender: () => this.endTiming(`render-${componentName}`, { component: componentName })
    }
  }

  // Report custom metrics
  reportMetric(name: string, value: number, tags?: Record<string, string>): void {
    Sentry.setMeasurement(name, value, 'millisecond')
    Sentry.addBreadcrumb({
      category: 'metric',
      message: `Custom metric: ${name} = ${value}`,
      level: 'info',
      data: { name, value, ...tags }
    })
  }

  // Monitor API call performance
  async monitorApiCall<T>(
    url: string,
    operation: () => Promise<T>
  ): Promise<T> {
    return this.monitorAsync(`api-call`, operation, { url })
  }

  // Monitor database operations
  async monitorDbOperation<T>(
    operation: string,
    collection: string,
    operation_fn: () => Promise<T>
  ): Promise<T> {
    return this.monitorAsync(`db-${operation}`, operation_fn, { 
      operation, 
      collection 
    })
  }
}

// Error reporting utilities
export class ErrorReporter {
  static captureError(
    error: Error, 
    context?: {
      user?: { id: string; email?: string; role?: string }
      tags?: Record<string, string>
      extra?: Record<string, any>
      level?: 'error' | 'warning' | 'info'
    }
  ): void {
    Sentry.withScope((scope) => {
      if (context?.user) {
        scope.setUser(context.user)
      }
      
      if (context?.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value)
        })
      }
      
      if (context?.extra) {
        Object.entries(context.extra).forEach(([key, value]) => {
          scope.setExtra(key, value)
        })
      }
      
      if (context?.level) {
        scope.setLevel(context.level)
      }
      
      Sentry.captureException(error)
    })
  }

  static captureMessage(
    message: string,
    level: 'error' | 'warning' | 'info' = 'info',
    context?: Record<string, any>
  ): void {
    Sentry.withScope((scope) => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value)
        })
      }
      
      scope.setLevel(level)
      Sentry.captureMessage(message)
    })
  }

  static setUserContext(user: { 
    id: string
    email?: string
    role?: string
    [key: string]: any
  }): void {
    Sentry.setUser(user)
  }

  static clearUserContext(): void {
    Sentry.setUser(null)
  }

  static addBreadcrumb(
    message: string,
    category: string,
    data?: Record<string, any>,
    level: 'error' | 'warning' | 'info' | 'debug' = 'info'
  ): void {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level,
      timestamp: Date.now() / 1000
    })
  }
}

// React Hook for performance monitoring
export function usePerformanceMonitor() {
  const monitor = PerformanceMonitor.getInstance()
  
  return {
    startTiming: monitor.startTiming.bind(monitor),
    endTiming: monitor.endTiming.bind(monitor),
    monitorAsync: monitor.monitorAsync.bind(monitor),
    reportMetric: monitor.reportMetric.bind(monitor),
    monitorApiCall: monitor.monitorApiCall.bind(monitor),
  }
}

// Web Vitals monitoring
export function initWebVitalsMonitoring(): void {
  if (typeof window === 'undefined') return

  // Monitor Core Web Vitals - Updated to use new API
  import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
    onCLS((metric: any) => {
      Sentry.setMeasurement('CLS', metric.value, '')
    })

    // onFID is deprecated, use onINP instead
    onINP((metric: any) => {
      Sentry.setMeasurement('INP', metric.value, 'millisecond')
    })

    onFCP((metric: any) => {
      Sentry.setMeasurement('FCP', metric.value, 'millisecond')
    })

    onLCP((metric: any) => {
      Sentry.setMeasurement('LCP', metric.value, 'millisecond')
    })

    onTTFB((metric: any) => {
      Sentry.setMeasurement('TTFB', metric.value, 'millisecond')
    })
  }).catch(console.warn)

  // Monitor memory usage
  if ('memory' in performance) {
    const memoryInfo = (performance as any).memory
    Sentry.setMeasurement('memory.used', memoryInfo.usedJSHeapSize, 'byte')
    Sentry.setMeasurement('memory.total', memoryInfo.totalJSHeapSize, 'byte')
  }
}

export const monitor = PerformanceMonitor.getInstance()
export const errorReporter = ErrorReporter