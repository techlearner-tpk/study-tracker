import { describe, expect, it } from "vitest";

import { normalizePrismaDatabaseUrl } from "@/lib/prisma";

describe("normalizePrismaDatabaseUrl", () => {
  it("adds pgbouncer settings for Neon pooler urls", () => {
    const url = normalizePrismaDatabaseUrl(
      "postgresql://user:pass@example-pooler.neon.tech/db?sslmode=require",
    );

    expect(url).toContain("pgbouncer=true");
    expect(url).toContain("connection_limit=1");
    expect(url).toContain("sslmode=require");
  });

  it("leaves non-pooler urls unchanged", () => {
    const url = normalizePrismaDatabaseUrl("postgresql://localhost:5432/study_tracker");
    expect(url).toBe("postgresql://localhost:5432/study_tracker");
  });
});
