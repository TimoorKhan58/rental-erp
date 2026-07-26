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
    value: "Built-in",
    label: "Financial reports",
  },
] as const;

export function AuthLayout({ children, organizationName }: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen bg-background">
      {/*
        data-auth-panel styles live outside Tailwind layers with !important so
        light-theme page tokens can never wash out this always-dark brand rail.
      */}
      <aside
        data-auth-panel
        aria-hidden="true"
        className="relative hidden min-h-screen w-[46%] max-w-xl flex-col justify-between overflow-hidden border-r border-white/10 !bg-[#152f3d] p-10 text-[#ffffff] lg:flex xl:max-w-2xl"
        style={{
          backgroundColor: "#152f3d",
          backgroundImage:
            "linear-gradient(165deg, #1b3a4b 0%, #152f3d 45%, #0f2430 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20" />

        <div className="relative z-10">
          <BrandLogoWithName />
        </div>

        <div className="relative z-10 space-y-8">
          <blockquote className="space-y-5">
            <p className="font-heading text-[2rem] leading-[1.2] font-semibold tracking-tight text-[#ffffff] xl:text-[2.25rem]">
              Manage rentals, inventory &amp; finances in one place.
            </p>
            <p className="max-w-md text-sm leading-relaxed text-[#ffffff]/65">
              Streamline orders, dispatch, payments, and reporting for{" "}
              <span className="font-medium text-[#ffffff]/90">{organizationName}</span>.
            </p>
          </blockquote>

          <div className="grid grid-cols-3 gap-4">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.label}
                  className="rounded-xl border border-[#ffffff]/10 bg-[#ffffff]/5 p-4 backdrop-blur-sm"
                >
                  <Icon className="mb-2 size-4 text-[#c8860a]" aria-hidden="true" />
                  <p className="font-heading text-base font-semibold text-[#ffffff]">
                    {feature.value}
                  </p>
                  <p className="mt-0.5 text-xs text-[#ffffff]/55">{feature.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        <p className="relative z-10 text-xs text-[#ffffff]/40">
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
