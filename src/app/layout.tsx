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

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://rimiris.ai"
const SITE_NAME = "Rimiris AI"
const SITE_TAGLINE = "Directeur de mémoire académique"
const SITE_DESCRIPTION =
  "Rimiris AI est votre directeur de mémoire académique propulsé par l'IA. " +
  "Rédigez votre mémoire, thèse ou dissertation avec méthode : entretien guidé, " +
  "plan structuré, rédaction section par section, anti-plagiat, audit de cohérence " +
  "et préparation à la soutenance. Conforme aux normes UQAC, ENIEG et universitaires francophones."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  keywords: [
    // Core brand
    "Rimiris",
    "Rimiris AI",
    // Primary intent (high commercial value)
    "rédaction mémoire",
    "rédiger un mémoire",
    "mémoire académique",
    "mémoire universitaire",
    "directeur de mémoire",
    "encadrement mémoire",
    "aide mémoire IA",
    // Thesis / dissertation
    "rédaction thèse",
    "rédiger une thèse",
    "thèse doctorat",
    "dissertation littéraire",
    "dissertation philosophique",
    "mémoire master",
    "mémoire licence",
    // Workflow features
    "plan de mémoire",
    "problématique recherche",
    "anti-plagiat mémoire",
    "vérification cohérence",
    "préparation soutenance",
    "méthodologie recherche",
    // Tech / market
    "IA académique",
    "IA rédaction",
    "assistant IA université",
    "outil mémoire IA",
    // Geographic / institutional
    "mémoire UQAC",
    "mémoire ENIEG",
    "mémoire université francophone",
    "mémoire Cameroun",
    "mémoire Québec",
    "mémoire France",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "education",
  classification: "Education, Academic Writing, Artificial Intelligence",
  manifest: "/manifest.json",
  alternates: {
    canonical: SITE_URL,
    languages: {
      "fr-FR": SITE_URL,
      "fr-CA": SITE_URL,
      "fr-BE": SITE_URL,
      "fr-CH": SITE_URL,
      "fr": SITE_URL,
      "x-default": SITE_URL,
    },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    alternateLocale: ["fr_CA", "fr_BE", "fr_CH"],
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "Logo Rimiris AI — Directeur de mémoire académique",
        type: "image/png",
      },
      {
        url: "/logo.webp",
        width: 512,
        height: 512,
        alt: "Rimiris AI",
        type: "image/webp",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@RimirisAI",
    creator: "@RimirisAI",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description:
      "Votre directeur de mémoire académique propulsé par l'IA. De l'idée de recherche à la soutenance.",
    images: ["/icons/icon-512.png"],
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "mask-icon", url: "/icon.svg", color: "#145DD6" },
    ],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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
        {/* ===== SEO META ===== */}
        <meta name="author" content="Rimiris AI" />
        <meta name="language" content="French" />
        <meta name="revisit-after" content="7 days" />
        <meta name="rating" content="general" />
        <meta name="distribution" content="global" />
        <meta name="copyright" content="Rimiris AI" />
        <meta name="theme-color" content="#145DD6" />
        {/* ===== GEO / Local SEO (French-speaking academic market) ===== */}
        <meta name="geo.region" content="FR, CA, BE, CH" />
        <meta name="geo.placename" content="Paris, Montréal, Bruxelles, Genève" />
        <meta name="geo.position" content="48.8566;2.3522" />
        <meta name="ICBM" content="48.8566, 2.3522" />
        <meta
          name="coverage"
          content="France, Canada, Belgique, Suisse, Cameroun, Afrique francophone"
        />
        {/* ===== Search engine verification placeholders — replace with real codes when you have them ===== */}
        {/* <meta name="google-site-verification" content="YOUR_GOOGLE_SEARCH_CONSOLE_CODE" /> */}
        {/* <meta name="msvalidate.01" content="YOUR_BING_WEBMASTER_CODE" /> */}
        {/* <meta name="yandex-verification" content="YOUR_YANDEX_CODE" /> */}
        {/* ===== Preconnect for performance ===== */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* ===== Structured data — JSON-LD ===== */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                // WebApplication / SoftwareApplication
                {
                  "@type": "WebApplication",
                  "@id": `${SITE_URL}/#webapp`,
                  name: SITE_NAME,
                  alternateName: "Rimiris",
                  url: SITE_URL,
                  description: SITE_DESCRIPTION,
                  applicationCategory: "EducationalApplication",
                  operatingSystem: "Web, iOS, Android, Windows, macOS, Linux",
                  browserRequirements: "Requires JavaScript. Requires HTML5.",
                  offers: {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "EUR",
                    availability: "https://schema.org/InStock",
                  },
                  // VULN-13: Removed fake AggregateRating (ratingValue: 4.8,
                  // reviewCount: 128) — this was misleading SEO that violated
                  // Google's structured data guidelines and could have led to
                  // manual action against the site in search results.
                  // Re-enable only when real reviews exist and are collected
                  // through a verified review system.
                  featureList: [
                    "Entretien guidé pour cadrer le sujet de mémoire",
                    "Génération automatique de plan structuré",
                    "Rédaction section par section avec IA",
                    "Vérification anti-plagiat",
                    "Audit de cohérence du document",
                    "Préparation à la soutenance",
                    "Simulation de jury de soutenance",
                    "Export PDF, Word, HTML, Markdown",
                    "Fonctionnement hors ligne (PWA)",
                    "Conformité aux normes UQAC, ENIEG et universitaires",
                  ],
                  screenshot: `${SITE_URL}/icons/icon-512.png`,
                  softwareVersion: "1.0",
                  datePublished: "2025-01-01",
                  dateModified: "2026-07-29",
                  publisher: { "@id": `${SITE_URL}/#org` },
                },
                // Organization
                {
                  "@type": "Organization",
                  "@id": `${SITE_URL}/#org`,
                  name: SITE_NAME,
                  alternateName: "Rimiris",
                  url: SITE_URL,
                  logo: {
                    "@type": "ImageObject",
                    url: `${SITE_URL}/icons/icon-512.png`,
                    width: 512,
                    height: 512,
                  },
                  sameAs: [
                    "https://twitter.com/RimirisAI",
                    "https://www.linkedin.com/company/rimiris-ai",
                    "https://github.com/rimiris-ai",
                  ],
                  contactPoint: {
                    "@type": "ContactPoint",
                    contactType: "customer support",
                    availableLanguage: ["French", "English"],
                  },
                },
                // WebSite
                {
                  "@type": "WebSite",
                  "@id": `${SITE_URL}/#website`,
                  url: SITE_URL,
                  name: SITE_NAME,
                  description: SITE_DESCRIPTION,
                  publisher: { "@id": `${SITE_URL}/#org` },
                  inLanguage: ["fr-FR", "fr-CA", "fr-BE", "fr-CH"],
                  potentialAction: {
                    "@type": "SearchAction",
                    target: {
                      "@type": "EntryPoint",
                      urlTemplate: `${SITE_URL}/?q={search_term_string}`,
                    },
                    "query-input": "required name=search_term_string",
                  },
                },
                // FAQ — rich snippets for SEO
                {
                  "@type": "FAQPage",
                  "@id": `${SITE_URL}/#faq`,
                  mainEntity: [
                    {
                      "@type": "Question",
                      name: "Qu'est-ce que Rimiris AI ?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Rimiris AI est un directeur de mémoire académique propulsé par l'intelligence artificielle. Il accompagne les étudiants dans la rédaction de leur mémoire, thèse ou dissertation, de l'idée de recherche jusqu'à la soutenance, en proposant un entretien guidé, un plan structuré et une rédaction section par section.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "Rimiris AI est-il gratuit ?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Oui, Rimiris AI est gratuit. Vous pouvez rédiger votre mémoire, thèse ou dissertation sans frais, avec un accès complet à toutes les fonctionnalités : entretien guidé, plan, rédaction IA, anti-plagiat, audit de cohérence et préparation à la soutenance.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "Rimiris AI respecte-t-il les normes universitaires ?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Rimiris AI est conforme aux normes UQAC (Université du Québec à Chicoutimi), ENIEG et aux standards universitaires francophones. Vous pouvez importer le guide méthodologique de votre établissement pour un respect total des consignes.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "Puis-je utiliser Rimiris AI hors ligne ?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Oui. Rimiris AI est une PWA (Progressive Web App) installable sur ordinateur et mobile. Une fois installée, l'application fonctionne partiellement hors ligne pour la rédaction et la consultation de votre mémoire.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "Quels types de documents Rimiris AI peut-il aider à rédiger ?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Rimiris AI accompagne la rédaction de mémoires de licence, mémoires de master, thèses de doctorat, dissertations littéraires et dissertations philosophiques, avec des modèles méthodologiques adaptés à chaque niveau.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "Comment Rimiris AI aide-t-il à préparer la soutenance ?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Rimiris AI génère des questions de soutenance adaptées à votre mémoire, simule un jury avec des agents IA, et vous permet de vous entraîner à répondre aux questions critiques avant le jour J.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "Mes données sont-elles en sécurité ?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Vos données restent dans votre navigateur (localStorage). Rimiris AI ne stocke pas votre mémoire sur ses serveurs. Vous pouvez exporter votre travail à tout moment en PDF, Word, HTML ou Markdown.",
                      },
                    },
                  ],
                },
                // BreadcrumbList
                {
                  "@type": "BreadcrumbList",
                  "@id": `${SITE_URL}/#breadcrumb`,
                  itemListElement: [
                    {
                      "@type": "ListItem",
                      position: 1,
                      name: "Accueil",
                      item: SITE_URL,
                    },
                    {
                      "@type": "ListItem",
                      position: 2,
                      name: "Rimiris AI",
                      item: SITE_URL,
                    },
                  ],
                },
              ],
            }),
          }}
        />
        {/* ===== Plausible / analytics placeholder — uncomment when ready ===== */}
        {/* <script defer data-domain="rimiris.ai" src="https://plausible.io/js/script.js" /> */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
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
