import { RepairEditPage } from "@/features/repair";

type RepairEditRouteProps = {
  params: Promise<{ repairId: string }>;
};

export default async function RepairEditRoute({ params }: RepairEditRouteProps) {
  const { repairId } = await params;
  return <RepairEditPage repairId={repairId} />;
}
