"use client";

import Link from "next/link";
import { useState } from "react";
import { TruckIcon } from "lucide-react";
import { SectionCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import {
  useCanSourceExternallyPermission,
  useRentalOrderShortfall,
} from "../hooks";
import { SourceExternallyDialog } from "../dialogs/source-externally-dialog";
import type { RentalOrderItemShortfallResponse } from "../types";

type RentalOrderShortfallSectionProps = {
  orderId: string;
  orderNumber: string;
  productLabelById: Map<string, string>;
};

export function RentalOrderShortfallSection({
  orderId,
  orderNumber,
  productLabelById,
}: RentalOrderShortfallSectionProps) {
  const { data, isLoading, isError, refetch } = useRentalOrderShortfall(orderId);
  const { canCreateExternalRental } = useCanSourceExternallyPermission();
  const [selectedItem, setSelectedItem] =
    useState<RentalOrderItemShortfallResponse | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <SectionCard title="Owned inventory shortfall">
        <LoadingState label="Calculating shortfall…" />
      </SectionCard>
    );
  }

  if (isError || !data) {
    return (
      <SectionCard title="Owned inventory shortfall">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Could not load shortfall information.
          </p>
          <AppButton variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </AppButton>
        </div>
      </SectionCard>
    );
  }

  const shortageItems = data.items.filter((item) => item.shortfallQuantity > 0);

  return (
    <>
      <SectionCard
        title="Owned inventory shortfall"
        actions={
          data.hasActiveExternalRentalAgreement &&
          data.activeExternalRentalAgreementId ? (
            <AppButton
              variant="outline"
              size="sm"
              render={
                <Link
                  href={ROUTES.externalRentalDetail(
                    data.activeExternalRentalAgreementId,
                  )}
                />
              }
            >
              View active ERA
            </AppButton>
          ) : null
        }
      >
        {shortageItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No owned-inventory shortfall for this order. External sourcing is not
            needed.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium" scope="col">
                    Product
                  </th>
                  <th className="px-3 py-2 font-medium" scope="col">
                    Required
                  </th>
                  <th className="px-3 py-2 font-medium" scope="col">
                    Owned available
                  </th>
                  <th className="px-3 py-2 font-medium" scope="col">
                    Shortfall
                  </th>
                  <th className="px-3 py-2 font-medium" scope="col">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {shortageItems.map((item) => {
                  const productLabel =
                    productLabelById.get(item.productId) ?? item.productId;
                  const showAction =
                    canCreateExternalRental && item.canSourceExternally;

                  return (
                    <tr
                      key={item.rentalOrderItemId}
                      className="border-b last:border-b-0"
                    >
                      <td className="px-3 py-2">{productLabel}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {item.requiredQuantity}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {item.ownedFulfillableQuantity}
                      </td>
                      <td className="px-3 py-2 tabular-nums font-medium">
                        {item.shortfallQuantity}
                      </td>
                      <td className="px-3 py-2">
                        {showAction ? (
                          <AppButton
                            size="sm"
                            variant="outline"
                            leftIcon={
                              <TruckIcon className="size-3.5" aria-hidden="true" />
                            }
                            onClick={() => {
                              setSelectedItem(item);
                              setDialogOpen(true);
                            }}
                          >
                            Source Externally
                          </AppButton>
                        ) : data.hasActiveExternalRentalAgreement ? (
                          <span className="text-xs text-muted-foreground">
                            Active ERA exists
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SourceExternallyDialog
        orderId={orderId}
        orderNumber={orderNumber}
        item={selectedItem}
        productLabel={
          selectedItem
            ? (productLabelById.get(selectedItem.productId) ??
              selectedItem.productId)
            : ""
        }
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
