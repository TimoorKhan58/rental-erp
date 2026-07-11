import { RentalOrderEditPage } from "@/features/rental-order";

type RentalOrderEditRoutePageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function RentalOrderEditRoutePage({
  params,
}: RentalOrderEditRoutePageProps) {
  const { orderId } = await params;

  return <RentalOrderEditPage orderId={orderId} />;
}
