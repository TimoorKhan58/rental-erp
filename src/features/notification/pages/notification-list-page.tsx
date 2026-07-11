"use client";

import { Suspense } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AccessDeniedState, LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { useNotificationPermissions } from "../hooks";
import { NotificationListTable } from "../components";

function NotificationListContent() {
  return <NotificationListTable />;
}

export function NotificationListPage() {
  const { canRead, isLoading } = useNotificationPermissions();

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Checking permissions..." />
      </PageContainer>
    );
  }

  if (!canRead) {
    return (
      <PageContainer>
        <AccessDeniedState description="You do not have permission to view notifications." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Notifications"
        description="Inbox of system notifications delivered by the notification service."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Notifications" },
        ]}
      />

      <Suspense fallback={<LoadingState label="Loading notifications..." />}>
        <NotificationListContent />
      </Suspense>
    </PageContainer>
  );
}
