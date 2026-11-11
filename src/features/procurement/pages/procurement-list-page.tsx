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
        title="Procurement"
        description="Draft, approve, then receive goods. Inventory increases only when goods are received. Order totals are stored on the purchase order; receiving does not post expenses or journals."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Procurement" },
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
