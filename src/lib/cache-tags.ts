import { revalidateTag } from "next/cache";

export const curriculumCatalogTag = "curriculum:published";
export const aiSettingsTag = "ai:settings";

export function childrenTag(parentId: string) {
  return `children:${parentId}`;
}

export function childDashboardTag(childId: string) {
  return `child-dashboard:${childId}`;
}

export function parentReportsTag(parentId: string) {
  return `reports:${parentId}`;
}

export function parentCalendarTag(parentId: string) {
  return `calendar:${parentId}`;
}

export function aiSubscriptionTag(parentId: string) {
  return `ai-subscription:${parentId}`;
}

export function aiAdminUsageTag(parentId: string) {
  return `ai-admin-usage:${parentId}`;
}

function expireTag(tag: string) {
  try {
    revalidateTag(tag, { expire: 0 });
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      throw error;
    }
  }
}

export function invalidateCurriculumCatalogCache() {
  expireTag(curriculumCatalogTag);
}

export function invalidateParentDashboardCaches(parentId: string) {
  expireTag(childrenTag(parentId));
  expireTag(parentReportsTag(parentId));
  expireTag(parentCalendarTag(parentId));
  expireTag(aiAdminUsageTag(parentId));
}

export function invalidateChildDashboardCaches(childId: string, parentId?: string | null) {
  expireTag(childDashboardTag(childId));
  if (parentId) {
    invalidateParentDashboardCaches(parentId);
  }
}

export function invalidateAiSettingsCache() {
  expireTag(aiSettingsTag);
}

export function invalidateAiSubscriptionCache(parentId: string) {
  expireTag(aiSubscriptionTag(parentId));
  expireTag(aiAdminUsageTag(parentId));
}

export function invalidateAiUsageCache(parentId: string) {
  expireTag(aiAdminUsageTag(parentId));
}
