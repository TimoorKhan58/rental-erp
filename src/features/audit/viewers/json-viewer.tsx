"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { CheckIcon, ChevronDownIcon, ChevronRightIcon, CopyIcon } from "lucide-react";
import { AppButton } from "@/components/design-system/button";
import { cn } from "@/lib/utils";

type JsonViewerProps = {
  value: unknown;
  title?: string;
  defaultExpanded?: boolean;
  className?: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function JsonNode({
  label,
  value,
  depth,
  defaultExpanded,
}: {
  label?: string;
  value: unknown;
  depth: number;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded && depth < 2);
  const isExpandable = isObject(value) || Array.isArray(value);
  const entries = isObject(value)
    ? Object.entries(value)
    : Array.isArray(value)
      ? value.map((item, index) => [String(index), item] as const)
      : [];

  if (!isExpandable) {
    const display =
      value === null
        ? "null"
        : typeof value === "string"
          ? `"${value}"`
          : String(value);

    const colorClass =
      value === null
        ? "text-muted-foreground"
        : typeof value === "string"
          ? "text-success"
          : typeof value === "number"
            ? "text-info"
            : typeof value === "boolean"
              ? "text-warning"
              : "text-foreground";

    return (
      <div className="font-mono text-xs leading-6" style={{ paddingLeft: depth * 12 }}>
        {label ? <span className="text-primary">{label}: </span> : null}
        <span className={colorClass}>{display}</span>
      </div>
    );
  }

  return (
    <div style={{ paddingLeft: depth * 12 }}>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded px-1 font-mono text-xs leading-6 hover:bg-muted"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDownIcon className="size-3.5" aria-hidden="true" />
        ) : (
          <ChevronRightIcon className="size-3.5" aria-hidden="true" />
        )}
        {label ? <span className="text-primary">{label}: </span> : null}
        <span className="text-muted-foreground">
          {Array.isArray(value) ? `Array(${value.length})` : `Object(${entries.length})`}
        </span>
      </button>
      {expanded
        ? entries.map(([key, child]) => (
            <JsonNode
              key={`${depth}-${key}`}
              label={key}
              value={child}
              depth={depth + 1}
              defaultExpanded={defaultExpanded}
            />
          ))
        : null}
    </div>
  );
}

export const JsonViewer = memo(function JsonViewer({
  value,
  title = "JSON",
  defaultExpanded = true,
  className,
}: JsonViewerProps) {
  const [copied, setCopied] = useState(false);
  const serialized = useMemo(() => JSON.stringify(value, null, 2), [value]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(serialized);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [serialized]);

  if (value === null || value === undefined) {
    return (
      <div className={cn("rounded-lg border bg-muted/20 p-4", className)}>
        <p className="text-sm text-muted-foreground">No data</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border bg-muted/20", className)}>
      <div className="flex items-center justify-between border-b px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <AppButton
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={
            copied ? (
              <CheckIcon className="size-3.5" aria-hidden="true" />
            ) : (
              <CopyIcon className="size-3.5" aria-hidden="true" />
            )
          }
          onClick={() => void handleCopy()}
          aria-label={`Copy ${title} to clipboard`}
        >
          {copied ? "Copied" : "Copy"}
        </AppButton>
      </div>
      <div className="max-h-96 overflow-auto p-3" role="region" aria-label={title}>
        <JsonNode value={value} depth={0} defaultExpanded={defaultExpanded} />
      </div>
    </div>
  );
});
