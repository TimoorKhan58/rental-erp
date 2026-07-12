import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

import { buildSecurityHeaders } from "./src/shared/config/security-headers";

/**
 * Production-oriented Next.js configuration.
 * Security headers follow ENABLE_* env defaults applied at runtime by the
 * application config layer; build-time headers use NODE_ENV / APP_ENV.
 *
 * When Nginx terminates TLS (docker-compose.prod), prefer edge headers and set
 * ENABLE_SECURITY_HEADERS=false on the app to avoid duplicate/conflicting CSP.
 */
function isHardenedBuild(): boolean {
  const appEnv = process.env.APP_ENV;
  if (appEnv === "staging" || appEnv === "production") {
    return true;
  }

  if (appEnv === "local" || appEnv === "development" || appEnv === "test") {
    return false;
  }

  return process.env.NODE_ENV === "production";
}

function envFlag(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    return fallback;
  }

  const normalized = raw.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

const hardened = isHardenedBuild();
const enableSecurityHeaders = envFlag("ENABLE_SECURITY_HEADERS", hardened);
const enableHsts = envFlag("ENABLE_HSTS", hardened);

const securityHeaders = enableSecurityHeaders
  ? buildSecurityHeaders({ enableHsts })
  : [];

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Required for the production Docker image (copies a minimal server into .next/standalone).
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  // Prefer Next/Node compression when not terminating TLS at a reverse proxy
  // that already gzips (Nginx does). Harmless when double-compressed is avoided
  // by proxying without compressing upstream twice — Nginx compresses client-facing.
  compress: true,
  // Tree-shake heavy icon/chart/date barrels into per-icon/per-symbol imports.
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
  },
  // Ready for product/media UI — no remote patterns yet (uploads are local).
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24,
  },
  async headers() {
    if (securityHeaders.length === 0) {
      return [];
    }

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
