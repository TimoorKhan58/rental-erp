"use client";

import Link from "next/link";
import { ArrowLeftIcon, CheckIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { SectionCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import {
  AccessDeniedState,
  LoadingState,
  QueryErrorState,
} from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatDateTime } from "@/lib/utils";
import {
  useMarkNotificationRead,
  useNotification,
  useNotificationPermissions,
} from "../hooks";
import { NotificationChannelBadge } from "../components/notification-channel-badge";
import { NotificationPriorityBadge } from "../components/notification-priority-badge";
import { NotificationStatusBadge } from "../components/notification-status-badge";

type NotificationDetailPageProps = {
  notificationId: string;
};

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const display =
    value === null || value === undefined || (typeof value === "string" && !value.trim())
      ? "—"
      : String(value);

  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="break-all text-sm">{display}</dd>
    </div>
  );
}

export function NotificationDetailPage({
  notificationId,
}: NotificationDetailPageProps) {
  const { canRead, canUpdate, isLoading: permissionsLoading } =
    useNotificationPermissions();
  const { data: notification, isLoading, isError, error, refetch } =
    useNotification(notificationId, canRead);
  const markRead = useMarkNotificationRead();

  if (permissionsLoading || isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading notification..." />
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

  if (isError || !notification) {
    return (
      <PageContainer>
        <QueryErrorState
          title="Notification not found"
          description={
            error?.message ?? "The requested notification could not be loaded."
          }
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={notification.title}
        description={notification.subject || notification.module}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Notifications", href: ROUTES.notifications },
          { label: notification.title.slice(0, 40) },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {canUpdate && !notification.isRead ? (
              <AppButton
                leftIcon={<CheckIcon className="size-4" aria-hidden="true" />}
                onClick={() => markRead.mutate(notification.id)}
                loading={markRead.isPending}
              >
                Mark as read
              </AppButton>
            ) : null}
            <AppButton
              variant="outline"
              leftIcon={<ArrowLeftIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.notifications} />}
            >
              Back
            </AppButton>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard
            title="Message"
            actions={
              <div className="flex flex-wrap gap-2">
                <NotificationChannelBadge channel={notification.channel} />
                <NotificationPriorityBadge priority={notification.priority} />
                <NotificationStatusBadge status={notification.status} />
              </div>
            }
          >
            <div className="space-y-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {notification.body}
              </p>
              {!notification.isRead ? (
                <p className="text-xs font-medium text-info" role="status">
                  Unread
                </p>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="Related entity">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Module" value={notification.module} />
              <DetailField label="Entity" value={notification.entityName} />
              <DetailField label="Record ID" value={notification.recordId} />
              <DetailField label="Subject" value={notification.subject} />
            </dl>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Delivery">
            <dl className="space-y-4">
              <DetailField label="Recipient" value={notification.recipientName} />
              <DetailField label="Recipient ID" value={notification.recipientId} />
              <DetailField label="User ID" value={notification.userId} />
              <DetailField
                label="Created"
                value={formatDateTime(notification.createdAt)}
              />
              <DetailField
                label="Read at"
                value={formatDateTime(notification.readAt)}
              />
              <DetailField
                label="Scheduled"
                value={formatDateTime(notification.scheduledAt)}
              />
              <DetailField label="Sent" value={formatDateTime(notification.sentAt)} />
              <DetailField
                label="Delivered"
                value={formatDateTime(notification.deliveredAt)}
              />
              <DetailField
                label="Updated"
                value={formatDateTime(notification.updatedAt)}
              />
            </dl>
          </SectionCard>
        </div>
      </div>
    </PageContainer>
  );
}
