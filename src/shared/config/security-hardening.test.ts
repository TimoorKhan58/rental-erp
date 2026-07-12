import { describe, expect, it } from "vitest";

import { storageConfig } from "@/shared/config/storage.config";
import { validateUploadInput } from "@/shared/infrastructure/storage/storage-key";
import { resolveClientIp } from "@/shared/infrastructure/http/client-ip";
import {
  CONTENT_SECURITY_POLICY,
  buildSecurityHeaders,
} from "@/shared/config/security-headers";

describe("security headers", () => {
  it("builds a CSP without unsafe-eval", () => {
    expect(CONTENT_SECURITY_POLICY).toContain("default-src 'self'");
    expect(CONTENT_SECURITY_POLICY).not.toContain("unsafe-eval");
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
  });

  it("includes COOP and CORP when headers are enabled", () => {
    const headers = buildSecurityHeaders({ enableHsts: true });
    const keys = headers.map((header) => header.key);
    expect(keys).toContain("Content-Security-Policy");
    expect(keys).toContain("Cross-Origin-Opener-Policy");
    expect(keys).toContain("Cross-Origin-Resource-Policy");
    expect(keys).toContain("Strict-Transport-Security");
  });
});

describe("upload validation", () => {
  it("rejects oversized uploads", () => {
    expect(() =>
      validateUploadInput({
        key: "docs/file.pdf",
        mimeType: "application/pdf",
        size: storageConfig.maxFileSizeBytes + 1,
        buffer: Buffer.alloc(storageConfig.maxFileSizeBytes + 1),
      }),
    ).toThrow(/maximum size/i);
  });

  it("rejects disallowed mime types", () => {
    expect(() =>
      validateUploadInput({
        key: "docs/file.exe",
        mimeType: "application/octet-stream",
        size: 4,
        buffer: Buffer.from("test"),
      }),
    ).toThrow(/mime type is not allowed/i);
  });

  it("accepts an allowlisted PDF", () => {
    const buffer = Buffer.from("%PDF-1.4");
    expect(() =>
      validateUploadInput({
        key: "invoices/a.pdf",
        mimeType: "application/pdf",
        size: buffer.length,
        buffer,
      }),
    ).not.toThrow();
  });
});

describe("client IP resolution", () => {
  it("returns undefined when no forwarding headers are present", () => {
    expect(resolveClientIp(new Headers())).toBeUndefined();
  });
});
