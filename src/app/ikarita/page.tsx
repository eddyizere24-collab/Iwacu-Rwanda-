import type { Metadata } from "next";
import { IkaritaMap } from "@/components/IkaritaMap";

export const metadata: Metadata = {
  title: "Ikarita — IWACU RWANDA",
  description: "Ikarita y'u Rwanda ifite imidugudu, utugari, imirenge n'uturere, n'abayobozi b'aho hantu. Shakisha ahantu, urebe imbibi n'abayobozi.",
  alternates: { canonical: "/ikarita" },
};

export default function IkaritaPage() {
  return <IkaritaMap />;
}
