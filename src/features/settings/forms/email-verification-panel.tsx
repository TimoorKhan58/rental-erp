"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AppButton } from "@/components/design-system/button";
import { SectionCard } from "@/components/design-system/card";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  sendVerificationEmail,
  useSession,
} from "@/lib/auth/client";
import { VERIFICATION_SUCCESS_CALLBACK } from "@/shared/infrastructure/email/email-paths";

const RESEND_SUCCESS_MESSAGE =
  "Verification email sent. Please check your inbox.";
const RESEND_ERROR_MESSAGE =
  "Unable to send a verification email right now. Try again later.";

export function EmailVerificationPanel() {
  const { data: authSession, isPending } = useSession();
  const [isSending, setIsSending] = useState(false);

  const user = authSession?.user;
  const emailVerified = user?.emailVerified === true;
  const email = user?.email?.trim() ?? "";

  async function handleResend() {
    if (email.length === 0 || emailVerified) {
      return;
    }

    setIsSending(true);

    const result = await sendVerificationEmail({
      email,
      callbackURL: VERIFICATION_SUCCESS_CALLBACK,
    });

    setIsSending(false);

    if (result.error) {
      toast.error(RESEND_ERROR_MESSAGE);
      return;
    }

    // BA returns a generic success for several cases; keep messaging non-enumerating.
    toast.success(RESEND_SUCCESS_MESSAGE);
  }

  return (
    <SectionCard
      title="Email verification"
      description="Confirm the email address on your signed-in account."
      actions={
        !isPending && !emailVerified && email.length > 0 ? (
          <AppButton
            type="button"
            variant="outline"
            loading={isSending}
            onClick={() => {
              void handleResend();
            }}
          >
            Resend verification email
          </AppButton>
        ) : null
      }
    >
      {isPending ? (
        <p className="text-sm text-muted-foreground">Loading verification status…</p>
      ) : user === undefined ? (
        <p className="text-sm text-muted-foreground">
          Sign in again to view email verification status.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {emailVerified ? (
            <StatusBadge label="Verified" tone="success" />
          ) : (
            <StatusBadge label="Email not verified" tone="warning" />
          )}
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
      )}
    </SectionCard>
  );
}
