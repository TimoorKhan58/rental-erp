import { CustomerDetailPage } from "@/features/customer";

type CustomerDetailRoutePageProps = {
  params: Promise<{ customerId: string }>;
};

export default async function CustomerDetailRoutePage({
  params,
}: CustomerDetailRoutePageProps) {
  const { customerId } = await params;

  return <CustomerDetailPage customerId={customerId} />;
}
