import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/iris/theme-provider";
import { ServiceWorkerRegistration } from "@/components/pwa/register-sw";
import { PWAInstallPrompt } from "@/components/pwa/install-prompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rimiris AI — Directeur de mémoire virtuel",
  description:
    "Plateforme IA d'accompagnement à la rédaction académique, de l'idée de recherche jusqu'à la soutenance.",
  keywords: [
    "mémoire",
    "thèse",
    "IA",
    "recherche académique",
    "soutenance",
    "méthodologie",
  ],
  authors: [{ name: "Rimiris AI" }],
  applicationName: "Rimiris AI",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Rimiris AI",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon.png", sizes: "32x32", type: "image/png" }],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // Allow user zoom for accessibility (don't disable)
  viewportFit: "cover", // For notched displays — PWA safe-area
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1530" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* PWA: iOS apple-touch-icon */}
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        {/* PWA: allow standalone mode on iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Rimiris AI" />
        {/* Older browsers — manifest link */}
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <SonnerToaster position="top-right" />
          {/* PWA — register service worker for offline support */}
          <ServiceWorkerRegistration />
          {/* PWA — install prompt banner (mobile + desktop) */}
          <PWAInstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
