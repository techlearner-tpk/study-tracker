-- Add Clerk linkage to users so the app can map Clerk identities to local parent and kid records.
ALTER TABLE "User" ADD COLUMN "clerkUserId" TEXT;

CREATE UNIQUE INDEX "User_clerkUserId_key" ON "User"("clerkUserId");
