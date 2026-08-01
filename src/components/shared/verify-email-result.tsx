"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resolveVerificationOutcome } from "@/lib/auth/verify-email-outcome";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const SUCCESS_MESSAGE = "Email verified successfully.";
const FAILURE_MESSAGE = "Verification link is invalid or expired.";
const NEUTRAL_MESSAGE =
  "Open the verification link from your email to confirm your address.";
const SUCCESS_REDIRECT_MS = 2500;

export function VerifyEmailResult() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const outcome = resolveVerificationOutcome(
    searchParams.get("status"),
    searchParams.get("error"),
  );

  useEffect(() => {
    if (outcome !== "success") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, SUCCESS_REDIRECT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [outcome, router]);

  const title =
    outcome === "success"
      ? "Email verified"
      : outcome === "failure"
        ? "Verification failed"
        : "Email verification";

  const description =
    outcome === "success"
      ? "Your email address has been confirmed."
      : outcome === "failure"
        ? "We could not verify this email address."
        : "Use the link from your verification email.";

  const message =
    outcome === "success"
      ? SUCCESS_MESSAGE
      : outcome === "failure"
        ? FAILURE_MESSAGE
        : NEUTRAL_MESSAGE;

  return (
    <Card className="w-full border-border/60 shadow-soft-lg">
      <CardHeader className="space-y-1 pb-4 lg:hidden">
        <CardTitle className="font-heading text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className={cn("space-y-5", "lg:px-6 lg:pb-6 lg:pt-0")}>
        <div className="space-y-4">
          <p
            className={cn(
              "rounded-lg border px-3 py-2.5 text-sm",
              outcome === "failure"
                ? "border-destructive/20 bg-destructive/8 text-destructive"
                : "border-border/60 bg-muted/30 text-foreground",
            )}
            role={outcome === "failure" ? "alert" : "status"}
          >
            {message}
          </p>
          {outcome === "success" ? (
            <p className="text-center text-sm text-muted-foreground">
              Redirecting you to sign in…
            </p>
          ) : null}
          <Link
            href="/login"
            className={cn(
              "inline-flex h-10 w-full items-center justify-center rounded-lg text-sm font-medium transition-colors",
              outcome === "success"
                ? "bg-brand text-brand-foreground hover:bg-brand/90"
                : "border border-border/60 bg-card hover:bg-secondary",
            )}
          >
            Continue to sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
