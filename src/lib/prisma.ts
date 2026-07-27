import { PrismaClient } from "@prisma/client";

export function normalizePrismaDatabaseUrl(url: string) {
  const value = url.trim();
  if (!value) return value;

  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    const isNeonPooler = hostname.includes("-pooler.") || hostname.includes("pooler");
    if (isNeonPooler) {
      parsed.searchParams.set("pgbouncer", parsed.searchParams.get("pgbouncer") ?? "true");
      parsed.searchParams.set("connection_limit", parsed.searchParams.get("connection_limit") ?? process.env.PRISMA_CONNECTION_LIMIT ?? "3");
    }
    return parsed.toString();
  } catch {
    return value;
  }
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const databaseUrl = normalizePrismaDatabaseUrl(process.env.DATABASE_URL ?? "");

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: databaseUrl ? { db: { url: databaseUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
