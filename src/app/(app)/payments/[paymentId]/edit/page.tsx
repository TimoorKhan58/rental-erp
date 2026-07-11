import { PaymentEditPage } from "@/features/payment";

type PaymentEditRouteProps = {
  params: Promise<{ paymentId: string }>;
};

export default async function PaymentEditRoute({ params }: PaymentEditRouteProps) {
  const { paymentId } = await params;
  return <PaymentEditPage paymentId={paymentId} />;
}
