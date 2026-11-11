import { formatDate } from "@/lib/utils";

export type RentalOrderSelectorSource = {
  id: string;
  orderNumber: string;
  customerId: string;
  startDate: string;
  endDate: string;
};

export type RentalOrderSelectorOption = {
  id: string;
  label: string;
  description: string;
  keywords: string;
};

export function toRentalOrderSelectorOption(
  order: RentalOrderSelectorSource,
  customerNameById: Map<string, string>,
  customerPhoneById?: Map<string, string>,
): RentalOrderSelectorOption {
  const customerName = customerNameById.get(order.customerId);
  const phone = customerPhoneById?.get(order.customerId);
  const period = `${formatDate(order.startDate)} – ${formatDate(order.endDate)}`;

  return {
    id: order.id,
    label: customerName ?? order.orderNumber,
    description: customerName ? `${order.orderNumber} · ${period}` : period,
    keywords: [order.orderNumber, customerName, phone].filter(Boolean).join(" "),
  };
}
