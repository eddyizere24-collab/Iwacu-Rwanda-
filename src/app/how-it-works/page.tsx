import type { Metadata } from "next";
import { InfoPage } from "@/components/info/InfoPage";
import { createSitePageMetadata } from "@/lib/site-page-metadata";

type Props = { searchParams: Promise<{ lang?: string | string[] }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return createSitePageMetadata("how-it-works", searchParams);
}

export default function Page() {
  return <InfoPage page="how-it-works" />;
}
