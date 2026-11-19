import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";
import { EmergencyStrip } from "@/components/EmergencyStrip";
import { LocaleProvider } from "@/components/LocaleProvider";
import { AccessibilityProvider } from "@/components/AccessibilityProvider";
import { AttributionFooter } from "@/components/AttributionFooter";
import { AdsenseRuntime } from "@/components/ads/AdsenseRuntime";
import { normalizeLocale, translateText } from "@/lib/i18n";
import { cookies } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get("iwacu-locale")?.value);
  const title = "IWACU RWANDA — " + translateText("Menya aho uri. Menya n’abayobozi baho.", locale);
  const description = translateText(
    "Menya aho uri. Reba abayobozi baho, ubahamagare cyangwa ubandikire. Harimo n'inimero z'ubutabazi.",
    locale
  );
  return {
    metadataBase: new URL("https://iwacu-rwanda-2.vercel.app"),
    title,
    description,
    manifest: "/manifest.json",
    icons: {
      icon: [
        { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    robots: { index: true, follow: true },
    openGraph: { title, description, type: "website" },
  };
}

// CHANGED 2026-11-06 CLAUDE: Fraunces (headings) + DM Sans (body) via next/font; see docs/HANDOFF.md
const fontDisplay = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const fontBody = DM_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const initialLocale = normalizeLocale(cookieStore.get("iwacu-locale")?.value);

  return (
    <html lang={initialLocale} className="scroll-smooth">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#20603D" />
      </head>
      <body className={`${fontDisplay.variable} ${fontBody.variable} flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-[#00A3E0] selection:text-white`}>
        <LocaleProvider initialLocale={initialLocale}>
        <AccessibilityProvider>
        <a href="#main-content" className="iwacu-skip-link">
          {translateText("Jya ku bikubiye muri uru rubuga", initialLocale)}
        </a>
        {/* Official IWACU RWANDA sun wordmark */}
        <AdsenseRuntime />
        <AppHeader />

        {/* Main Viewport Content */}
        <main id="main-content" tabIndex={-1} className="relative flex-1">
          {children}
        </main>

        <AttributionFooter />

        {/* Fixed Emergency Strip at the bottom */}
        <EmergencyStrip />
        </AccessibilityProvider>
        </LocaleProvider>

        {/* Service Worker Registration & Cache Busting */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').then((reg) => {
                    reg.update();
                  }).catch(console.error);
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
