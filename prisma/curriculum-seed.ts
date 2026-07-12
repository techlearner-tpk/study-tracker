import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "@/lib/prisma";
import { importCurriculumSeed, loadCurriculumSeedFromFile } from "@/features/curriculum/service";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const fileFlagIndex = args.indexOf("--file");
  const fileArg = fileFlagIndex >= 0 ? args[fileFlagIndex + 1] : undefined;
  const filePath = resolve(fileArg ?? "prisma/seeds/cbse-2026-27-detailed.seed.json");

  await access(filePath);
  const seed = await loadCurriculumSeedFromFile(filePath);
  const result = await importCurriculumSeed(prisma, seed, { dryRun });

  console.log(
    JSON.stringify(
      {
        dryRun: result.dryRun,
        seedId: result.seedId,
        boardCode: result.boardCode,
        curriculumVersionId: result.curriculumVersionId,
        inserted: result.inserted,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors,
        warnings: result.warnings,
      },
      null,
      2,
    ),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

