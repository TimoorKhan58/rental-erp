"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { SearchIcon } from "lucide-react";
import { ROUTES } from "@/config/routes";
import { Input } from "@/components/ui/input";

type GlobalSearchInputProps = {
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
};

type SearchTarget = {
  label: string;
  href: string;
};

function buildSearchTargets(query: string): SearchTarget[] {
  const trimmed = query.trim();

  if (trimmed.length === 0) {
    return [];
  }

  const encoded = encodeURIComponent(trimmed);

  return [
    { label: "Customers", href: `${ROUTES.customers}?search=${encoded}` },
    { label: "Rental orders", href: `${ROUTES.rentalOrders}?search=${encoded}` },
    { label: "Products", href: `${ROUTES.products}?search=${encoded}` },
  ];
}

export function GlobalSearchInput({
  className,
  inputClassName,
  autoFocus = false,
  onNavigate,
}: GlobalSearchInputProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const targets = buildSearchTargets(query);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const navigateTo = useCallback(
    (href: string) => {
      router.push(href);
      close();
      onNavigate?.();
    },
    [close, onNavigate, router],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current !== null &&
        !containerRef.current.contains(event.target as Node)
      ) {
        close();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [close, open]);

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
            setOpen(false);
          }}
          onFocus={() => {
            if (targets.length > 0) {
              setOpen(true);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && targets.length > 0) {
              event.preventDefault();
              setOpen(true);
            }

            if (event.key === "Escape") {
              close();
            }
          }}
          placeholder="Search customers, orders, products..."
          className={inputClassName}
          aria-label="Global search"
          aria-expanded={open}
          aria-controls="global-search-results"
          autoFocus={autoFocus}
        />
      </div>

      {open && targets.length > 0 ? (
        <div
          id="global-search-results"
          className="absolute z-[var(--z-popover)] mt-2 w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md"
          role="listbox"
          aria-label="Search destinations"
        >
          <p className="border-b px-3 py-2 text-xs text-muted-foreground">
            Search &ldquo;{query.trim()}&rdquo; in
          </p>
          <ul>
            {targets.map((target) => (
              <li key={target.label}>
                <Link
                  href={target.href}
                  className="block px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => {
                    navigateTo(target.href);
                  }}
                >
                  {target.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
