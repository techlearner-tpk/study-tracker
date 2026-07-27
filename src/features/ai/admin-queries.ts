import { unstable_cache } from "next/cache";
import { aiAdminUsageTag, aiSettingsTag, aiSubscriptionTag } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";

export async function getCachedAiSettings() {
  const load = () => prisma.aiSetting.findUnique({ where: { id: 1 } });
  if (process.env.NODE_ENV === "test") return load();
  return unstable_cache(
    load,
    ["ai-settings"],
    {
      tags: [aiSettingsTag],
      revalidate: 300,
    },
  )();
}

export async function getCachedFamilySubscription(parentId: string) {
  const load = () => prisma.subscription.findUnique({ where: { parentId } });
  if (process.env.NODE_ENV === "test") return load();
  return unstable_cache(
    load,
    ["ai-subscription", parentId],
    {
      tags: [aiSubscriptionTag(parentId)],
      revalidate: 300,
    },
  )();
}

export async function getCachedAiUsageChildren(parentId: string) {
  const load = () =>
    prisma.child.findMany({
      where: { userId: parentId },
      include: {
        aiTopicUsages: {
          include: {
            topic: {
              include: {
                chapter: {
                  include: {
                    subject: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  if (process.env.NODE_ENV === "test") return load();
  return unstable_cache(
    load,
    ["ai-admin-usage", parentId],
    {
      tags: [aiAdminUsageTag(parentId)],
      revalidate: 120,
    },
  )();
}
