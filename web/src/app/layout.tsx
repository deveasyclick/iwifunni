import { Providers } from '@/components/providers';
import { ThemeProvider } from '@/components/theme-provider';
import ServiceWorkerRegister from '@/ServiceWorkerRegister';
import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import React from 'react';
import './css/globals.css';

const geist = Geist({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Iwifunni',
  description: 'A multi-tenant notification platform',
};

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#5d87ff" />
      </head>
      <body className={`${geist.className}`}>
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ServiceWorkerRegister />
            {children}
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
