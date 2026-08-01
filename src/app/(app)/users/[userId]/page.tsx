import { UserDetailPage } from "@/features/users";

type UserDetailRoutePageProps = {
  params: Promise<{ userId: string }>;
};

export default async function UserDetailRoutePage({
  params,
}: UserDetailRoutePageProps) {
  const { userId } = await params;

  return <UserDetailPage userId={userId} />;
}
