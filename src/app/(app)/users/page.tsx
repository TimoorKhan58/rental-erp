import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { UserListPage } from "@/features/users";

export default function UsersPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <UserListPage />
    </Suspense>
  );
}
