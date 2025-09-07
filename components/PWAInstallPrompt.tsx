'use client';

import React, { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  X, 
  Smartphone, 
  Monitor, 
  Wifi, 
  WifiOff,
  Bell,
  RefreshCw,
  Trash2
} from 'lucide-react';

interface PWAInstallPromptProps {
  showPersistent?: boolean;
  onInstall?: () => void;
  onDismiss?: () => void;
}

export function PWAInstallPrompt({ 
  showPersistent = false, 
  onInstall, 
  onDismiss 
}: PWAInstallPromptProps) {
  const { 
    isInstallable, 
    isInstalled, 
    install 
  } = usePWA();
  
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Auto-hide after some time if not persistent
  useEffect(() => {
    if (!showPersistent && !isDismissed) {
      const timer = setTimeout(() => {
        setIsDismissed(true);
      }, 10000); // Auto-hide after 10 seconds

      return () => clearTimeout(timer);
    }
    
    // Explicitly return undefined for other cases
    return undefined;
  }, [showPersistent, isDismissed]);

  // Don't show if not installable, already installed, or dismissed
  if (!isInstallable || isInstalled || (isDismissed && !showPersistent)) {
    return null;
  }

  const handleInstall = async () => {
    setIsInstalling(true);
    
    try {
      const success = await install();
      
      if (success) {
        onInstall?.();
      }
    } catch (error) {
      console.error('Install failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <Card className="fixed bottom-4 left-4 right-4 md:left-auto md:max-w-md z-50 shadow-lg border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-blue-900">
            Апп суулгах
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            PhysX Dashboard-г таны төхөөрөмжид суулгаад илүү хурдан, хялбар ашиглаарай!
          </p>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1 text-green-700">
              <Wifi className="h-3 w-3" />
              Офлайн ажиллах
            </div>
            <div className="flex items-center gap-1 text-green-700">
              <Smartphone className="h-3 w-3" />
              Хурдан ачаалах
            </div>
            <div className="flex items-center gap-1 text-green-700">
              <Bell className="h-3 w-3" />
              Мэдэгдэл авах
            </div>
            <div className="flex items-center gap-1 text-green-700">
              <Monitor className="h-3 w-3" />
              Desktop дэлгэц
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleInstall}
              disabled={isInstalling}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isInstalling ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Суулгаж байна...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Суулгах
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="px-3"
            >
              Дараа
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// PWA Status Component
export function PWAStatus() {
  const { 
    isInstalled, 
    isOnline, 
    isStandalone, 
    checkForUpdates,
    unregister 
  } = usePWA();
  
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [lastUpdateCheck, setLastUpdateCheck] = useState<Date | null>(null);

  const handleCheckUpdates = async () => {
    setIsCheckingUpdates(true);
    
    try {
      await checkForUpdates();
      setLastUpdateCheck(new Date());
    } catch (error) {
      console.error('Update check failed:', error);
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const handleUninstall = async () => {
    if (confirm('Та апп-г устгахыг хүсэж байна уу? Энэ нь бүх локал өгөгдлийг устгана.')) {
      await unregister();
      // The browser will handle the uninstallation UI
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          PWA Төлөв
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Суулгасан</span>
            <Badge variant={isInstalled ? "default" : "secondary"}>
              {isInstalled ? "Тийм" : "Үгүй"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Standalone горим</span>
            <Badge variant={isStandalone ? "default" : "secondary"}>
              {isStandalone ? "Идэвхтэй" : "Идэвхгүй"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Интернэт холболт</span>
            <div className="flex items-center gap-1">
              {isOnline ? (
                <>
                  <Wifi className="h-4 w-4 text-green-600" />
                  <Badge className="bg-green-100 text-green-800">Онлайн</Badge>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-600" />
                  <Badge className="bg-red-100 text-red-800">Офлайн</Badge>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Service Worker</span>
            <Badge className="bg-blue-100 text-blue-800">
              Идэвхтэй
            </Badge>
          </div>
        </div>
        
        {isInstalled && (
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Сүүлд шалгасан</span>
              <span className="text-xs text-gray-500">
                {lastUpdateCheck ? lastUpdateCheck.toLocaleString() : 'Хэзээ ч биш'}
              </span>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCheckUpdates}
                disabled={isCheckingUpdates}
                className="flex-1"
              >
                {isCheckingUpdates ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Шалгаж байна...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Шинэчлэл шалгах
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleUninstall}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Устгах
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Offline indicator
export function OfflineIndicator() {
  const { isOnline } = usePWA();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 text-sm font-medium z-50">
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>Интернэт холболт алдагдлаа - Офлайн горимд ажиллаж байна</span>
      </div>
    </div>
  );
}