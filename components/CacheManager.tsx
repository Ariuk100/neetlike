'use client';

import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  Database, 
  Trash2, 
  Clock, 
  Activity,
  HardDrive,
  Zap
} from 'lucide-react';
import { useCache } from '@/lib/useCache';

interface CacheStats {
  queryCount: number;
  mutationCount: number;
  cacheSize: string;
  storageUsage: {
    localStorage: number;
    sessionStorage: number;
  };
  oldestEntry: string;
  newestEntry: string;
}

interface QueryInfo {
  queryKey: string;
  status: string;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
  isFetching: boolean;
  isStale: boolean;
  size?: number;
}

export function CacheManager() {
  const queryClient = useQueryClient();
  const cache = useCache();
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [queries, setQueries] = useState<QueryInfo[]>([]);
  // Query selection state for future feature
  // const [selectedQuery, setSelectedQuery] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshStats = React.useCallback(async () => {
    try {
      const queryCache = queryClient.getQueryCache();
      const mutationCache = queryClient.getMutationCache();
      
      // Get all queries
      const allQueries = queryCache.getAll();
      const queryInfos: QueryInfo[] = allQueries.map(query => ({
        queryKey: JSON.stringify(query.queryKey),
        status: query.state.status,
        dataUpdatedAt: query.state.dataUpdatedAt,
        errorUpdatedAt: query.state.errorUpdatedAt,
        isFetching: query.state.status === 'pending',
        isStale: query.isStale(),
        size: query.state.data ? JSON.stringify(query.state.data).length : 0
      }));

      setQueries(queryInfos);

      // Calculate storage usage
      let localStorageSize = 0;
      let sessionStorageSize = 0;
      
      if (typeof window !== 'undefined') {
        try {
          // Calculate localStorage usage
          for (const key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
              localStorageSize += localStorage[key].length + key.length;
            }
          }
          
          // Calculate sessionStorage usage
          for (const key in sessionStorage) {
            if (sessionStorage.hasOwnProperty(key)) {
              sessionStorageSize += sessionStorage[key].length + key.length;
            }
          }
        } catch (error) {
          console.warn('Could not calculate storage usage:', error);
        }
      }

      // Get timestamps for oldest and newest entries
      const timestamps = allQueries
        .map(q => q.state.dataUpdatedAt)
        .filter(t => t > 0)
        .sort();
      
      const cacheStats: CacheStats = {
        queryCount: allQueries.length,
        mutationCount: mutationCache.getAll().length,
        cacheSize: formatBytes(
          JSON.stringify({
            queries: allQueries.map(q => q.state.data),
            mutations: mutationCache.getAll().map(m => m.state.data)
          }).length
        ),
        storageUsage: {
          localStorage: localStorageSize,
          sessionStorage: sessionStorageSize
        },
        oldestEntry: timestamps.length > 0 && timestamps[0] != null && typeof timestamps[0] === 'number'
          ? new Date(timestamps[0] as number).toLocaleString() 
          : 'N/A',
        newestEntry: timestamps.length > 0 && timestamps[timestamps.length - 1] != null && typeof timestamps[timestamps.length - 1] === 'number'
          ? new Date(timestamps[timestamps.length - 1] as number).toLocaleString() 
          : 'N/A'
      };

      setStats(cacheStats);
    } catch (error) {
      console.error('Failed to refresh cache stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [queryClient]);

  useEffect(() => {
    refreshStats();
    
    // Refresh stats every 5 seconds
    const interval = setInterval(refreshStats, 5000);
    
    return () => clearInterval(interval);
  }, [refreshStats]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'loading': return 'bg-blue-100 text-blue-800';
      case 'idle': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleClearAllCache = () => {
    queryClient.clear();
    cache.clearAll('local');
    cache.clearAll('session');
    refreshStats();
  };

  const handleInvalidateQuery = (queryKey: string) => {
    try {
      const parsedKey = JSON.parse(queryKey);
      queryClient.invalidateQueries({ queryKey: parsedKey });
      refreshStats();
    } catch (error) {
      console.error('Failed to invalidate query:', error);
    }
  };

  const handleRemoveQuery = (queryKey: string) => {
    try {
      const parsedKey = JSON.parse(queryKey);
      queryClient.removeQueries({ queryKey: parsedKey });
      refreshStats();
    } catch (error) {
      console.error('Failed to remove query:', error);
    }
  };

  if (isLoading || !stats) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
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
            Cache Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor and manage React Query and browser cache
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={refreshStats}
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="destructive"
            onClick={handleClearAllCache}
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Cache Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Queries</CardTitle>
            <Database className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.queryCount}</div>
            <p className="text-xs text-gray-500">Cached queries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Size</CardTitle>
            <HardDrive className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cacheSize}</div>
            <p className="text-xs text-gray-500">Memory usage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Local Storage</CardTitle>
            <Activity className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(stats.storageUsage.localStorage)}
            </div>
            <p className="text-xs text-gray-500">Browser storage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Mutations</CardTitle>
            <Zap className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.mutationCount}</div>
            <p className="text-xs text-gray-500">Running mutations</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Cache Information */}
      <Tabs defaultValue="queries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queries">Query Cache</TabsTrigger>
          <TabsTrigger value="storage">Browser Storage</TabsTrigger>
          <TabsTrigger value="settings">Cache Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="queries">
          <Card>
            <CardHeader>
              <CardTitle>Query Cache Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {queries.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No cached queries</p>
                ) : (
                  queries.map((query, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getStatusColor(query.status)}>
                            {query.status}
                          </Badge>
                          {query.isFetching && (
                            <Badge variant="outline">fetching</Badge>
                          )}
                          {query.isStale && (
                            <Badge variant="outline">stale</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium truncate">
                          {query.queryKey.length > 60 
                            ? query.queryKey.substring(0, 60) + '...'
                            : query.queryKey
                          }
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(query.dataUpdatedAt).toLocaleTimeString()}
                          </span>
                          {query.size && (
                            <span>{formatBytes(query.size)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleInvalidateQuery(query.queryKey)}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveQuery(query.queryKey)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage">
          <Card>
            <CardHeader>
              <CardTitle>Browser Storage Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Local Storage</p>
                    <p className="text-sm text-gray-500">
                      Persistent data across sessions
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {formatBytes(stats.storageUsage.localStorage)}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        cache.clearAll('local');
                        refreshStats();
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Session Storage</p>
                    <p className="text-sm text-gray-500">
                      Data for current session only
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {formatBytes(stats.storageUsage.sessionStorage)}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        cache.clearAll('session');
                        refreshStats();
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Cache Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium mb-2">Default Settings</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Stale Time: 5 minutes</li>
                      <li>• Cache Time: 10 minutes</li>
                      <li>• Retry Attempts: 3</li>
                      <li>• Background Refetch: Enabled</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Cache Information</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Oldest Entry: {stats.oldestEntry}</li>
                      <li>• Newest Entry: {stats.newestEntry}</li>
                      <li>• Total Queries: {stats.queryCount}</li>
                      <li>• Memory Usage: {stats.cacheSize}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}