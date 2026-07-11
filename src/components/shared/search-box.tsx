"use client";

import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchBoxProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
};

export function SearchBox({
  value,
  onChange,
  placeholder = "Search...",
  className,
  disabled = false,
  id = "search",
}: SearchBoxProps) {
  return (
    <div className={cn("relative w-full max-w-sm", className)}>
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="pl-8"
        aria-label={placeholder}
      />
    </div>
  );
}
