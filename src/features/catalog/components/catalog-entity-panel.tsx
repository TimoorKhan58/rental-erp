"use client";

import { useEffect, useMemo, useState } from "react";
import { MoreHorizontalIcon, PlusIcon, RefreshCwIcon } from "lucide-react";
import { DataTableShell, DataPagination } from "@/components/shared";
import type { DataTableColumn } from "@/components/shared";
import { SearchInput } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { SemanticBadge } from "@/components/design-system/badge";
import { EmptyState, LoadingState } from "@/components/feedback";
import { DeleteModal } from "@/components/design-system/modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import {
  useCatalogItems,
  useCatalogPermissions,
  useDeleteCatalogItem,
  useToggleCatalogActive,
} from "../hooks";
import { CATALOG_TAB_SINGULAR } from "../mappers";
import { CatalogItemDialog } from "./catalog-item-dialog";
import type {
  AttributeResponse,
  CatalogEntityResponse,
  CatalogTab,
  TagResponse,
  UnitResponse,
} from "../types";

type CatalogEntityPanelProps = {
  tab: CatalogTab;
};

function getDisplayName(item: CatalogEntityResponse): string {
  return item.name;
}

function getSecondaryLabel(tab: CatalogTab, item: CatalogEntityResponse): string | null {
  if (tab === "units") {
    return (item as UnitResponse).code;
  }
  if (tab === "attributes") {
    return (item as AttributeResponse).dataType;
  }
  if (tab === "tags") {
    return (item as TagResponse).color;
  }
  return null;
}

export function CatalogEntityPanel({ tab }: CatalogEntityPanelProps) {
  const { canCreate, canUpdate, canDelete } = useCatalogPermissions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [localSearch, setLocalSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogEntityResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogEntityResponse | null>(null);

  const params = useMemo(
    () => ({
      page,
      pageSize: 20,
      search: search || undefined,
      isActive:
        activeFilter === "all" ? undefined : activeFilter === "true" ? true : false,
      sortBy: tab === "units" ? "code" : "name",
      sortOrder: "asc" as const,
    }),
    [page, search, activeFilter, tab],
  );

  const { data, isLoading, isError, error, refetch, isFetching } = useCatalogItems(
    tab,
    params,
  );
  const deleteMutation = useDeleteCatalogItem(tab);
  const toggleMutation = useToggleCatalogActive(tab);
  const singular = CATALOG_TAB_SINGULAR[tab];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localSearch !== search) {
        setSearch(localSearch);
        setPage(1);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [localSearch, search]);

  useEffect(() => {
    setPage(1);
    setLocalSearch("");
    setSearch("");
    setActiveFilter("all");
  }, [tab]);

  const columns: Array<DataTableColumn<CatalogEntityResponse>> = [
    {
      id: "name",
      header: tab === "units" ? "Unit" : "Name",
      cell: (row) => {
        const secondary = getSecondaryLabel(tab, row);
        return (
          <div className="min-w-[10rem]">
            <p className="font-medium">{getDisplayName(row)}</p>
            {secondary ? (
              <p className="text-xs text-muted-foreground">{secondary}</p>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <SemanticBadge semantic={row.isActive ? "active" : "inactive"}>
          {row.isActive ? "Active" : "Inactive"}
        </SemanticBadge>
      ),
    },
    {
      id: "updatedAt",
      header: "Updated",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{formatDate(row.updatedAt)}</span>
      ),
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12 text-right",
      headerClassName: "w-12",
      cell: (row) => {
        if (!canUpdate && !canDelete) {
          return null;
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <AppButton
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Actions for ${getDisplayName(row)}`}
                />
              }
            >
              <MoreHorizontalIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canUpdate ? (
                <DropdownMenuItem
                  onClick={() => {
                    setEditingItem(row);
                    setDialogOpen(true);
                  }}
                >
                  Edit
                </DropdownMenuItem>
              ) : null}
              {canUpdate ? (
                <DropdownMenuItem
                  onClick={() =>
                    void toggleMutation.mutateAsync({
                      id: row.id,
                      isActive: !row.isActive,
                    })
                  }
                >
                  {row.isActive ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
              ) : null}
              {canDelete ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteTarget(row)}
                  >
                    Delete
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <p className="text-sm font-medium">Failed to load {tab}</p>
        <p className="text-sm text-muted-foreground">{error?.message ?? "An error occurred."}</p>
        <AppButton variant="outline" onClick={() => void refetch()}>
          Try again
        </AppButton>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Manage product {tab}. Deactivate instead of delete when items are in use.
        </p>
        {canCreate ? (
          <AppButton
            leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
            onClick={() => {
              setEditingItem(null);
              setDialogOpen(true);
            }}
          >
            New {singular}
          </AppButton>
        ) : null}
      </div>

      <DataTableShell
        columns={columns}
        data={(data?.items ?? []) as CatalogEntityResponse[]}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        search={
          <SearchInput
            value={localSearch}
            onChange={setLocalSearch}
            placeholder={`Search ${tab}...`}
            className="w-full sm:max-w-xs"
            aria-label={`Search ${tab}`}
          />
        }
        filters={
          <Select
            value={activeFilter}
            onValueChange={(value) => {
              if (value === "all" || value === "true" || value === "false") {
                setActiveFilter(value);
                setPage(1);
              }
            }}
          >
            <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        }
        actions={
          <AppButton
            variant="outline"
            size="sm"
            leftIcon={<RefreshCwIcon className="size-4" aria-hidden="true" />}
            onClick={() => void refetch()}
            loading={isFetching && !isLoading}
          >
            Refresh
          </AppButton>
        }
        emptyState={
          <EmptyState
            title={`No ${tab} found`}
            description={
              search || activeFilter !== "all"
                ? "Try adjusting your search or filters."
                : `Create your first ${singular} to get started.`
            }
          />
        }
        loadingState={<LoadingState label={`Loading ${tab}...`} />}
        pagination={
          data?.meta ? (
            <DataPagination meta={data.meta} onPageChange={setPage} />
          ) : null
        }
      />

      <CatalogItemDialog
        tab={tab}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingItem(null);
        }}
        item={editingItem}
      />

      <DeleteModal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        entityName={deleteTarget ? `"${getDisplayName(deleteTarget)}"` : singular}
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          void deleteMutation.mutateAsync(deleteTarget.id).then(() => {
            setDeleteTarget(null);
          });
        }}
      />
    </>
  );
}
