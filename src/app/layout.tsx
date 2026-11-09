import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";
import { EmergencyStrip } from "@/components/EmergencyStrip";

export const metadata: Metadata = {
  title: "IWACU RWANDA — Menya aho uri n'abayobozi baho",
  description:
    "Kanda «Menya aho uri» umenye aho uri n'abayobozi baho, ubahamagare. Harimo na nimero z'ubutabazi.",
  manifest: "/manifest.json",
  openGraph: {
    title: "IWACU RWANDA — Menya aho uri n'abayobozi baho",
    description:
      "Kanda «Menya aho uri» umenye aho uri n'abayobozi baho, ubahamagare. Harimo na nimero z'ubutabazi.",
    type: "website",
  },
};

// CHANGED 2026-11-06 CLAUDE: Fraunces (headings) + DM Sans (body) via next/font; see docs/HANDOFF.md
const fontDisplay = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const fontBody = DM_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="rw" className="scroll-smooth">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#00A3E0" />
      </head>
      <body className={`${fontDisplay.variable} ${fontBody.variable} min-h-screen bg-background text-foreground antialiased selection:bg-[#00A3E0] selection:text-white pb-24`}>
        {/* Top Header with Rwandan Sun & Agaseke branding */}
        <AppHeader />

        {/* Main Viewport Content */}
        <main id="main-content" className="relative">
          {children}
        </main>

        {/* Data attribution (CC BY 4.0 / ODbL). CHANGED 2026-11-01 CLAUDE-PATCH; see docs/HANDOFF.md */}
        <footer className="mx-auto mb-6 max-w-3xl rounded-2xl bg-white/85 px-4 py-4 text-center text-xs leading-relaxed text-slate-700 shadow-sm">
          <p>Inkomoko y&apos;imipaka: National Institute of Statistics of Rwanda (CC BY 4.0). Ikarita: © OpenStreetMap contributors (ODbL).</p>
          <p className="mt-1">
            Ifoto y&apos;imisozi ya Bigogwe:{" "}
            <a
              href="https://commons.wikimedia.org/wiki/File:Beauty_of_Bigogwe_farms.jpg"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[#20603D] underline underline-offset-2"
            >
              Adygrafix250 / Wikimedia Commons
            </a>{" "}
            (CC BY 4.0; yahinduwe mu mikoreshereze yayo).
          </p>
          <p className="mt-1">
            Amafoto y&apos;ingagi:{" "}
            <a
              href="https://commons.wikimedia.org/wiki/File:Mountain_gorilla_(Gorilla_beringei_beringei)_female_with_baby.jpg"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[#20603D] underline underline-offset-2"
            >
              Charlesjsharp / Wikimedia Commons
            </a>{" "}
            (
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[#20603D] underline underline-offset-2"
            >
              CC BY-SA 4.0
            </a>
            ; yahinduwe mu mikoreshereze yayo){" "}
            ·{" "}
            <a
              href="https://commons.wikimedia.org/wiki/File:Mountain_gorilla_(Gorilla_beringei_beringei)_female_3.jpg"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[#20603D] underline underline-offset-2"
            >
              Charlesjsharp / Wikimedia Commons
            </a>{" "}
            (CC BY-SA 4.0).
          </p>
        </footer>

        {/* Fixed Emergency Strip at the bottom */}
        <EmergencyStrip />

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
