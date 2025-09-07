import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Error monitoring
  beforeSend(event, hint) {
    // Filter out certain errors
    if (event.exception) {
      const error = hint.originalException
      
      // Skip network errors
      if (error?.name === 'NetworkError') return null
      
      // Skip cancelled requests
      if (error?.message?.includes('AbortError')) return null
      
      // Skip development-only errors
      if (process.env.NODE_ENV === 'development' && 
          error?.message?.includes('Warning:')) {
        return null
      }
    }
    
    return event
  },
  
  // Additional context
  initialScope: {
    tags: {
      component: 'client'
    }
  },
  
  // Integrations
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
    new Sentry.BrowserTracing({
      // Performance monitoring for page loads and navigations
      routingInstrumentation: Sentry.nextRouterInstrumentation(
        typeof window !== 'undefined' ? require('next/router') : null
      ),
    }),
  ],
  
  // Environment
  environment: process.env.NODE_ENV,
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION || 'development',
  
  // Debug
  debug: process.env.NODE_ENV === 'development',
  
  // Capture console messages
  captureConsoleIntegration: {
    levels: ['error']
  },
})

// Enhanced error boundary integration
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    Sentry.captureException(event.reason, {
      tags: { type: 'unhandled_promise_rejection' }
    })
  })
}