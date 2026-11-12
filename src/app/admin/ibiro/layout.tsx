import { OfficeShell } from "@/components/office/OfficeShell";

export default function OfficeLayout({ children }: { children: React.ReactNode }) {
  return <OfficeShell>{children}</OfficeShell>;
}
