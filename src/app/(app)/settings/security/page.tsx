import { SettingsSecurityPage } from "@/features/settings";
import { authConfig } from "@/shared/config/auth.config";

export default function SettingsSecurityRoute() {
  return (
    <SettingsSecurityPage minPasswordLength={authConfig.minPasswordLength} />
  );
}
