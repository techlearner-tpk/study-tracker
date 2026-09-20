import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  requireParentUser: vi.fn(),
  prismaChildCreate: vi.fn(),
  prismaChildUpdate: vi.fn(),
  prismaChildDelete: vi.fn(),
  prismaUserFindUnique: vi.fn(),
  prismaUserUpsert: vi.fn(),
  getOwnedChild: vi.fn(),
  clerkClient: vi.fn(),
  createInvitation: vi.fn(),
  getInvitationList: vi.fn(),
  revokeInvitation: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  revalidateTag: mocks.revalidateTag,
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
      update: mocks.prismaChildUpdate,
      delete: mocks.prismaChildDelete,
    },
    user: {
      findUnique: mocks.prismaUserFindUnique,
      upsert: mocks.prismaUserUpsert,
    },
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: mocks.clerkClient,
}));

import { inviteKid } from "@/features/children/actions";

describe("children actions", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireParentUser.mockResolvedValue({ id: "parent_1" });
    mocks.prismaChildCreate.mockResolvedValue({
      id: "child_1",
      name: "Tisha",
    });
    mocks.prismaChildUpdate.mockResolvedValue({ id: "child_1" });
    mocks.prismaUserFindUnique.mockResolvedValue(null);
    mocks.prismaChildDelete.mockResolvedValue({
      id: "child_1",
    });
    mocks.prismaUserUpsert.mockResolvedValue({
      id: "kid_user_1",
    });
    mocks.deleteUser.mockResolvedValue({
      id: "clerk_kid_1",
    });
    mocks.getInvitationList.mockResolvedValue({ data: [], totalCount: 0 });
    mocks.revokeInvitation.mockResolvedValue({ id: "invite_old", status: "revoked" });
    mocks.clerkClient.mockResolvedValue({
      invitations: {
        createInvitation: mocks.createInvitation,
        getInvitationList: mocks.getInvitationList,
        revokeInvitation: mocks.revokeInvitation,
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

    await expect(inviteKid(formData)).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });

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

  it("uses the public Vercel domain for invitations in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "http://localhost:3000");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "study-tracker-weld-seven.vercel.app");

    const formData = new FormData();
    formData.set("kidEmail", "kid@example.com");

    await expect(inviteKid(formData)).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });

    expect(mocks.createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectUrl: "https://study-tracker-weld-seven.vercel.app/sign-up",
      }),
    );
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

  it("links a kid email and sends a Clerk invitation when added during child edit", async () => {
    const { updateChild } = await import("@/features/children/actions");
    mocks.getOwnedChild.mockResolvedValueOnce({ id: "child_1", kidUser: null });

    const formData = new FormData();
    formData.set("id", "child_1");
    formData.set("name", "Tisha");
    formData.set("className", "Class 8");
    formData.set("school", "Sanskriti");
    formData.set("kidEmail", "kid@example.com");

    await expect(updateChild(formData)).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });

    expect(mocks.prismaUserUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "kid@example.com" },
        create: expect.objectContaining({ childId: "child_1", role: "KID" }),
      }),
    );
    expect(mocks.createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        emailAddress: "kid@example.com",
        publicMetadata: expect.objectContaining({ role: "KID", childId: "child_1" }),
      }),
    );
  });

  it("does not relink an email already attached to another child", async () => {
    const { updateChild } = await import("@/features/children/actions");
    mocks.getOwnedChild.mockResolvedValueOnce({ id: "child_1", kidUser: null });
    mocks.prismaUserFindUnique.mockResolvedValueOnce({ id: "kid_user_2", childId: "child_2", role: "KID" });

    const formData = new FormData();
    formData.set("id", "child_1");
    formData.set("name", "Tisha");
    formData.set("className", "Class 8");
    formData.set("kidEmail", "kid@example.com");

    await expect(updateChild(formData)).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
    expect(mocks.prismaUserUpsert).not.toHaveBeenCalled();
    expect(mocks.createInvitation).not.toHaveBeenCalled();
  });

  it("resends an invitation only while the kid signup is pending", async () => {
    const { resendKidInvitation } = await import("@/features/children/actions");
    mocks.getOwnedChild.mockResolvedValueOnce({
      id: "child_1",
      name: "Tisha",
      kidUser: { email: "kid@example.com", clerkUserId: null },
    });
    mocks.getInvitationList.mockResolvedValueOnce({
      data: [{ id: "invite_old", emailAddress: "kid@example.com" }],
      totalCount: 1,
    });

    const formData = new FormData();
    formData.set("id", "child_1");

    await expect(resendKidInvitation(formData)).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });

    expect(mocks.getInvitationList).toHaveBeenCalledWith({
      query: "kid@example.com",
      status: "pending",
    });
    expect(mocks.createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ emailAddress: "kid@example.com" }),
    );
    expect(mocks.revokeInvitation).toHaveBeenCalledWith("invite_old");
  });

  it("blocks invitation resend after the kid has signed up", async () => {
    const { resendKidInvitation } = await import("@/features/children/actions");
    mocks.getOwnedChild.mockResolvedValueOnce({
      id: "child_1",
      name: "Tisha",
      kidUser: { email: "kid@example.com", clerkUserId: "clerk_kid_1" },
    });

    const formData = new FormData();
    formData.set("id", "child_1");

    await expect(resendKidInvitation(formData)).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
    expect(mocks.createInvitation).not.toHaveBeenCalled();
  });

  it("blocks changing the email after the kid has signed up", async () => {
    const { updateChild } = await import("@/features/children/actions");
    mocks.getOwnedChild.mockResolvedValueOnce({
      id: "child_1",
      kidUser: { email: "kid@example.com", clerkUserId: "clerk_kid_1" },
    });

    const formData = new FormData();
    formData.set("id", "child_1");
    formData.set("name", "Tisha");
    formData.set("className", "Class 8");
    formData.set("kidEmail", "different@example.com");

    await expect(updateChild(formData)).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
    expect(mocks.prismaChildUpdate).not.toHaveBeenCalled();
  });
});
