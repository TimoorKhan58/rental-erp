"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SectionCard } from "@/components/design-system/card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingState, QueryErrorState } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import {
  listSessions,
  revokeOtherSessions,
  revokeSession,
  useSession,
} from "@/lib/auth/client";
import { parseUserAgent } from "@/lib/auth/parse-user-agent";
import { formatDateTime } from "@/lib/utils";
import { queryKeys } from "@/lib/query";
import { toast } from "sonner";
import { ReadOnlyField } from "../components/read-only-field";

type ListedSession = {
  id?: string;
  token?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  expiresAt: string | Date;
};

async function fetchActiveSessions(): Promise<ListedSession[]> {
  const result = await listSessions();

  if (result.error) {
    throw new Error(result.error.message ?? "Failed to load sessions");
  }

  const data = result.data;
  if (!Array.isArray(data)) {
    return [];
  }

  return data as ListedSession[];
}

function sessionRowKey(session: ListedSession, index: number): string {
  // Prefer BA id for stable keys only — never rendered.
  if (typeof session.id === "string" && session.id.length > 0) {
    return session.id;
  }

  return `session-${index}`;
}

export function ActiveSessionsPanel() {
  const queryClient = useQueryClient();
  const { data: currentAuth } = useSession();
  const currentToken = currentAuth?.session?.token;
  const [pendingSession, setPendingSession] = useState<ListedSession | null>(null);
  const [confirmRevokeOthersOpen, setConfirmRevokeOthersOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isRevokingOthers, setIsRevokingOthers] = useState(false);

  const {
    data: sessions = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.auth.sessions(),
    queryFn: fetchActiveSessions,
  });

  const sortedSessions = [...sessions].sort((a, b) => {
    const aTime = new Date(a.updatedAt).getTime();
    const bTime = new Date(b.updatedAt).getTime();
    return bTime - aTime;
  });

  const otherSessionCount = sortedSessions.filter((session) => {
    if (
      typeof currentToken !== "string" ||
      currentToken.length === 0 ||
      typeof session.token !== "string"
    ) {
      return true;
    }

    return session.token !== currentToken;
  }).length;

  async function handleConfirmRevokeOthers() {
    setIsRevokingOthers(true);

    const result = await revokeOtherSessions();

    setIsRevokingOthers(false);

    if (result.error) {
      toast.error("Unable to sign out other devices. Try again.");
      return;
    }

    setConfirmRevokeOthersOpen(false);
    await queryClient.invalidateQueries({ queryKey: queryKeys.auth.sessions() });
    toast.success("Other devices signed out.");
  }

  async function handleConfirmRevoke() {
    if (
      pendingSession === null ||
      typeof pendingSession.token !== "string" ||
      pendingSession.token.length === 0
    ) {
      setPendingSession(null);
      return;
    }

    setIsRevoking(true);

    const result = await revokeSession({
      token: pendingSession.token,
    });

    setIsRevoking(false);

    if (result.error) {
      toast.error("Unable to sign out that session. Try again.");
      return;
    }

    setPendingSession(null);
    await queryClient.invalidateQueries({ queryKey: queryKeys.auth.sessions() });
    toast.success("Session signed out.");
  }

  return (
    <>
      <SectionCard
        title="Active sessions"
        description="Devices and browsers currently signed in to your account."
      >
        {isLoading ? (
          <LoadingState label="Loading sessions..." />
        ) : isError ? (
          <QueryErrorState
            title="Failed to load sessions"
            description={error instanceof Error ? error.message : "An error occurred."}
            onRetry={() => void refetch()}
          />
        ) : sortedSessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active sessions found.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {otherSessionCount === 0
                  ? "Only this device is signed in."
                  : `${otherSessionCount} other ${otherSessionCount === 1 ? "device is" : "devices are"} signed in.`}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  otherSessionCount === 0 || isRevoking || isRevokingOthers
                }
                onClick={() => setConfirmRevokeOthersOpen(true)}
              >
                Sign out other devices
              </Button>
            </div>
            <ul className="space-y-4">
            {sortedSessions.map((session, index) => {
              const { browser, operatingSystem } = parseUserAgent(session.userAgent);
              const isCurrent =
                typeof currentToken === "string" &&
                currentToken.length > 0 &&
                session.token === currentToken;

              return (
                <li
                  key={sessionRowKey(session, index)}
                  className="rounded-lg border border-border/60 bg-muted/20 p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {browser} on {operatingSystem}
                      </p>
                      {isCurrent ? (
                        <StatusBadge label="Current session" tone="info" />
                      ) : null}
                    </div>
                    {!isCurrent ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPendingSession(session)}
                      >
                        Sign out
                      </Button>
                    ) : null}
                  </div>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <ReadOnlyField label="IP address" value={session.ipAddress} />
                    <ReadOnlyField
                      label="Created"
                      value={formatDateTime(session.createdAt)}
                    />
                    <ReadOnlyField
                      label="Last updated"
                      value={formatDateTime(session.updatedAt)}
                    />
                    <ReadOnlyField
                      label="Expires"
                      value={formatDateTime(session.expiresAt)}
                    />
                  </dl>
                </li>
              );
            })}
            </ul>
          </>
        )}
      </SectionCard>
      <ConfirmDialog
        open={confirmRevokeOthersOpen}
        onOpenChange={setConfirmRevokeOthersOpen}
        title="Sign out other devices?"
        description="All other signed-in devices and browsers will be logged out. This device will stay signed in."
        confirmLabel={isRevokingOthers ? "Signing out..." : "Sign out other devices"}
        cancelLabel="Cancel"
        onConfirm={() => {
          void handleConfirmRevokeOthers();
        }}
        isLoading={isRevokingOthers}
        destructive
      />
      <ConfirmDialog
        open={pendingSession !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingSession(null);
          }
        }}
        title="Sign out this session?"
        description="This will remove access for that device or browser."
        confirmLabel={isRevoking ? "Signing out..." : "Sign out"}
        cancelLabel="Cancel"
        onConfirm={() => {
          void handleConfirmRevoke();
        }}
        isLoading={isRevoking}
        destructive
      />
    </>
  );
}
