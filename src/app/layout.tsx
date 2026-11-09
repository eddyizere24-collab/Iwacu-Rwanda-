import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";
import { EmergencyStrip } from "@/components/EmergencyStrip";
import { LocaleProvider } from "@/components/LocaleProvider";
import { AttributionFooter } from "@/components/AttributionFooter";
import { normalizeLocale, translateText } from "@/lib/i18n";
import { cookies } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get("iwacu-locale")?.value);
  const title = "IWACU RWANDA — " + translateText("Menya aho uri. Abayobozi baho, hafi yawe.", locale);
  const description = translateText(
    "Menya aho uri. Reba abayobozi baho, ubahamagare cyangwa ubandikire. Harimo n'inimero z'ubutabazi.",
    locale
  );
  return {
    title,
    description,
    manifest: "/manifest.json",
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
        <meta name="theme-color" content="#00A3E0" />
      </head>
      <body className={`${fontDisplay.variable} ${fontBody.variable} flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-[#00A3E0] selection:text-white pb-20`}>
        <LocaleProvider initialLocale={initialLocale}>
        {/* Top Header with Rwandan Sun & Agaseke branding */}
        <AppHeader />

        {/* Main Viewport Content */}
        <main id="main-content" className="relative flex-1">
          {children}
        </main>

        <AttributionFooter />

        {/* Fixed Emergency Strip at the bottom */}
        <EmergencyStrip />
        </LocaleProvider>

        {/* Service Worker Registration & Cache Busting */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  // Purge old caches unconditionally
                  if ('caches' in window) {
                    caches.keys().then((keys) => {
                      keys.forEach((key) => {
                        if (!key.includes('v2-nocache-html')) {
                          caches.delete(key);
                        }
                      });
                    });
                  }

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
