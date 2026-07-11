"use client";

import { useTheme } from "next-themes";
import { THEME_OPTIONS } from "@/config/theme";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Client-only theme preference (next-themes / localStorage).
 * There is no backend user-preferences API for theme.
 */
export function ThemePreferenceControl() {
  const { theme, setTheme } = useTheme();
  const activeTheme = theme ?? "system";

  return (
    <div className="space-y-2">
      <Label htmlFor="theme-preference">Theme</Label>
      <Select
        value={activeTheme}
        onValueChange={(value) => {
          if (value) {
            setTheme(value);
          }
        }}
      >
        <SelectTrigger id="theme-preference" className="w-full sm:max-w-xs" aria-label="Theme">
          <SelectValue placeholder="Select theme" />
        </SelectTrigger>
        <SelectContent>
          {THEME_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Stored in this browser only. Theme is not synced to the server.
      </p>
    </div>
  );
}
