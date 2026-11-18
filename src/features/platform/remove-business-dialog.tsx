"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AppButton } from "@/components/design-system/button";
import { InlineError } from "@/components/design-system/feedback";
import { AppModal } from "@/components/design-system/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiClientError } from "@/lib/api";

import { platformBusinessesKey, removeBusiness, type PlatformBusiness } from "./platform-api";

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

/** Permanently remove a business that has left (SaaS phase 4d). Rendered only while open. */
export function RemoveBusinessDialog({ business, onClose }: { business: PlatformBusiness; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [typed, setTyped] = useState("");
  const [backup, setBackup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ removedRecords: number } | null>(null);

  const { removal } = business;
  const canConfirm = removal.allowed && backup && typed.trim() === business.slug && !busy;

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await removeBusiness(business.id, typed.trim());
      setDone({ removedRecords: result.removedRecords });
      await queryClient.invalidateQueries({ queryKey: platformBusinessesKey });
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Could not remove the business.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppModal
      open
      onOpenChange={(next) => !next && !busy && onClose()}
      title={done ? `${business.name} was removed` : `Remove ${business.name} permanently?`}
      description={
        done
          ? `${done.removedRecords} records and its logins were deleted. The platform audit log keeps a record that it existed.`
          : "This deletes all of its data and logins. It cannot be undone."
      }
      size="md"
    >
      {done ? (
        <div className="flex justify-end">
          <AppButton onClick={onClose}>Done</AppButton>
        </div>
      ) : !removal.allowed ? (
        <div className="space-y-4 text-sm">
          <p className="font-medium">Not yet:</p>
          <ul className="list-disc space-y-1 pl-5">
            {removal.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          {removal.allowedFrom !== null && (
            <p className="text-muted-foreground">
              Earliest removal: {dateFormat.format(new Date(removal.allowedFrom))}. Until then it can be reactivated.
            </p>
          )}
          <div className="flex justify-end">
            <AppButton variant="outline" onClick={onClose}>
              Close
            </AppButton>
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              Deactivated on {business.deactivatedAt ? dateFormat.format(new Date(business.deactivatedAt)) : "—"}.
            </li>
            <li>Data exported on {business.lastExportAt ? dateFormat.format(new Date(business.lastExportAt)) : "—"}.</li>
          </ul>
          <label className="flex items-start gap-2">
            <input type="checkbox" className="mt-0.5" checked={backup} onChange={(event) => setBackup(event.target.checked)} />
            <span>
              A database backup was taken just now (<code>npm run db:backup</code>).
            </span>
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="remove-confirm">
              Type <span className="font-mono font-medium">{business.slug}</span> to confirm
            </Label>
            <Input id="remove-confirm" autoComplete="off" value={typed} onChange={(event) => setTyped(event.target.value)} />
          </div>
          {error !== null && <InlineError message={error} />}
          <div className="flex justify-end gap-3">
            <AppButton variant="outline" disabled={busy} onClick={onClose}>
              Cancel
            </AppButton>
            <AppButton variant="destructive" loading={busy} disabled={!canConfirm} onClick={confirm}>
              Remove permanently
            </AppButton>
          </div>
        </div>
      )}
    </AppModal>
  );
}
