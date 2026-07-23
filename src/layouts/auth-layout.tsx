import type { ReactNode } from "react";
import { ClipboardListIcon, PackageIcon, TrendingUpIcon } from "lucide-react";
import { BrandLogoWithName } from "@/components/shared/brand-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";

type AuthLayoutProps = {
  children: ReactNode;
  organizationName: string;
};

const FEATURES = [
  {
    icon: ClipboardListIcon,
    value: "360°",
    label: "Operations view",
  },
  {
    icon: PackageIcon,
    value: "Real-time",
    label: "Inventory tracking",
  },
  {
    icon: TrendingUpIcon,
    value: "PKR",
    label: "Financial reports",
  },
] as const;

export function AuthLayout({ children, organizationName }: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen bg-background">
      <aside
        aria-hidden="true"
        className="bg-brand-panel bg-brand-pattern relative hidden w-[46%] max-w-xl flex-col justify-between overflow-hidden border-r border-white/10 p-10 lg:flex xl:max-w-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20" />

        <div className="relative z-10">
          <BrandLogoWithName />
        </div>

        <div className="relative z-10 space-y-8">
          <blockquote className="space-y-5">
            <p className="font-heading text-[2rem] leading-[1.2] font-semibold tracking-tight text-white xl:text-[2.25rem]">
              Manage rentals, inventory &amp; finances in one place.
            </p>
            <p className="max-w-md text-sm leading-relaxed text-white/65">
              Streamline orders, dispatch, payments, and reporting for{" "}
              <span className="font-medium text-white/90">{organizationName}</span>.
            </p>
          </blockquote>

          <div className="grid grid-cols-3 gap-4">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.label}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                >
                  <Icon className="mb-2 size-4 text-brand" aria-hidden="true" />
                  <p className="font-heading text-base font-semibold text-white">
                    {feature.value}
                  </p>
                  <p className="mt-0.5 text-xs text-white/55">{feature.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/40">
          &copy; {new Date().getFullYear()} {organizationName}
        </p>
      </aside>

      <div className="relative flex flex-1 flex-col items-center justify-center bg-card p-6 sm:p-10">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-[420px]">{children}</div>
      </div>
    </main>
  );
}
