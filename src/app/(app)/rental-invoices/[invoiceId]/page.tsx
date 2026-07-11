import { RentalInvoiceDetailPage } from "@/features/rental-invoice";

type RentalInvoiceDetailRouteProps = {
  params: Promise<{ invoiceId: string }>;
};

export default async function RentalInvoiceDetailRoute({
  params,
}: RentalInvoiceDetailRouteProps) {
  const { invoiceId } = await params;
  return <RentalInvoiceDetailPage invoiceId={invoiceId} />;
}
