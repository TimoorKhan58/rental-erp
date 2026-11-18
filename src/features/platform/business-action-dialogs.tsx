"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AppButton } from "@/components/design-system/button";
import { InlineError } from "@/components/design-system/feedback";
import { AppModal } from "@/components/design-system/modal";
import { ApiClientError } from "@/lib/api";

import {
  generateTemporaryPassword,
  platformBusinessesKey,
  resetOwnerPassword,
  setBusinessActive,
  type PlatformBusiness,
} from "./platform-api";
import { ShareCredentials } from "./share-credentials";

/** Rendered only while open, keyed by business, so each opening starts fresh. */
type DialogProps = { business: PlatformBusiness; onClose: () => void };

function errorText(caught: unknown, fallback: string): string {
  return caught instanceof ApiClientError ? caught.message : fallback;
}

/** Deactivate (users signed out, cannot sign in; data kept) or reactivate. */
export function ToggleBusinessDialog({ business, onClose }: DialogProps) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deactivating = business.isActive;

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await setBusinessActive(business.id, !deactivating);
      await queryClient.invalidateQueries({ queryKey: platformBusinessesKey });
      onClose();
    } catch (caught) {
      setError(errorText(caught, "Could not update the business."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppModal
      open
      onOpenChange={(next) => !next && !busy && onClose()}
      title={deactivating ? `Deactivate ${business.name}?` : `Reactivate ${business.name}?`}
      description={
        deactivating
          ? "Its users are signed out and cannot sign in until you reactivate it. No data is deleted."
          : "Its users can sign in again."
      }
      size="md"
    >
      <div className="space-y-4">
        {error !== null && <InlineError message={error} />}
        <div className="flex justify-end gap-3">
          <AppButton variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton variant={deactivating ? "destructive" : "default"} loading={busy} onClick={confirm}>
            {deactivating ? "Deactivate" : "Reactivate"}
          </AppButton>
        </div>
      </div>
    </AppModal>
  );
}

/** Give the owner a new temporary password; they choose their own at sign-in. */
export function ResetOwnerPasswordDialog({ business, onClose }: DialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password] = useState(generateTemporaryPassword);
  const [done, setDone] = useState<{ email: string; password: string } | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await resetOwnerPassword(business.id, password);
      setDone({ email: result.ownerEmail, password });
    } catch (caught) {
      setError(errorText(caught, "Could not reset the password."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppModal
      open
      onOpenChange={(next) => !next && !busy && onClose()}
      title={done ? "Password reset" : `Reset the owner's password for ${business.name}?`}
      description={
        done
          ? "The owner was signed out everywhere."
          : `${business.owner?.email ?? "The owner"} gets a new temporary password and is signed out everywhere.`
      }
      size="md"
    >
      <div className="space-y-4">
        {done ? <ShareCredentials email={done.email} password={done.password} /> : null}
        {error !== null && <InlineError message={error} />}
        <div className="flex justify-end gap-3">
          {done ? (
            <AppButton onClick={onClose}>Done</AppButton>
          ) : (
            <>
              <AppButton variant="outline" disabled={busy} onClick={onClose}>
                Cancel
              </AppButton>
              <AppButton loading={busy} onClick={confirm}>
                Reset password
              </AppButton>
            </>
          )}
        </div>
      </div>
    </AppModal>
  );
}
