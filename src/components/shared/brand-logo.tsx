import type { ReactNode } from "react";
import { TentIcon } from "lucide-react";
import { APPLICATION } from "@/constants/application";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg" | "icon";
  showTagline?: boolean;
  variant?: "default" | "light";
  className?: string;
};

const sizeConfig = {
  icon: { box: "size-9", icon: "size-4", title: "text-sm", tagline: "text-[10px]" },
  sm: { box: "size-8", icon: "size-4", title: "text-sm", tagline: "text-[10px]" },
  md: { box: "size-10", icon: "size-5", title: "text-base", tagline: "text-xs" },
  lg: { box: "size-12", icon: "size-6", title: "text-lg", tagline: "text-xs" },
} as const;

export function BrandLogo({
  size = "md",
  showTagline = false,
  variant = "default",
  className,
}: BrandLogoProps) {
  const config = sizeConfig[size];
  const isLight = variant === "light";

  if (size === "icon") {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-primary shadow-soft",
          config.box,
          className,
        )}
        aria-label={APPLICATION.name}
      >
        <TentIcon className={cn(config.icon, "text-brand")} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-primary shadow-soft",
          config.box,
        )}
      >
        <TentIcon
          className={cn(config.icon, isLight ? "text-brand" : "text-brand")}
          aria-hidden="true"
        />
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            "truncate font-heading font-semibold leading-tight tracking-tight",
            config.title,
            isLight ? "text-white" : "text-foreground",
          )}
        >
          {APPLICATION.shortName}
        </p>
        {showTagline && (
          <p
            className={cn(
              "truncate leading-tight",
              config.tagline,
              isLight ? "text-white/60" : "text-muted-foreground",
            )}
          >
            {APPLICATION.tagline}
          </p>
        )}
      </div>
    </div>
  );
}

export function BrandLogoMark({ className }: { className?: string }) {
  return (
    <BrandLogo size="icon" className={className} />
  );
}

export function BrandLogoWithName({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandLogo size="md" variant="light" />
      {children}
    </div>
  );
}
