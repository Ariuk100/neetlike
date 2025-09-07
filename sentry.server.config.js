import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Error filtering
  beforeSend(event, hint) {
    // Filter out certain server errors
    if (event.exception) {
      const error = hint.originalException
      
      // Skip Firebase admin SDK initialization warnings
      if (error?.message?.includes('Firebase Admin SDK')) return null
      
      // Skip known development errors
      if (process.env.NODE_ENV === 'development') {
        if (error?.message?.includes('ECONNREFUSED') ||
            error?.message?.includes('ENOTFOUND')) {
          return null
        }
      }
    }
    
    return event
  },
  
  // Additional context
  initialScope: {
    tags: {
      component: 'server'
    }
  },
  
  // Environment
  environment: process.env.NODE_ENV,
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION || 'development',
  
  // Debug
  debug: process.env.NODE_ENV === 'development',
  
  // Server-specific options
  serverName: process.env.HOSTNAME || 'unknown',
  
  // Capture additional context
  beforeBreadcrumb(breadcrumb) {
    // Filter noisy breadcrumbs
    if (breadcrumb.category === 'console' && 
        breadcrumb.level === 'log') {
      return null
    }
    return breadcrumb
  },
})

// Enhanced server error handling
process.on('uncaughtException', (error) => {
  Sentry.captureException(error, {
    tags: { type: 'uncaught_exception' }
  })
})

process.on('unhandledRejection', (reason) => {
  Sentry.captureException(reason, {
    tags: { type: 'unhandled_rejection' }
  })
})