import type { ReactNode } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { statusIcons } from "@/components/design-system/icons";

/**
 * AppAlert — semantic alert with optional status icon.
 *
 * @example
 * <AppAlert variant="success" title="Saved" description="Changes were applied." />
 */
type AppAlertVariant = "default" | "info" | "success" | "warning" | "error";

const variantMap: Record<AppAlertVariant, "default" | "info" | "success" | "warning" | "destructive"> = {
  default: "default",
  info: "info",
  success: "success",
  warning: "warning",
  error: "destructive",
};

const iconMap = {
  default: statusIcons.info,
  info: statusIcons.info,
  success: statusIcons.success,
  warning: statusIcons.warning,
  error: statusIcons.error,
} as const;

type AppAlertProps = {
  variant?: AppAlertVariant;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  showIcon?: boolean;
  className?: string;
};

export function AppAlert({
  variant = "default",
  title,
  description,
  icon,
  showIcon = true,
  className,
}: AppAlertProps) {
  const Icon = iconMap[variant];

  return (
    <Alert variant={variantMap[variant]} className={className}>
      {showIcon ? (icon ?? <Icon aria-hidden="true" />) : null}
      <AlertTitle>{title}</AlertTitle>
      {description ? <AlertDescription>{description}</AlertDescription> : null}
    </Alert>
  );
}

export { Alert, AlertDescription, AlertTitle };
