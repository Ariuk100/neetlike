// /app/layout.tsx
import type { Metadata } from "next";
import "./globals.css"; // Зөвхөн энэ CSS импорт үлдэнэ.

import { AuthProvider } from '@/app/context/AuthContext';
import { CacheProvider } from '@/lib/CacheContext';
import ScrollToTopButton from '@/components/ScrollToTopButton';
import AppShell from '@/components/AppShell';
import { Toaster }  from "@/components/ui/sonner";  // Sonner импортлогдсон байна

export const metadata: Metadata = {
  title: "PhysX Dashboard",
  description: "Physics Education & Dashboard System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn" suppressHydrationWarning>
      <body
        className={`bg-gray-100 dark:bg-gray-900 bg-[url('/assets/images/bg-body.png')] dark:bg-[url('/assets/images/bg-body-2.png')]`}
      >
        <AuthProvider>
          <CacheProvider>
            <AppShell>
              {children}
            </AppShell>
            {/* sonner-ийн Toaster ашиглагдаж байна */}
            <Toaster richColors position="top-right" />
            <ScrollToTopButton />
          </CacheProvider>
        </AuthProvider>
      </body>
    </html>
  );
}