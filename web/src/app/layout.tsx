import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PowerModeProvider } from '@/lib/powerMode';

/* Inter is loaded via CSS @import from Google Fonts in globals.css.
   We use a CSS variable so the font applies even when the CDN is unreachable
   (the browser falls back to system-ui). */

export const metadata: Metadata = {
  title: 'Disaster Relief Mesh',
  description: 'Offline-first emergency communication for citizens and responders',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Disaster Mesh',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head />

      <body className="font-sans min-h-screen antialiased bg-[#080606] text-white selection:bg-red-500 selection:text-white">
        <PowerModeProvider>
          {children}
        </PowerModeProvider>
      </body>
    </html>
  );
}

