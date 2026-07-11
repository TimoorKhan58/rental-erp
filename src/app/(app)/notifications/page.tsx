import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { NotificationListPage } from "@/features/notification";

export default function NotificationsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <NotificationListPage />
    </Suspense>
  );
}
