/**
 * Design token reference for TypeScript consumers.
 * CSS is the source of truth — keep in sync with src/styles/.
 */
export const designTokens = {
  spacing: {
    pageX: "var(--spacing-page-x)",
    pageY: "var(--spacing-page-y)",
    section: "var(--spacing-section)",
    stack: { xs: "0.25rem", sm: "0.5rem", md: "1rem", lg: "1.5rem", xl: "2rem" },
  },
  containers: {
    app: "80rem",
    content: "72rem",
    narrow: "48rem",
    wide: "96rem",
  },
  typography: {
    display: "1.75rem",
    h1: "1.5rem",
    h2: "1.25rem",
    h3: "1.125rem",
    h4: "1rem",
    body: "0.875rem",
    small: "0.8125rem",
    caption: "0.75rem",
  },
  zIndex: {
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    toast: 1600,
    tooltip: 1700,
  },
  duration: {
    instant: 75,
    fast: 150,
    normal: 200,
    slow: 300,
  },
  breakpoints: {
    xs: "30rem",
    sm: "40rem",
    md: "48rem",
    lg: "64rem",
    xl: "80rem",
    "2xl": "96rem",
  },
} as const;

export type DesignTokens = typeof designTokens;
