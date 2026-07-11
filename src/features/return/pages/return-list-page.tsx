"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { useReturnPermissions } from "../hooks";
import { ReturnListTable } from "../tables";

export function ReturnListPage() {
  const { canCreate } = useReturnPermissions();

  return (
    <PageContainer>
      <PageHeader
        title="Returns"
        description="Manage returned rental assets and inspection workflows."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Returns" },
        ]}
        actions={
          canCreate ? (
            <AppButton
              leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.returnsNew} />}
            >
              New return
            </AppButton>
          ) : undefined
        }
      />

      <ReturnListTable />
    </PageContainer>
  );
}
