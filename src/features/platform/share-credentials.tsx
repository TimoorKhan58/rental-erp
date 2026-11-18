"use client";

/** Sign-in details to pass to an owner once; the password is not shown again. */
export function ShareCredentials({ email, password }: { email: string; password: string }) {
  const signInUrl = typeof window === "undefined" ? "/login" : `${window.location.origin}/login`;
  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/40 p-4 text-sm">
      <p className="font-medium">Give these to the owner (shown only now):</p>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
        <dt className="text-muted-foreground">Sign in at</dt>
        <dd className="break-all">{signInUrl}</dd>
        <dt className="text-muted-foreground">Email</dt>
        <dd className="break-all">{email}</dd>
        <dt className="text-muted-foreground">Temporary password</dt>
        <dd className="break-all font-mono">{password}</dd>
      </dl>
      <p className="text-muted-foreground">They will be asked to choose their own password at first sign-in.</p>
    </div>
  );
}
