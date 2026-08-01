import { UserEditPage } from "@/features/users";

type UserEditRoutePageProps = {
  params: Promise<{ userId: string }>;
};

export default async function UserEditRoutePage({
  params,
}: UserEditRoutePageProps) {
  const { userId } = await params;

  return <UserEditPage userId={userId} />;
}
