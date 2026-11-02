import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "IWACU RWANDA — Menya aho uri n'abayobozi bawe",
  description:
    "Shakisha aho uri n'abayobozi b'umudugudu, akagari, umurenge n'akarere ukoresheje GPS. Discover your administrative location and local leaders in Rwanda.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IWACU RWANDA",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
    { media: "(prefers-color-scheme: dark)", color: "#1e3a5f" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="rw" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icons/icon-192.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="color-scheme" content="light dark" />
        <ThemeInitScript />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content / Simbira ku mubare nyamukuru
        </a>
        <div className="relative flex min-h-screen flex-col">
          <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white"
                  aria-hidden
                >
                  IR
                </span>
                <span className="text-lg font-semibold tracking-tight text-foreground">
                  IWACU RWANDA
                </span>
              </div>
              <ThemeToggle />
            </div>
          </header>

          <main id="main-content" className="container mx-auto max-w-3xl flex-1 px-4 py-8">
            {children}
          </main>

          <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
            <p>IWACU RWANDA · Menya aho uri · Privacy-first (NCSA Law)</p>
            <p className="mt-1">
              Citizens remain anonymous. No personal data is stored from public use.
            </p>
          </footer>
        </div>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

/** Applies the stored (or system) theme before first paint, so dark mode does not flash. */
function ThemeInitScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var s=localStorage.getItem("theme");if(s==="dark"||(!s&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark");}}catch(e){}})();`,
      }}
    />
  );
}

/** Registers the Service Worker after the page has loaded. */
function ServiceWorkerRegister() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(err){console.warn("SW registration failed:",err);});});}`,
      }}
    />
  );
}
