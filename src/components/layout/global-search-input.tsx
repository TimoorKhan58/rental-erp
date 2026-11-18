"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import { ROUTES } from "@/config/routes";
import { Input } from "@/components/ui/input";
import { canAccessNavHref } from "@/constants/navigation-access";
import { apiGet } from "@/lib/api/request";
import { formatCurrency } from "@/lib/utils";
import { useVisibleNavigation } from "./use-visible-navigation";

type GlobalSearchInputProps = {
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
};

export type SearchHit = { key: string; title: string; detail?: string; href: string };
export type SearchSection = { label: string; hits: SearchHit[]; seeAllHref?: string };

type Paged<T> = { items: T[] };
const PER_SECTION = 4;

type Source = {
  label: string;
  listHref: string;
  api: string;
  toHit: (row: Record<string, unknown>) => SearchHit;
};

const SOURCES: Source[] = [
  {
    label: "Customers",
    listHref: ROUTES.customers,
    api: "/customers",
    toHit: (row) => ({
      key: `c-${row.id}`,
      title: String(row.name),
      detail: [row.customerCode, row.phone].filter(Boolean).join(" · "),
      href: ROUTES.customerDetail(String(row.id)),
    }),
  },
  {
    label: "Rental orders",
    listHref: ROUTES.rentalOrders,
    api: "/rental-orders",
    toHit: (row) => ({
      key: `o-${row.id}`,
      title: String(row.orderNumber),
      detail: String(row.status ?? "").replaceAll("_", " ").toLowerCase(),
      href: ROUTES.rentalOrderDetail(String(row.id)),
    }),
  },
  {
    label: "Invoices",
    listHref: ROUTES.rentalInvoices,
    api: "/rental-invoices",
    toHit: (row) => ({
      key: `i-${row.id}`,
      title: String(row.invoiceNumber),
      detail: Number(row.balance) > 0 ? `${formatCurrency(Number(row.balance))} to collect` : "Paid",
      href: ROUTES.rentalInvoiceDetail(String(row.id)),
    }),
  },
  {
    label: "Products",
    listHref: ROUTES.products,
    api: "/products",
    toHit: (row) => ({
      key: `p-${row.id}`,
      title: String(row.name),
      detail: String(row.productCode ?? ""),
      href: ROUTES.productDetail(String(row.id)),
    }),
  },
];

/** Menu pages whose name matches, e.g. "pay" → Payments (usability revamp R5). */
export function matchPages(
  query: string,
  groups: ReadonlyArray<{ items: ReadonlyArray<{ label: string; href: string }> }>,
): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return groups
    .flatMap((group) => group.items)
    .filter((item) => item.label.toLowerCase().includes(q))
    .slice(0, 3)
    .map((item) => ({ key: `page-${item.href}`, title: item.label, detail: "Open page", href: item.href }));
}

function useDebounced(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

/**
 * Header search that shows real matches as you type: customers (name,
 * code, phone), orders and invoices (number), products, and menu pages
 * (usability revamp R5). Only lists the person may open are searched.
 */
export function GlobalSearchInput({
  className,
  inputClassName,
  autoFocus = false,
  onNavigate,
}: GlobalSearchInputProps) {
  const router = useRouter();
  const resultsId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const { groups, permissions, ready } = useVisibleNavigation();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const term = useDebounced(query.trim(), 250);

  const sources = useMemo(
    () => SOURCES.filter((source) => !ready || canAccessNavHref(source.listHref, permissions)),
    [permissions, ready],
  );

  const results = useQuery({
    queryKey: ["app", "global-search", term, sources.map((source) => source.api)],
    enabled: term.length >= 2,
    staleTime: 30_000,
    queryFn: async (): Promise<SearchSection[]> => {
      const settled = await Promise.allSettled(
        sources.map((source) =>
          apiGet<Paged<Record<string, unknown>>>(source.api, {
            params: { search: term, page: 1, pageSize: PER_SECTION },
          }),
        ),
      );
      return sources.map((source, index) => {
        const outcome = settled[index]!;
        const rows = outcome.status === "fulfilled" ? (outcome.value.items ?? []) : [];
        return {
          label: source.label,
          hits: rows.slice(0, PER_SECTION).map(source.toHit),
          seeAllHref: `${source.listHref}?search=${encodeURIComponent(term)}`,
        };
      });
    },
  });

  const sections = useMemo<SearchSection[]>(() => {
    const pages = matchPages(term, groups);
    const found = (results.data ?? []).filter((section) => section.hits.length > 0);
    return pages.length > 0 ? [{ label: "Pages", hits: pages }, ...found] : found;
  }, [groups, results.data, term]);
  const firstHit = sections[0]?.hits[0];
  const searching = term.length >= 2 && (results.isFetching || term !== query.trim());

  const close = useCallback(() => setOpen(false), []);

  const navigateTo = useCallback(
    (href: string) => {
      router.push(href);
      setQuery("");
      close();
      onNavigate?.();
    },
    [close, onNavigate, router],
  );

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current !== null && !containerRef.current.contains(event.target as Node)) {
        close();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [close, open]);

  const showPanel = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className={className}>
      <div className="relative">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/50"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && firstHit) {
              event.preventDefault();
              navigateTo(firstHit.href);
            }
            if (event.key === "Escape") close();
          }}
          placeholder="Search name, phone, order or invoice no..."
          className={inputClassName}
          aria-label="Search customers, orders, invoices, products and pages"
          aria-expanded={showPanel}
          aria-controls={resultsId}
          autoFocus={autoFocus}
        />
      </div>

      {showPanel ? (
        <div
          id={resultsId}
          role="region"
          aria-label="Search results"
          className="absolute z-[var(--z-popover)] mt-2 max-h-[70vh] w-full min-w-72 overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md"
        >
          {sections.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              {searching ? "Searching…" : `Nothing found for “${query.trim()}”.`}
            </p>
          ) : (
            sections.map((section) => (
              <div key={section.label} className="border-b border-border last:border-b-0">
                <div className="flex items-center justify-between px-3 pt-2 pb-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.label}
                  </p>
                  {section.seeAllHref ? (
                    <Link
                      href={section.seeAllHref}
                      className="text-xs text-primary hover:underline"
                      onClick={(event) => {
                        event.preventDefault();
                        navigateTo(section.seeAllHref!);
                      }}
                    >
                      See all
                    </Link>
                  ) : null}
                </div>
                <ul className="pb-1">
                  {section.hits.map((hit) => (
                    <li key={hit.key}>
                      <Link
                        href={hit.href}
                        className="flex items-baseline justify-between gap-3 px-3 py-1.5 text-sm hover:bg-muted"
                        onClick={(event) => {
                          event.preventDefault();
                          navigateTo(hit.href);
                        }}
                      >
                        <span className="truncate font-medium">{hit.title}</span>
                        {hit.detail ? (
                          <span className="shrink-0 truncate text-xs text-muted-foreground">{hit.detail}</span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
