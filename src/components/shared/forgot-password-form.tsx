"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2Icon } from "lucide-react";
import { requestPasswordReset } from "@/lib/auth/client";
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

/** Better Auth redirects here with `?token=` after validating the email link. */
const RESET_PASSWORD_REDIRECT = "/reset-password";

const SUCCESS_MESSAGE =
  "If an account exists for that email, a password reset link has been sent.";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await requestPasswordReset({
      email,
      redirectTo: RESET_PASSWORD_REDIRECT,
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(
        result.error.message ??
          "Unable to send a reset email right now. Try again later.",
      );
      return;
    }

    setSubmitted(true);
  }

  return (
    <Card className="w-full border-border/60 shadow-soft-lg">
      <CardHeader className="space-y-1 pb-4 lg:hidden">
        <CardTitle className="font-heading text-xl">Forgot password</CardTitle>
        <CardDescription>
          Enter your email and we will send a reset link if an account exists.
        </CardDescription>
      </CardHeader>
      <CardContent className={cn("space-y-5", "lg:px-6 lg:pb-6 lg:pt-0")}>
        {submitted ? (
          <div className="space-y-4">
            <p
              className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-sm text-foreground"
              role="status"
            >
              {SUCCESS_MESSAGE}
            </p>
            <Link
              href="/login"
              className={cn(
                "inline-flex h-10 w-full items-center justify-center rounded-lg border border-border/60 bg-card text-sm font-medium transition-colors hover:bg-secondary",
              )}
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="forgot-password-email" className="text-sm font-medium">
                Email address
              </label>
              <Input
                id="forgot-password-email"
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={isSubmitting}
                className="h-10 border-border/60 bg-muted/30 focus-visible:bg-card"
              />
            </div>
            {error && (
              <p
                className="rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2.5 text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="h-10 w-full bg-brand text-brand-foreground hover:bg-brand/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Sending reset link...
                </>
              ) : (
                "Send reset link"
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Remembered your password?{" "}
              <Link
                href="/login"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
