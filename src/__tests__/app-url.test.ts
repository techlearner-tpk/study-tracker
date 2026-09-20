import { afterEach, describe, expect, it, vi } from "vitest";
import { appUrl } from "@/lib/app-url";

describe("appUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses and normalizes the configured public URL", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "https://study-tracker-weld-seven.vercel.app/");

    expect(appUrl()).toBe("https://study-tracker-weld-seven.vercel.app");
  });

  it("uses Vercel's production URL when APP_URL still points to localhost", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "http://localhost:3000");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "study-tracker-weld-seven.vercel.app");

    expect(appUrl()).toBe("https://study-tracker-weld-seven.vercel.app");
  });

  it("fails fast instead of sending localhost links from production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "http://localhost:3000");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    vi.stubEnv("VERCEL_URL", "");

    expect(() => appUrl()).toThrow("A public application URL is required in production");
  });

  it("keeps localhost available during local development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("PORT", "3100");

    expect(appUrl()).toBe("http://localhost:3100");
  });
});
