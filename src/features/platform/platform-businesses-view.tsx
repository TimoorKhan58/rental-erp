"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { SemanticBadge } from "@/components/design-system/badge";
import { AppButton } from "@/components/design-system/button";
import { EmptyResults, InlineError } from "@/components/design-system/feedback";
import { DataTable, type DataTableColumn } from "@/components/design-system/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ResetOwnerPasswordDialog, ToggleBusinessDialog } from "./business-action-dialogs";
import { CreateBusinessDialog } from "./create-business-dialog";
import { EditPlanDialog } from "./edit-plan-dialog";
import { RemoveBusinessDialog } from "./remove-business-dialog";
import { getBusinesses, platformBusinessesKey, type PlatformBusiness } from "./platform-api";

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const formatDate = (value: string | null) => (value === null ? "—" : dateFormat.format(new Date(value)));
const usage = (used: number, limit: number | null) => (limit === null ? `${used}` : `${used} / ${limit}`);
const atLimit = (used: number, limit: number | null) => limit !== null && used >= limit;

/** The platform owner's list of businesses (SaaS phase 3c). */
export function PlatformBusinessesView() {
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState<PlatformBusiness | null>(null);
  const [resetting, setResetting] = useState<PlatformBusiness | null>(null);
  const [planning, setPlanning] = useState<PlatformBusiness | null>(null);
  const [removing, setRemoving] = useState<PlatformBusiness | null>(null);
  const query = useQuery({ queryKey: platformBusinessesKey, queryFn: getBusinesses });

  const columns: Array<DataTableColumn<PlatformBusiness>> = [
    {
      id: "business",
      header: "Business",
      cell: (row) => (
        <div className="min-w-0">
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-muted-foreground">{row.slug}</div>
        </div>
      ),
    },
    {
      id: "owner",
      header: "Owner",
      cell: (row) =>
        row.owner ? (
          <div className="min-w-0">
            <div>{row.owner.name}</div>
            <div className="break-all text-xs text-muted-foreground">{row.owner.email}</div>
          </div>
        ) : (
          <span className="text-muted-foreground">No owner login</span>
        ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <SemanticBadge semantic={row.isActive ? "active" : "inactive"}>{row.isActive ? "Active" : "Inactive"}</SemanticBadge>
      ),
    },
    {
      id: "plan",
      header: "Plan and usage",
      cell: (row) => (
        <div className="min-w-0 text-sm">
          <div className="font-medium">{row.plan.name ?? "No plan"}</div>
          <div className="text-xs text-muted-foreground tabular-nums">
            <span className={atLimit(row.activeUsers, row.plan.maxUsers) ? "font-medium text-warning-foreground" : undefined}>
              Users {usage(row.activeUsers, row.plan.maxUsers)}
            </span>
            {" · "}
            <span className={atLimit(row.activeWarehouses, row.plan.maxWarehouses) ? "font-medium text-warning-foreground" : undefined}>
              Warehouses {usage(row.activeWarehouses, row.plan.maxWarehouses)}
            </span>
          </div>
        </div>
      ),
    },
    {
      id: "activity",
      header: "Activity",
      cell: (row) => (
        <div className="min-w-0 text-sm">
          <div className="tabular-nums">
            {row.rentalOrders} {row.rentalOrders === 1 ? "order" : "orders"}
          </div>
          <div className="text-xs text-muted-foreground">
            Last order {formatDate(row.lastOrderAt)} · Last sign-in {formatDate(row.lastSignInAt)}
          </div>
        </div>
      ),
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-24 text-right",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger render={<AppButton size="sm" variant="outline" aria-label={`Manage ${row.name}`} />}>
            Manage
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setPlanning(row)}>Edit plan</DropdownMenuItem>
            <DropdownMenuItem render={<a href={`/api/platform/businesses/${row.id}/export`} download />}>
              Export data
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!row.owner} onClick={() => setResetting(row)}>
              Reset owner password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant={row.isActive ? "destructive" : "default"} onClick={() => setToggling(row)}>
              {row.isActive ? "Deactivate" : "Reactivate"}
            </DropdownMenuItem>
            {!row.isActive && (
              <DropdownMenuItem variant="destructive" onClick={() => setRemoving(row)}>
                Remove permanently…
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Businesses</h2>
        <AppButton onClick={() => setCreating(true)}>New business</AppButton>
      </div>
      {query.data !== undefined && query.data.length > 0 && (
        <dl className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "All businesses", value: query.data.length },
            { label: "Active", value: query.data.filter((b) => b.isActive).length },
            {
              label: "Near their plan limit",
              value: query.data.filter(
                (b) => atLimit(b.activeUsers, b.plan.maxUsers) || atLimit(b.activeWarehouses, b.plan.maxWarehouses),
              ).length,
            },
          ].map((tile) => (
            <div key={tile.label} className="rounded-xl border border-border bg-card px-4 py-3 shadow-soft">
              <dt className="text-xs text-muted-foreground">{tile.label}</dt>
              <dd className="text-2xl font-semibold tabular-nums tracking-tight">{tile.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {query.isError ? (
        <InlineError message="Could not load the businesses. Refresh to try again." />
      ) : (
        <DataTable
          columns={columns}
          data={query.data ?? []}
          getRowId={(row) => row.id}
          isLoading={query.isLoading}
          emptyState={<EmptyResults title="No businesses yet" description="Create the first one." />}
        />
      )}
      {creating && <CreateBusinessDialog onClose={() => setCreating(false)} />}
      {toggling !== null && (
        <ToggleBusinessDialog key={toggling.id} business={toggling} onClose={() => setToggling(null)} />
      )}
      {removing !== null && (
        <RemoveBusinessDialog key={removing.id} business={removing} onClose={() => setRemoving(null)} />
      )}
      {planning !== null && <EditPlanDialog key={planning.id} business={planning} onClose={() => setPlanning(null)} />}
      {resetting !== null && (
        <ResetOwnerPasswordDialog key={resetting.id} business={resetting} onClose={() => setResetting(null)} />
      )}
    </div>
  );
}
