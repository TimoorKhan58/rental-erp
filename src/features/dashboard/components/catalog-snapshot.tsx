"use client";

import Link from "next/link";
import { memo } from "react";
import { Building2Icon, PackageIcon, TruckIcon, UsersIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";

type CatalogSnapshotProps = {
  customers: number;
  products: number;
  suppliers: number;
  warehouses: number;
  isLoading?: boolean;
};

const items = [
  {
    key: "customers" as const,
    label: "Customers",
    href: ROUTES.customers,
    icon: UsersIcon,
  },
  {
    key: "products" as const,
    label: "Products",
    href: ROUTES.products,
    icon: PackageIcon,
  },
  {
    key: "suppliers" as const,
    label: "Suppliers",
    href: ROUTES.suppliers,
    icon: TruckIcon,
  },
  {
    key: "warehouses" as const,
    label: "Warehouses",
    href: ROUTES.warehouses,
    icon: Building2Icon,
  },
];

export const CatalogSnapshot = memo(function CatalogSnapshot({
  customers,
  products,
  suppliers,
  warehouses,
  isLoading,
}: CatalogSnapshotProps) {
  const values = { customers, products, suppliers, warehouses };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <section aria-label="Master data snapshot">
      <div className="mb-3">
        <h2 className="font-heading text-sm font-semibold tracking-wide text-foreground uppercase">
          Master data
        </h2>
        <p className="text-xs text-muted-foreground">Reference counts — not day-to-day pain</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.key} href={item.href}>
              <Card className="border-border/60 shadow-soft transition-all hover:shadow-soft-md">
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-4" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-heading text-lg font-semibold tabular-nums">
                      {values[item.key].toLocaleString("en-PK")}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
});
