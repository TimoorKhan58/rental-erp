import { MaintenanceDetailPage } from "@/features/maintenance";

type MaintenanceDetailRouteProps = {
  params: Promise<{ maintenanceId: string }>;
};

export default async function MaintenanceDetailRoute({
  params,
}: MaintenanceDetailRouteProps) {
  const { maintenanceId } = await params;
  return <MaintenanceDetailPage maintenanceId={maintenanceId} />;
}
