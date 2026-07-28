import "server-only";

import { prisma } from "@/lib/prisma";

export async function loadTestTemplatesForAdmin() {
  return prisma.testTemplate.findMany({
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: { rules: { orderBy: { order: "asc" } } },
      },
    },
    orderBy: [{ status: "asc" }, { subjectName: "asc" }, { createdAt: "desc" }],
  });
}
