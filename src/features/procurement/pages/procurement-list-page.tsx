"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { useProcurementPermissions } from "../hooks";
import { ProcurementListTable } from "../tables";

export function ProcurementListPage() {
  const { canCreate } = useProcurementPermissions();

  return (
    <PageContainer className="space-y-5">
      <PageHeader
        title="Purchases"
        description="Stock you buy from suppliers. Draft an order, approve it, then receive the goods; stock goes up only when goods are received."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Purchases" },
        ]}
        actions={
          canCreate ? (
            <AppButton
              leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.procurementsNew} />}
            >
              New purchase order
            </AppButton>
          ) : undefined
        }
      />

      <ProcurementListTable />
    </PageContainer>
  );
}
