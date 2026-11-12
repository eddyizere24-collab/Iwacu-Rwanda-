import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AccessibilityInfoPage } from "@/components/AccessibilityInfoPage";
import { normalizeLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get("iwacu-locale")?.value);
  const metadata = {
    rw: {
      title: "IWACU RWANDA — Iwacu ni urugo rwa buri wese",
      description: "Uko IWACU RWANDA yorohereza abafite ubumuga, abantu bagorwa no gusoma no kwandika, n'abafite internet nke kugera kuri serivisi zayo.",
    },
    en: {
      title: "IWACU RWANDA — Accessibility and inclusion",
      description: "How IWACU RWANDA supports disabled visitors, people who find reading or writing difficult, and communities with limited internet access.",
    },
    fr: {
      title: "IWACU RWANDA — Accessibilité et inclusion",
      description: "Comment IWACU RWANDA aide les personnes handicapées, celles qui ont des difficultés à lire ou écrire et les communautés ayant un accès limité à Internet.",
    },
  } as const;
  return metadata[locale];
}

export default function Page() {
  return <AccessibilityInfoPage />;
}
