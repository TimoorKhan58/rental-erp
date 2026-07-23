"use client";

import { PrinterIcon } from "lucide-react";
import { AppModal } from "@/components/design-system/modal";
import { AppButton } from "@/components/design-system/button";
import { RentalInvoicePrintBill } from "../components/rental-invoice-print-bill";
import type { RentalInvoiceResponse } from "../types";

type CustomerBillInfo = {
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  customerCode?: string | null;
};

type RentalInvoicePrintPreviewDialogProps = {
  invoice: RentalInvoiceResponse | null;
  customer?: CustomerBillInfo | null;
  orderNumber?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RentalInvoicePrintPreviewDialog({
  invoice,
  customer,
  orderNumber,
  open,
  onOpenChange,
}: RentalInvoicePrintPreviewDialogProps) {
  if (!invoice) {
    return null;
  }

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Print preview"
      description="Review the customer bill before printing."
      size="full"
      className="flex max-h-[calc(100vh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl print:max-h-none print:max-w-none print:overflow-visible print:rounded-none print:p-0 print:ring-0"
      footer={
        <div className="flex w-full items-center justify-end gap-2 print:hidden">
          <AppButton variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </AppButton>
          <AppButton
            leftIcon={<PrinterIcon className="size-4" aria-hidden="true" />}
            onClick={() => window.print()}
          >
            Print
          </AppButton>
        </div>
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30 px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-4xl rounded-xl border border-border/60 bg-background p-6 shadow-soft print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <RentalInvoicePrintBill
            invoice={invoice}
            customer={customer}
            orderNumber={orderNumber}
          />
        </div>
      </div>
    </AppModal>
  );
}
