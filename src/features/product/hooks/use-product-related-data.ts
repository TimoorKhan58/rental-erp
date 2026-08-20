import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import { getAttributes, getTags } from "@/features/catalog/services";
import { getAuditLogs } from "@/features/audit/services";
import { getProductReport } from "@/features/financial-report/services";
import { getInventoryList } from "@/features/inventory/services";
import { getProcurements } from "@/features/procurement/services";
import { getWarehouses } from "@/features/warehouse/services";
import type { ProductResponse } from "../types";

export function useProductExtendedCatalogOptions() {
  const tags = useQuery({
    queryKey: queryKeys.catalog.tags.list({ pageSize: 100, isActive: true }),
    queryFn: () => getTags({ pageSize: 100, isActive: true }),
    staleTime: 5 * 60_000,
  });

  const attributes = useQuery({
    queryKey: queryKeys.catalog.attributes.list({ pageSize: 100, isActive: true }),
    queryFn: () => getAttributes({ pageSize: 100, isActive: true }),
    staleTime: 5 * 60_000,
  });

  const tagOptions = (tags.data?.items ?? []).map((tag) => ({
    value: tag.id,
    label: tag.name,
  }));

  const attributeOptions = (attributes.data?.items ?? []).map((attribute) => ({
    id: attribute.id,
    name: attribute.name,
  }));

  const tagNameById = useMemo(
    () => new Map((tags.data?.items ?? []).map((tag) => [tag.id, tag.name])),
    [tags.data?.items],
  );

  const attributeNameById = useMemo(
    () =>
      new Map((attributes.data?.items ?? []).map((attribute) => [attribute.id, attribute.name])),
    [attributes.data?.items],
  );

  return {
    tagOptions,
    attributeOptions,
    tagNameById,
    attributeNameById,
    isLoading: tags.isLoading || attributes.isLoading,
  };
}

export function useProductRelatedData(product: ProductResponse | undefined) {
  const permissions = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissionSet = permissions.data?.permissions ?? [];
  const canReadInventory = permissionSet.includes(PERMISSIONS.inventory.read);
  const canReadProcurement = permissionSet.includes(PERMISSIONS.purchaseOrders.read);
  const canReadReports = permissionSet.includes(PERMISSIONS.reports.read);
  const canReadAudit = permissionSet.includes(PERMISSIONS.audit.read);

  const inventory = useQuery({
    queryKey: queryKeys.inventory.list({ productId: product?.id, pageSize: 100 }),
    queryFn: () => getInventoryList({ productId: product!.id, pageSize: 100 }),
    enabled: Boolean(product?.id) && canReadInventory,
    staleTime: 60_000,
  });

  const warehouses = useQuery({
    queryKey: queryKeys.warehouses.list({ pageSize: 100, isActive: true }),
    queryFn: () => getWarehouses({ pageSize: 100, isActive: true }),
    enabled: Boolean(product?.id) && canReadInventory,
    staleTime: 5 * 60_000,
  });

  const procurements = useQuery({
    queryKey: queryKeys.procurement.list({ pageSize: 100, sortOrder: "desc" }),
    queryFn: () => getProcurements({ pageSize: 100, sortOrder: "desc" }),
    enabled: Boolean(product?.id) && canReadProcurement,
    staleTime: 60_000,
  });

  const productReport = useQuery({
    queryKey: queryKeys.reports.products({ search: product?.productCode, pageSize: 100 }),
    queryFn: () => getProductReport({ search: product!.productCode, pageSize: 100 }),
    enabled: Boolean(product?.productCode) && canReadReports,
    staleTime: 60_000,
  });

  const auditLogs = useQuery({
    queryKey: queryKeys.audit.list({
      entityType: "Product",
      entityId: product?.id,
      pageSize: 5,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    queryFn: () =>
      getAuditLogs({
        entityType: "Product",
        entityId: product!.id,
        pageSize: 5,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
    enabled: Boolean(product?.id) && canReadAudit,
    staleTime: 60_000,
  });

  const warehouseNameById = useMemo(
    () =>
      new Map((warehouses.data?.items ?? []).map((warehouse) => [warehouse.id, warehouse.name])),
    [warehouses.data?.items],
  );

  const inventoryRows = inventory.data?.items ?? [];

  const inventorySummary = useMemo(() => {
    return inventoryRows.reduce(
      (summary, row) => ({
        quantityOnHand: summary.quantityOnHand + row.quantityOnHand,
        reservedQuantity: summary.reservedQuantity + row.reservedQuantity,
        availableQuantity: summary.availableQuantity + row.availableQuantity,
      }),
      { quantityOnHand: 0, reservedQuantity: 0, availableQuantity: 0 },
    );
  }, [inventoryRows]);

  const procurementRows = useMemo(() => {
    if (!product?.id) {
      return [];
    }

    return (procurements.data?.items ?? [])
      .flatMap((order) =>
        order.items
          .filter((item) => item.productId === product.id)
          .map((item) => ({
            orderId: order.id,
            poNumber: order.poNumber,
            status: order.status,
            orderDate: order.orderDate,
            quantity: item.quantity,
            unitCost: item.unitCost,
            receivedQuantity: item.receivedQuantity,
          })),
      )
      .slice(0, 5);
  }, [procurements.data?.items, product?.id]);

  const rentalStats = useMemo(() => {
    if (!product?.id) {
      return null;
    }

    return (
      productReport.data?.lines.find((line) => line.productId === product.id) ??
      productReport.data?.lines[0] ??
      null
    );
  }, [product?.id, productReport.data?.lines]);

  return {
    permissions: {
      canReadInventory,
      canReadProcurement,
      canReadReports,
      canReadAudit,
    },
    inventoryRows,
    inventorySummary,
    warehouseNameById,
    procurementRows,
    rentalStats,
    auditLogs: auditLogs.data?.items ?? [],
    isLoading:
      inventory.isLoading ||
      warehouses.isLoading ||
      procurements.isLoading ||
      productReport.isLoading ||
      auditLogs.isLoading,
  };
}
