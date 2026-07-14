import { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { hardDeleteAppDataForClerkUser } from "@/features/users/cleanup";

export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch (error) {
    console.error("Clerk webhook verification failed:", error);
    return new Response("Verification failed", { status: 400 });
  }

  if (evt.type === "user.deleted") {
    const clerkUserId = evt.data.id;
    if (clerkUserId) {
      await hardDeleteAppDataForClerkUser(clerkUserId);
    }
  }

  return new Response("OK", { status: 200 });
}
