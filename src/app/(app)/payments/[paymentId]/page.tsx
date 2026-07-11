import { PaymentDetailPage } from "@/features/payment";

type PaymentDetailRouteProps = {
  params: Promise<{ paymentId: string }>;
};

export default async function PaymentDetailRoute({ params }: PaymentDetailRouteProps) {
  const { paymentId } = await params;
  return <PaymentDetailPage paymentId={paymentId} />;
}
