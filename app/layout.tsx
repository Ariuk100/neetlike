// /app/layout.tsx
import type { Metadata } from "next";
import "./globals.css"; // Зөвхөн энэ CSS импорт үлдэнэ.

import { AuthProvider } from '@/app/context/AuthContext';
import { CacheProvider } from '@/lib/CacheContext';
import ScrollToTopButton from '@/components/ScrollToTopButton';
import AppShell from '@/components/AppShell';
import { Toaster } from "@/components/ui/sonner";  // Sonner импортлогдсон байна

export const metadata: Metadata = {
  title: "Физик",
  description: "Physics Education & Dashboard System",
};

import QueryProvider from '@/app/components/QueryProvider';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn" suppressHydrationWarning>
      <body>
        <QueryProvider>
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
        </QueryProvider>
      </body>
    </html>
  );
}