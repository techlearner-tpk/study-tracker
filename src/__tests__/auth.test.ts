import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authMock: vi.fn(),
  currentUserMock: vi.fn(),
  prismaUser: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  prismaChild: {
    findUnique: vi.fn(),
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.authMock,
  currentUser: mocks.currentUserMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: mocks.prismaUser,
    child: mocks.prismaChild,
  },
}));

import { getCurrentUser } from "@/lib/auth";

describe("auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no Clerk session exists", async () => {
    mocks.authMock.mockResolvedValue({ userId: null });

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("creates a parent user for a verified Clerk sign-in", async () => {
    mocks.authMock.mockResolvedValue({ userId: "clerk_user_1" });
    mocks.currentUserMock.mockResolvedValue({
      id: "clerk_user_1",
      firstName: "Tushar",
      lastName: "Kherde",
      fullName: "Tushar Kherde",
      primaryEmailAddressId: "email_1",
      emailAddresses: [
        {
          id: "email_1",
          emailAddress: "parent@example.com",
          verification: { status: "verified" },
        },
      ],
    });
    mocks.prismaUser.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    mocks.prismaUser.create.mockResolvedValue({
      id: "user_1",
      email: "parent@example.com",
      name: "Tushar Kherde",
      role: "PARENT",
      childId: null,
      verifiedAt: new Date("2026-07-04T00:00:00.000Z"),
    });

    await expect(getCurrentUser()).resolves.toMatchObject({
      id: "user_1",
      email: "parent@example.com",
      name: "Tushar Kherde",
      role: "PARENT",
      childId: null,
    });

    expect(mocks.prismaUser.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "parent@example.com",
          clerkUserId: "clerk_user_1",
          role: "PARENT",
        }),
      }),
    );
  });

  it("links an existing kid placeholder to the Clerk user", async () => {
    mocks.authMock.mockResolvedValue({ userId: "clerk_kid_1" });
    mocks.currentUserMock.mockResolvedValue({
      id: "clerk_kid_1",
      firstName: "Aarav",
      lastName: "",
      fullName: "Aarav",
      primaryEmailAddressId: "email_1",
      publicMetadata: {
        role: "KID",
        childId: "child_1",
      },
      emailAddresses: [
        {
          id: "email_1",
          emailAddress: "kid@example.com",
          verification: { status: "verified" },
        },
      ],
    });

    const kidRecord = {
      id: "user_kid_1",
      email: "kid@example.com",
      name: "Aarav",
      role: "KID",
      childId: "child_1",
      clerkUserId: "clerk_kid_1",
      verifiedAt: new Date("2026-07-04T00:00:00.000Z"),
    };

    mocks.prismaUser.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      ...kidRecord,
      clerkUserId: null,
      verifiedAt: null,
    });
    mocks.prismaChild.findUnique.mockResolvedValue({ id: "child_1" });
    mocks.prismaUser.update.mockResolvedValue(kidRecord);

    await expect(getCurrentUser()).resolves.toMatchObject({
      id: "user_kid_1",
      email: "kid@example.com",
      name: "Aarav",
      role: "KID",
      childId: "child_1",
    });

    expect(mocks.prismaUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user_kid_1" },
        data: expect.objectContaining({
          clerkUserId: "clerk_kid_1",
          email: "kid@example.com",
          name: "Aarav",
        }),
      }),
    );
  });

  it("keeps the invited kid link when Clerk metadata is missing", async () => {
    mocks.authMock.mockResolvedValue({ userId: "clerk_kid_2" });
    mocks.currentUserMock.mockResolvedValue({
      id: "clerk_kid_2",
      firstName: "Sara",
      lastName: "",
      fullName: "Sara",
      primaryEmailAddressId: "email_1",
      emailAddresses: [
        {
          id: "email_1",
          emailAddress: "sara@example.com",
          verification: { status: "verified" },
        },
      ],
    });

    const placeholder = {
      id: "user_kid_2",
      email: "sara@example.com",
      name: "sara",
      role: "KID",
      childId: "child_2",
      clerkUserId: null,
      verifiedAt: null,
    };

    mocks.prismaUser.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(placeholder);
    mocks.prismaChild.findUnique.mockResolvedValue({ id: "child_2" });
    mocks.prismaUser.update.mockResolvedValue({
      ...placeholder,
      name: "Sara",
      clerkUserId: "clerk_kid_2",
      verifiedAt: new Date("2026-07-04T00:00:00.000Z"),
    });

    await expect(getCurrentUser()).resolves.toMatchObject({
      id: "user_kid_2",
      email: "sara@example.com",
      name: "Sara",
      role: "KID",
      childId: "child_2",
    });

    expect(mocks.prismaUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "KID",
          childId: "child_2",
        }),
      }),
    );
  });
});
