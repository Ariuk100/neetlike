'use client';

import { useEffect } from 'react';
import { initWebVitalsMonitoring } from '@/lib/monitoring';

export function MonitoringProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize web vitals monitoring
    initWebVitalsMonitoring();
    
    // Initialize performance monitoring
    if (typeof window !== 'undefined') {
      // Track page load performance
      window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          // Report page load metrics
          const pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
          const domContentLoadedTime = navigation.domContentLoadedEventEnd - navigation.fetchStart;
          const firstByteTime = navigation.responseStart - navigation.fetchStart;
          
          // Import monitoring dynamically to avoid SSR issues
          import('@/lib/monitoring').then(({ monitor }) => {
            monitor.reportMetric('page_load_time', pageLoadTime, { type: 'navigation' });
            monitor.reportMetric('dom_content_loaded', domContentLoadedTime, { type: 'navigation' });
            monitor.reportMetric('time_to_first_byte', firstByteTime, { type: 'navigation' });
          });
        }
      });
      
      // Track route changes (for SPA navigation)
      let lastRoute = window.location.pathname;
      const observer = new MutationObserver(() => {
        if (window.location.pathname !== lastRoute) {
          lastRoute = window.location.pathname;
          
          // Report route change
          import('@/lib/monitoring').then(({ errorReporter }) => {
            errorReporter.addBreadcrumb(
              `Route changed to ${lastRoute}`,
              'navigation',
              { route: lastRoute }
            );
          });
        }
      });
      
      observer.observe(document, { childList: true, subtree: true });
      
      // Cleanup
      return () => {
        observer.disconnect();
      };
    }
    
    // Return undefined when not in browser
    return undefined;
  }, []);

  return <>{children}</>;
}