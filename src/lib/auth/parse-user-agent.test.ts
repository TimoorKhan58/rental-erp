import { describe, expect, it } from "vitest";
import { parseUserAgent } from "./parse-user-agent";

describe("parseUserAgent", () => {
  it("returns unknowns for empty input", () => {
    expect(parseUserAgent(null)).toEqual({
      browser: "Unknown browser",
      operatingSystem: "Unknown OS",
    });
    expect(parseUserAgent("")).toEqual({
      browser: "Unknown browser",
      operatingSystem: "Unknown OS",
    });
  });

  it("detects Chrome on Windows", () => {
    expect(
      parseUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ),
    ).toEqual({
      browser: "Chrome",
      operatingSystem: "Windows",
    });
  });

  it("detects Safari on macOS", () => {
    expect(
      parseUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      ),
    ).toEqual({
      browser: "Safari",
      operatingSystem: "macOS",
    });
  });

  it("detects Edge before Chrome", () => {
    expect(
      parseUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
      ),
    ).toEqual({
      browser: "Microsoft Edge",
      operatingSystem: "Windows",
    });
  });

  it("detects Firefox on Linux", () => {
    expect(
      parseUserAgent(
        "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
      ),
    ).toEqual({
      browser: "Firefox",
      operatingSystem: "Linux",
    });
  });
});
