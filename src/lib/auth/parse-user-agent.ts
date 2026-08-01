export type ParsedUserAgent = {
  readonly browser: string;
  readonly operatingSystem: string;
};

/**
 * Lightweight UA parsing for session lists. Avoids a dependency for common cases.
 */
export function parseUserAgent(
  userAgent: string | null | undefined,
): ParsedUserAgent {
  if (userAgent === null || userAgent === undefined) {
    return { browser: "Unknown browser", operatingSystem: "Unknown OS" };
  }

  const trimmed = userAgent.trim();
  if (trimmed.length === 0) {
    return { browser: "Unknown browser", operatingSystem: "Unknown OS" };
  }

  return {
    browser: detectBrowser(trimmed),
    operatingSystem: detectOperatingSystem(trimmed),
  };
}

function detectBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) {
    return "Microsoft Edge";
  }
  if (/OPR\/|Opera/i.test(ua)) {
    return "Opera";
  }
  if (/Firefox\//i.test(ua)) {
    return "Firefox";
  }
  if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) {
    return "Chrome";
  }
  if (/Chromium\//i.test(ua)) {
    return "Chromium";
  }
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    return "Safari";
  }
  return "Unknown browser";
}

function detectOperatingSystem(ua: string): string {
  if (/Android/i.test(ua)) {
    return "Android";
  }
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return "iOS";
  }
  if (/Windows NT/i.test(ua)) {
    return "Windows";
  }
  if (/Mac OS X|Macintosh/i.test(ua)) {
    return "macOS";
  }
  if (/CrOS/i.test(ua)) {
    return "Chrome OS";
  }
  if (/Linux/i.test(ua)) {
    return "Linux";
  }
  return "Unknown OS";
}
