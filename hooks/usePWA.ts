'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isStandalone: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
}

interface PWAActions {
  install: () => Promise<boolean>;
  checkForUpdates: () => Promise<boolean>;
  skipWaiting: () => void;
  unregister: () => Promise<boolean>;
}

export function usePWA(): PWAState & PWAActions {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if app is installed
  useEffect(() => {
    const checkInstalled = () => {
      const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSInstalled = (window.navigator as any).standalone === true;
      const isInstalled = isInStandaloneMode || isIOSInstalled;
      
      setIsInstalled(isInstalled);
      setIsStandalone(isInStandaloneMode || isIOSInstalled);
    };

    checkInstalled();
  }, []);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
          setSwRegistration(registration);

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available
                  if (confirm('Шинэ хувилбар бэлэн байна. Одоо шинэчлэх үү?')) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  }
                }
              });
            }
          });

          // Listen for controlling change
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
          });
        })
        .catch((error) => {
          console.log('SW registration failed: ', error);
        });
    }
  }, []);

  // Install PWA
  const install = useCallback(async (): Promise<boolean> => {
    if (!installPrompt) {
      return false;
    }

    try {
      await installPrompt.prompt();
      const choiceResult = await installPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setInstallPrompt(null);
        setIsInstalled(true);
        return true;
      } else {
        console.log('User dismissed the install prompt');
        return false;
      }
    } catch (error) {
      console.error('Install failed:', error);
      return false;
    }
  }, [installPrompt]);

  // Check for service worker updates
  const checkForUpdates = useCallback(async (): Promise<boolean> => {
    if (swRegistration) {
      try {
        await swRegistration.update();
        return true;
      } catch (error) {
        console.error('Update check failed:', error);
        return false;
      }
    }
    return false;
  }, [swRegistration]);

  // Skip waiting for new service worker
  const skipWaiting = useCallback(() => {
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [swRegistration]);

  // Unregister service worker
  const unregister = useCallback(async (): Promise<boolean> => {
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        const unregisterPromises = registrations.map(registration => registration.unregister());
        await Promise.all(unregisterPromises);
        return true;
      } catch (error) {
        console.error('Unregister failed:', error);
        return false;
      }
    }
    return false;
  }, []);

  return {
    isInstallable: !!installPrompt,
    isInstalled,
    isOnline,
    isStandalone,
    installPrompt,
    install,
    checkForUpdates,
    skipWaiting,
    unregister,
  };
}

// Hook for managing offline storage
export function useOfflineStorage() {
  const [isSupported, setIsSupported] = useState(false);
  const [storageQuota, setStorageQuota] = useState<{ used: number; total: number } | null>(null);

  useEffect(() => {
    setIsSupported('indexedDB' in window && 'caches' in window);

    // Get storage quota if supported
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then((estimate) => {
        setStorageQuota({
          used: estimate.usage || 0,
          total: estimate.quota || 0,
        });
      });
    }
  }, []);

  const storeOfflineData = useCallback(async (key: string, data: any): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('physx-offline', 1);

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('submissions')) {
            db.createObjectStore('submissions', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('userData')) {
            db.createObjectStore('userData', { keyPath: 'key' });
          }
        };

        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['userData'], 'readwrite');
          const store = transaction.objectStore('userData');
          
          const putRequest = store.put({
            key,
            data,
            timestamp: Date.now(),
          });

          putRequest.onsuccess = () => resolve(true);
          putRequest.onerror = () => reject(putRequest.error);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to store offline data:', error);
      return false;
    }
  }, [isSupported]);

  const getOfflineData = useCallback(async (key: string): Promise<any | null> => {
    if (!isSupported) return null;

    try {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('physx-offline', 1);

        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['userData'], 'readonly');
          const store = transaction.objectStore('userData');
          const getRequest = store.get(key);

          getRequest.onsuccess = () => {
            const result = getRequest.result;
            resolve(result ? result.data : null);
          };

          getRequest.onerror = () => reject(getRequest.error);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get offline data:', error);
      return null;
    }
  }, [isSupported]);

  const removeOfflineData = useCallback(async (key: string): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('physx-offline', 1);

        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['userData'], 'readwrite');
          const store = transaction.objectStore('userData');
          const deleteRequest = store.delete(key);

          deleteRequest.onsuccess = () => resolve(true);
          deleteRequest.onerror = () => reject(deleteRequest.error);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to remove offline data:', error);
      return false;
    }
  }, [isSupported]);

  return {
    isSupported,
    storageQuota,
    storeOfflineData,
    getOfflineData,
    removeOfflineData,
  };
}

// Hook for push notifications
export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    setIsSupported('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window);
    setPermission(Notification.permission);
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const subscribe = useCallback(async (vapidPublicKey: string): Promise<PushSubscription | null> => {
    if (!isSupported || permission !== 'granted') return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });

      setSubscription(subscription);
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }, [isSupported, permission]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!subscription) return false;

    try {
      const success = await subscription.unsubscribe();
      if (success) {
        setSubscription(null);
      }
      return success;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }, [subscription]);

  return {
    isSupported,
    permission,
    subscription,
    requestPermission,
    subscribe,
    unsubscribe,
  };
}