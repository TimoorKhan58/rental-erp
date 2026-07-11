import { CustomerEditPage } from "@/features/customer";

type CustomerEditRoutePageProps = {
  params: Promise<{ customerId: string }>;
};

export default async function CustomerEditRoutePage({
  params,
}: CustomerEditRoutePageProps) {
  const { customerId } = await params;

  return <CustomerEditPage customerId={customerId} />;
}
