"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Lazy-only barrel — do not re-export the eager JsonViewer here
 * (that would defeat code splitting for audit detail).
 */
export const LazyJsonViewer = dynamic(
  () => import("./json-viewer").then((mod) => mod.JsonViewer),
  {
    ssr: false,
    loading: () => <Skeleton className="h-40 w-full" aria-busy="true" />,
  },
);
