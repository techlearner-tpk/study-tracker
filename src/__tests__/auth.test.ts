import { beforeEach, describe, expect, it } from "vitest";
import { createSessionToken, hashPassword, verifyPassword, verifySessionToken } from "@/lib/security";

describe("auth", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret";
  });

  it("hashes and verifies passwords", () => {
    const hash = hashPassword("letmein");
    expect(verifyPassword("letmein", hash)).toBe(true);
    expect(verifyPassword("wrong", hash)).toBe(false);
  });

  it("signs and verifies session tokens", () => {
    const token = createSessionToken({
      id: "user-1",
      email: "parent@example.com",
      name: "Parent",
      role: "PARENT",
    });

    expect(verifySessionToken(token)).toMatchObject({
      userId: "user-1",
      email: "parent@example.com",
      role: "PARENT",
    });
  });
});
