import { NotificationDetailPage } from "@/features/notification";

type NotificationDetailRouteProps = {
  params: Promise<{ notificationId: string }>;
};

export default async function NotificationDetailRoute({
  params,
}: NotificationDetailRouteProps) {
  const { notificationId } = await params;
  return <NotificationDetailPage notificationId={notificationId} />;
}
