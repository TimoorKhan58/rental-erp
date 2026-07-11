"use client";

import Link from "next/link";
import { AppDrawer } from "@/components/design-system/drawer";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { formatDateTime } from "@/lib/utils";
import type { AuditLogResponse } from "../types";
import { AuditActionBadge } from "../components/audit-action-badge";
import { AuditStatusBadge } from "../components/audit-status-badge";

type AuditPreviewDrawerProps = {
  audit: AuditLogResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function PreviewField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm break-all">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}

export function AuditPreviewDrawer({
  audit,
  open,
  onOpenChange,
}: AuditPreviewDrawerProps) {
  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={audit ? `Audit ${audit.id.slice(0, 8)}…` : "Audit preview"}
      description="Quick preview of the selected audit event."
      side="right"
      width="lg"
      footer={
        audit ? (
          <AppButton render={<Link href={ROUTES.auditDetail(audit.id)} />}>
            Open full detail
          </AppButton>
        ) : null
      }
    >
      {audit ? (
        <dl className="grid gap-4 sm:grid-cols-2">
          <PreviewField label="Timestamp" value={formatDateTime(audit.createdAt)} />
          <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Action
            </dt>
            <dd>
              <AuditActionBadge action={audit.action} />
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </dt>
            <dd>
              <AuditStatusBadge status={audit.status} />
            </dd>
          </div>
          <PreviewField label="Module" value={audit.module} />
          <PreviewField label="Entity" value={audit.entityName} />
          <PreviewField label="Entity ID" value={audit.recordId} />
          <PreviewField label="User ID" value={audit.userId} />
          <PreviewField label="Request ID" value={audit.requestId} />
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">No audit selected.</p>
      )}
    </AppDrawer>
  );
}
