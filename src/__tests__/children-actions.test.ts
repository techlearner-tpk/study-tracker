import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireParentUser: vi.fn(),
  prismaChildCreate: vi.fn(),
  prismaChildDelete: vi.fn(),
  prismaUserUpsert: vi.fn(),
  getOwnedChild: vi.fn(),
  clerkClient: vi.fn(),
  createInvitation: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/auth", () => ({
  requireParentUser: mocks.requireParentUser,
}));

vi.mock("@/lib/ownership", () => ({
  getOwnedChild: mocks.getOwnedChild,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    child: {
      create: mocks.prismaChildCreate,
      delete: mocks.prismaChildDelete,
    },
    user: {
      upsert: mocks.prismaUserUpsert,
    },
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: mocks.clerkClient,
}));

import { inviteKid } from "@/features/children/actions";

describe("children actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireParentUser.mockResolvedValue({ id: "parent_1" });
    mocks.prismaChildCreate.mockResolvedValue({
      id: "child_1",
      name: "Tisha",
    });
    mocks.prismaChildDelete.mockResolvedValue({
      id: "child_1",
    });
    mocks.prismaUserUpsert.mockResolvedValue({
      id: "kid_user_1",
    });
    mocks.deleteUser.mockResolvedValue({
      id: "clerk_kid_1",
    });
    mocks.clerkClient.mockResolvedValue({
      invitations: {
        createInvitation: mocks.createInvitation,
      },
      users: {
        deleteUser: mocks.deleteUser,
      },
    });
    mocks.getOwnedChild.mockResolvedValue({
      id: "child_1",
      kidUser: {
        clerkUserId: "clerk_kid_1",
      },
    });
  });

  it("creates a Clerk invitation when a parent invites by email", async () => {
    const formData = new FormData();
    formData.set("kidEmail", "kid@example.com");

    await inviteKid(formData);

    expect(mocks.createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        emailAddress: "kid@example.com",
        redirectUrl: "http://localhost:3000/sign-up",
        publicMetadata: expect.objectContaining({
          role: "KID",
          childId: "child_1",
        }),
      }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
  });

  it("deletes the linked Clerk kid account when a child is removed", async () => {
    const { deleteChild } = await import("@/features/children/actions");

    const formData = new FormData();
    formData.set("childId", "child_1");
    formData.set("childName", "Tisha");
    formData.set("confirmation", "Tisha");

    await expect(deleteChild(formData)).rejects.toThrow();

    expect(mocks.prismaChildDelete).toHaveBeenCalledWith({
      where: { id: "child_1" },
    });
    expect(mocks.deleteUser).toHaveBeenCalledWith("clerk_kid_1");
  });
});
