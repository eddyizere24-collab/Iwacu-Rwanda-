"use client";

import { useParams } from "next/navigation";
import { DossierView } from "@/components/office/DossierView";
import { PageTitle, useOffice } from "@/components/office/office-ui";

const SCOPE_CODE = /^RW(-[A-Za-z0-9]{1,12}){0,5}$/;

export default function PlacePage() {
  const params = useParams<{ scope: string }>();
  const { t } = useOffice();
  const scope = typeof params?.scope === "string" ? decodeURIComponent(params.scope) : "";
  if (!SCOPE_CODE.test(scope)) return <PageTitle title={t("error_generic")} />;
  return <DossierView scope={scope} />;
}
