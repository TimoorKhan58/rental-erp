"use client";

import { createAuthClient } from "better-auth/react";
import type { auth } from "./config";

function resolveClientBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
}

export const authClient = createAuthClient({
  baseURL: resolveClientBaseUrl(),
});

export const { signIn, signOut, useSession } = authClient;

export type AuthClientSession = typeof auth.$Infer.Session;
