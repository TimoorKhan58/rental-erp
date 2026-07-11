"use client";

import { useState } from "react";
import { NotificationBellButton } from "../components/notification-bell-button";
import { NotificationCenterDrawer } from "../drawers/notification-center-drawer";

/**
 * Topbar entry point for the global notification center.
 * Keeps drawer state local so Topbar does not need redesign.
 */
export function NotificationTopbarControl() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <NotificationBellButton onClick={() => setOpen(true)} />
      <NotificationCenterDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
