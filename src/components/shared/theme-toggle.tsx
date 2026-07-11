"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { THEME_OPTIONS } from "@/config/theme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const themeIcons = {
  light: SunIcon,
  dark: MoonIcon,
  system: MonitorIcon,
} as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const activeTheme = theme ?? "system";
  const ActiveIcon =
    activeTheme === "system"
      ? themeIcons.system
      : resolvedTheme === "dark"
        ? themeIcons.dark
        : themeIcons.light;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn(className)}
            aria-label="Select theme"
          />
        }
      >
        <ActiveIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {THEME_OPTIONS.map((option) => {
          const Icon = themeIcons[option.value];

          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setTheme(option.value)}
              data-active={activeTheme === option.value}
            >
              <Icon />
              {option.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
