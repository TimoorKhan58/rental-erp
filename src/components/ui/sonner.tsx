"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          "--success-bg": "var(--success-muted)",
          "--success-text": "var(--success)",
          "--success-border": "color-mix(in oklch, var(--success) 25%, transparent)",
          "--error-bg": "var(--error-muted)",
          "--error-text": "var(--error)",
          "--error-border": "color-mix(in oklch, var(--error) 25%, transparent)",
          "--warning-bg": "var(--warning-muted)",
          "--warning-text": "var(--warning-foreground)",
          "--warning-border": "color-mix(in oklch, var(--warning) 25%, transparent)",
          "--info-bg": "var(--info-muted)",
          "--info-text": "var(--info)",
          "--info-border": "color-mix(in oklch, var(--info) 25%, transparent)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
