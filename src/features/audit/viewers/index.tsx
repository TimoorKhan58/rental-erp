"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const LazyJsonViewer = dynamic(
  () => import("./json-viewer").then((mod) => mod.JsonViewer),
  {
    ssr: false,
    loading: () => <Skeleton className="h-40 w-full" aria-busy="true" />,
  },
);

export { JsonViewer } from "./json-viewer";
