import type { Metadata } from "next";
import 'antd/dist/reset.css';
import "../public/assets/css/icons.min.css";
import "../public/assets/css/tailwind.min.css";
import "./globals.css";
import { AuthProvider } from '@/app/context/AuthContext';
import { CacheProvider } from '@/lib/CacheContext';
import ScrollToTopButton from '@/components/ScrollToTopButton';
import AppShell from '@/components/AppShell';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Toaster } from "react-hot-toast";

// түр хугацаанд шалгах
import React from 'react'; // Ant Design-ийн шинэ хувилбаруудын CSS


export const metadata: Metadata = {
  title: "PhysX Dashboard",
  description: "Physics Education & Dashboard System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn">
       <head>
          {/* icons.css-ийг эндээс устгалаа. Хамаарах бүх CSS-ийг globals.css дотор импортлох нь зөв арга юм. */}
      </head>
      <body className={`bg-gray-100 dark:bg-gray-900 bg-[url('../images/bg-body.png')] dark:bg-[url('../images/bg-body-2.png')]`}>
        <ErrorBoundary>
          <AuthProvider>
            <CacheProvider>
              <AppShell>
                  {children}
              </AppShell>
              <Toaster
            position="top-right"
            toastOptions={{
              // react-hot-toast-д "richColors" байхгүй! Ингэж iconTheme-ээ будна.
              success: { iconTheme: { primary: '#10b981', secondary: '#ffffff' } }, // emerald
              error:   { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } }, // red
            }}
          />
              <ScrollToTopButton />
            </CacheProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}