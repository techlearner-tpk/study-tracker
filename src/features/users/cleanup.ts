import { prisma } from "@/lib/prisma";

export async function hardDeleteAppDataForClerkUser(clerkUserId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true },
  });

  if (!user) {
    return { deleted: false as const };
  }

  await prisma.$transaction(async (tx) => {
    await tx.assignment.deleteMany({
      where: { assignedByUserId: user.id },
    });
    await tx.user.delete({
      where: { id: user.id },
    });
  });

  return { deleted: true as const };
}
