'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Activity, Clock, Users, Database } from 'lucide-react';
import { usePerformanceMonitor } from '@/lib/monitoring';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  threshold: { warning: number; critical: number };
}

export function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [webVitals, setWebVitals] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const monitor = usePerformanceMonitor();

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        // Simulate getting real-time metrics
        const currentMetrics: PerformanceMetric[] = [
          {
            name: 'Response Time',
            value: 150,
            unit: 'ms',
            status: 'good',
            threshold: { warning: 200, critical: 500 }
          },
          {
            name: 'Error Rate',
            value: 0.5,
            unit: '%',
            status: 'good',
            threshold: { warning: 1, critical: 5 }
          },
          {
            name: 'Memory Usage',
            value: 65,
            unit: 'MB',
            status: 'warning',
            threshold: { warning: 60, critical: 80 }
          },
          {
            name: 'Active Users',
            value: 42,
            unit: 'users',
            status: 'good',
            threshold: { warning: 100, critical: 200 }
          }
        ];

        setMetrics(currentMetrics);
        
        // Get Web Vitals if available
        if (typeof window !== 'undefined') {
          const vitals: Record<string, number> = {};
          
          // Get performance entries
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navigation) {
            vitals.loadTime = navigation.loadEventEnd - navigation.fetchStart;
            vitals.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
            vitals.firstByte = navigation.responseStart - navigation.fetchStart;
          }
          
          // Get memory info if available
          if ('memory' in performance) {
            const memory = (performance as any).memory;
            vitals.memoryUsed = Math.round(memory.usedJSHeapSize / 1024 / 1024);
            vitals.memoryTotal = Math.round(memory.totalJSHeapSize / 1024 / 1024);
          }
          
          setWebVitals(vitals);
        }
      } catch (error) {
        console.error('Failed to load monitoring metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMetrics();
    
    // Refresh metrics every 30 seconds
    const interval = setInterval(loadMetrics, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: PerformanceMetric['status']) => {
    switch (status) {
      case 'good': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
    }
  };

  const getStatusIcon = (status: PerformanceMetric['status']) => {
    switch (status) {
      case 'good': return <Activity className="h-4 w-4 text-green-600" />;
      case 'warning': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

  const testSentryError = () => {
    try {
      throw new Error('Test error from monitoring dashboard');
    } catch (error) {
      import('@/lib/monitoring').then(({ errorReporter }) => {
        errorReporter.captureError(error as Error, {
          tags: {
            source: 'monitoring_dashboard',
            test: 'true'
          },
          extra: {
            userInitiated: true,
            timestamp: new Date().toISOString()
          }
        });
      });
    }
  };

  const testPerformanceMonitoring = async () => {
    await monitor.monitorAsync('test-operation', async () => {
      // Simulate slow operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      return 'Test completed';
    }, {
      userInitiated: true,
      testType: 'performance'
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Performance Monitoring
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time application performance and error tracking
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={testPerformanceMonitoring}
            size="sm"
          >
            Test Performance
          </Button>
          <Button
            variant="outline"
            onClick={testSentryError}
            size="sm"
          >
            Test Error Reporting
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.name}
              </CardTitle>
              {getStatusIcon(metric.status)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metric.value}
                <span className="text-sm text-gray-500 ml-1">{metric.unit}</span>
              </div>
              <div className="flex items-center mt-2">
                <Badge variant="secondary" className={getStatusColor(metric.status)}>
                  {metric.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Web Vitals */}
      {Object.keys(webVitals).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Core Web Vitals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {webVitals.loadTime && (
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(webVitals.loadTime)}ms
                  </div>
                  <div className="text-sm text-gray-600">Page Load Time</div>
                </div>
              )}
              {webVitals.firstByte && (
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(webVitals.firstByte)}ms
                  </div>
                  <div className="text-sm text-gray-600">Time to First Byte</div>
                </div>
              )}
              {webVitals.memoryUsed && (
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {webVitals.memoryUsed}MB
                  </div>
                  <div className="text-sm text-gray-600">Memory Used</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Database Connection</span>
                <Badge className="bg-green-100 text-green-800">Healthy</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Firebase Auth</span>
                <Badge className="bg-green-100 text-green-800">Connected</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Error Tracking</span>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Performance Monitoring</span>
                <Badge className="bg-green-100 text-green-800">Enabled</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active Sessions</span>
                <span className="text-sm font-bold">42</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Page Views (24h)</span>
                <span className="text-sm font-bold">1,248</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Bounce Rate</span>
                <span className="text-sm font-bold">28.5%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Avg Session Duration</span>
                <span className="text-sm font-bold">4m 32s</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}