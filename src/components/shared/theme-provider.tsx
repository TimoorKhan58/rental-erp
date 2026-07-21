"use client";

import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from "next-themes";

/**
 * next-themes injects an inline <script> to avoid theme flash (FOUC).
 * React 19 / Next 16 warn when a <script> is rendered inside a client component.
 * Keep a real script on the server; on the client re-render, pass a non-JS type
 * so React does not warn (the FOUC script already ran during SSR/hydration).
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const scriptProps =
    typeof window === "undefined"
      ? undefined
      : ({ type: "application/json" } as const);

  return (
    <NextThemesProvider {...props} scriptProps={scriptProps}>
      {children}
    </NextThemesProvider>
  );
}
