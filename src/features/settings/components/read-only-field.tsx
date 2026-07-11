"use client";

type ReadOnlyFieldProps = {
  label: string;
  value: string | number | boolean | null | undefined;
};

export function ReadOnlyField({ label, value }: ReadOnlyFieldProps) {
  let display: string;
  if (value === null || value === undefined || value === "") {
    display = "—";
  } else if (typeof value === "boolean") {
    display = value ? "Yes" : "No";
  } else {
    display = String(value);
  }

  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="break-all text-sm">{display}</dd>
    </div>
  );
}
