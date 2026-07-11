import { RentalOrderDetailPage } from "@/features/rental-order";

type RentalOrderDetailRoutePageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function RentalOrderDetailRoutePage({
  params,
}: RentalOrderDetailRoutePageProps) {
  const { orderId } = await params;

  return <RentalOrderDetailPage orderId={orderId} />;
}
