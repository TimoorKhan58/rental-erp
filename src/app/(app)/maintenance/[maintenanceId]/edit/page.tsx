import { MaintenanceEditPage } from "@/features/maintenance";

type MaintenanceEditRouteProps = {
  params: Promise<{ maintenanceId: string }>;
};

export default async function MaintenanceEditRoute({ params }: MaintenanceEditRouteProps) {
  const { maintenanceId } = await params;
  return <MaintenanceEditPage maintenanceId={maintenanceId} />;
}
