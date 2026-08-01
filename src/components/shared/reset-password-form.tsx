"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { resetPassword } from "@/lib/auth/client";
import {
  createSelfServiceResetPasswordSchema,
  type SelfServiceResetPasswordFormValues,
} from "@/lib/auth/reset-password-form.schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const INVALID_TOKEN_MESSAGE =
  "This reset link is invalid or has expired. Request a new one.";

const SUCCESS_MESSAGE =
  "Your password has been updated. Redirecting you to sign in…";

const INVITE_SUCCESS_MESSAGE =
  "Your password has been created. Redirecting you to sign in…";

const SUCCESS_REDIRECT_MS = 1500;

type ResetPasswordFormProps = {
  minPasswordLength: number;
};

export function ResetPasswordForm({ minPasswordLength }: ResetPasswordFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const urlError = searchParams.get("error");
  const isInvite = searchParams.get("invite") === "1";

  const schema = useMemo(
    () => createSelfServiceResetPasswordSchema(minPasswordLength),
    [minPasswordLength],
  );

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof SelfServiceResetPasswordFormValues, string>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tokenMissingOrInvalid =
    urlError === "INVALID_TOKEN" || token === null || token.length === 0;

  useEffect(() => {
    if (!succeeded) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, SUCCESS_REDIRECT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [router, succeeded]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (tokenMissingOrInvalid || token === null) {
      setError(INVALID_TOKEN_MESSAGE);
      return;
    }

    const parsed = schema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      const nextErrors: Partial<
        Record<keyof SelfServiceResetPasswordFormValues, string>
      > = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "password" || key === "confirmPassword") {
          nextErrors[key] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await resetPassword({
        newPassword: parsed.data.password,
        token,
      });

      if (result.error) {
        const message = result.error.message?.toLowerCase() ?? "";
        const code = result.error.code?.toLowerCase() ?? "";
        const isRateLimited =
          code.includes("rate") ||
          message.includes("too many") ||
          message.includes("rate limit");

        setError(
          isRateLimited
            ? "Too many password attempts. Please wait a minute and try again."
            : INVALID_TOKEN_MESSAGE,
        );
        return;
      }

      setSucceeded(true);
    } catch {
      setError(INVALID_TOKEN_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full border-border/60 shadow-soft-lg">
      <CardHeader className="space-y-1 pb-4 lg:hidden">
        <CardTitle className="font-heading text-xl">
          {isInvite ? "Create your password" : "Reset password"}
        </CardTitle>
        <CardDescription>
          {isInvite
            ? "Set a password to activate your MT-ERP account."
            : "Choose a new password for your account."}
        </CardDescription>
      </CardHeader>
      <CardContent className={cn("space-y-5", "lg:px-6 lg:pb-6 lg:pt-0")}>
        {succeeded ? (
          <div className="space-y-4">
            <p
              className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-sm text-foreground"
              role="status"
            >
              {isInvite ? INVITE_SUCCESS_MESSAGE : SUCCESS_MESSAGE}
            </p>
            <Link
              href="/login"
              className={cn(
                "inline-flex h-10 w-full items-center justify-center rounded-lg border border-border/60 bg-card text-sm font-medium transition-colors hover:bg-secondary",
              )}
            >
              Continue to sign in
            </Link>
          </div>
        ) : tokenMissingOrInvalid ? (
          <div className="space-y-4">
            <p
              className="rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2.5 text-sm text-destructive"
              role="alert"
            >
              {INVALID_TOKEN_MESSAGE}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/forgot-password"
                className={cn(
                  "inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-brand text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90",
                )}
              >
                Request a new link
              </Link>
              <Link
                href="/login"
                className={cn(
                  "inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-border/60 bg-card text-sm font-medium transition-colors hover:bg-secondary",
                )}
              >
                Back to sign in
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <label htmlFor="reset-password-new" className="text-sm font-medium">
                New password
              </label>
              <Input
                id="reset-password-new"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={isSubmitting}
                minLength={minPasswordLength}
                maxLength={128}
                className="h-10 border-border/60 bg-muted/30 focus-visible:bg-card"
              />
              {fieldErrors.password ? (
                <p className="text-sm text-destructive" role="alert">
                  {fieldErrors.password}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  At least {minPasswordLength} characters.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label
                htmlFor="reset-password-confirm"
                className="text-sm font-medium"
              >
                Confirm password
              </label>
              <Input
                id="reset-password-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                disabled={isSubmitting}
                minLength={minPasswordLength}
                maxLength={128}
                className="h-10 border-border/60 bg-muted/30 focus-visible:bg-card"
              />
              {fieldErrors.confirmPassword ? (
                <p className="text-sm text-destructive" role="alert">
                  {fieldErrors.confirmPassword}
                </p>
              ) : null}
            </div>
            {error ? (
              <div className="space-y-3">
                <p
                  className="rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2.5 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </p>
                <Link
                  href="/forgot-password"
                  className={cn(
                    "inline-flex h-10 w-full items-center justify-center rounded-lg bg-brand text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90",
                  )}
                >
                  Request a new link
                </Link>
              </div>
            ) : null}
            <Button
              type="submit"
              className="h-10 w-full bg-brand text-brand-foreground hover:bg-brand/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  {isInvite ? "Creating password..." : "Updating password..."}
                </>
              ) : isInvite ? (
                "Create password"
              ) : (
                "Update password"
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/login"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
