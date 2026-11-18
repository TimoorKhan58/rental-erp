"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AppButton } from "@/components/design-system/button";
import { InlineError } from "@/components/design-system/feedback";
import { AppModal } from "@/components/design-system/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiClientError } from "@/lib/api";

import { platformBusinessesKey, setBusinessPlan, type PlatformBusiness } from "./platform-api";

/** Blank = no limit; otherwise a whole number from 1. */
function parseLimit(text: string): { value: number | null; error: string | null } {
  const trimmed = text.trim();
  if (trimmed === "") return { value: null, error: null };
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < 1 || value > 10_000) {
    return { value: null, error: "Use a whole number from 1, or leave empty for no limit" };
  }
  return { value, error: null };
}

/** Set a business's plan name and limits (SaaS phase 4c). Rendered only while open. */
export function EditPlanDialog({ business, onClose }: { business: PlatformBusiness; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [planName, setPlanName] = useState(business.plan.name ?? "");
  const [maxUsers, setMaxUsers] = useState(business.plan.maxUsers?.toString() ?? "");
  const [maxWarehouses, setMaxWarehouses] = useState(business.plan.maxWarehouses?.toString() ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const users = parseLimit(maxUsers);
  const warehouses = parseLimit(maxWarehouses);
  const below =
    (users.value !== null && users.value < business.activeUsers) ||
    (warehouses.value !== null && warehouses.value < business.activeWarehouses);

  const save = async () => {
    if (users.error || warehouses.error) return;
    setBusy(true);
    setError(null);
    try {
      await setBusinessPlan(business.id, {
        planName: planName.trim() === "" ? null : planName.trim(),
        maxUsers: users.value,
        maxWarehouses: warehouses.value,
      });
      await queryClient.invalidateQueries({ queryKey: platformBusinessesKey });
      onClose();
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Could not save the plan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppModal
      open
      onOpenChange={(next) => !next && !busy && onClose()}
      title={`Plan for ${business.name}`}
      description="Limits apply to active users and warehouses. Leave a limit empty for no limit."
      size="md"
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="plan-name">Plan name</Label>
          <Input id="plan-name" value={planName} maxLength={60} placeholder="e.g. Pilot, Standard" onChange={(event) => setPlanName(event.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="plan-users">Max active users</Label>
            <Input id="plan-users" inputMode="numeric" value={maxUsers} placeholder="No limit" onChange={(event) => setMaxUsers(event.target.value)} />
            <p className="text-xs text-muted-foreground">In use: {business.activeUsers}</p>
            {users.error && <p className="text-xs text-destructive">{users.error}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-warehouses">Max active warehouses</Label>
            <Input id="plan-warehouses" inputMode="numeric" value={maxWarehouses} placeholder="No limit" onChange={(event) => setMaxWarehouses(event.target.value)} />
            <p className="text-xs text-muted-foreground">In use: {business.activeWarehouses}</p>
            {warehouses.error && <p className="text-xs text-destructive">{warehouses.error}</p>}
          </div>
        </div>
        {below && (
          <p className="text-sm text-muted-foreground">
            A limit below what is in use keeps everything that exists; the business just cannot add or reactivate more.
          </p>
        )}
        {error !== null && <InlineError message={error} />}
        <div className="flex justify-end gap-3">
          <AppButton variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton loading={busy} disabled={Boolean(users.error || warehouses.error)} onClick={save}>
            Save plan
          </AppButton>
        </div>
      </div>
    </AppModal>
  );
}
