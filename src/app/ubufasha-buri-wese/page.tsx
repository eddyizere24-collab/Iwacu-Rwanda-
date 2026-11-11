import type { Metadata } from "next";
import { AccessibilityInfoPage } from "@/components/AccessibilityInfoPage";

export const metadata: Metadata = {
  title: "IWACU RWANDA — Iwacu ni urugo rwa buri wese",
  description: "Uko IWACU RWANDA yorohereza abafite ubumuga, abantu bagorwa no gusoma no kwandika, n'abafite internet nke kugera kuri serivisi zayo.",
};

export default function Page() {
  return <AccessibilityInfoPage />;
}
