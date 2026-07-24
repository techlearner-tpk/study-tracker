import { Prisma, PrismaClient, CurriculumStatus, CurriculumVerificationStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { prisma } from "@/lib/prisma";
import { resolveSubjectColor } from "@/lib/subject-colors";
import { curriculumSeedSchema, type CurriculumSeed, normalizeStableKey } from "./schema";

type ImportCounts = {
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
};

export type CurriculumImportResult = ImportCounts & {
  dryRun: boolean;
  seedId: string;
  boardCode: string;
  curriculumVersionId?: string;
  warnings: string[];
};

export type CurriculumTreeTopic = {
  id: string;
  stableKey: string;
  name: string;
  sequence: number;
  sourceUrl: string | null;
  verificationStatus: CurriculumVerificationStatus;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CurriculumTreeChapter = {
  id: string;
  stableKey: string;
  name: string;
  sequence: number;
  sourceUrl: string | null;
  verificationStatus: CurriculumVerificationStatus;
  archivedAt: Date | null;
  topics: CurriculumTreeTopic[];
};

export type CurriculumTreeSubject = {
  id: string;
  stableKey: string;
  name: string;
  sequence: number;
  isDefaultSelected: boolean;
  isOptional: boolean;
  isLanguageSubject: boolean;
  sourceUrl: string | null;
  verificationStatus: CurriculumVerificationStatus;
  archivedAt: Date | null;
  chapters: CurriculumTreeChapter[];
};

export type CurriculumTreeClass = {
  id: string;
  level: number;
  name: string;
  stableKey: string;
  sequence: number;
  subjects: CurriculumTreeSubject[];
};

export type CurriculumTreeVersion = {
  id: string;
  academicYear: string;
  version: string;
  name: string;
  status: CurriculumStatus;
  verificationStatus: CurriculumVerificationStatus;
  sourceUrl: string | null;
  notes: string | null;
  sourceReferences: Prisma.JsonValue | null;
  publishedAt: Date | null;
  archivedAt: Date | null;
  updatedAt: Date;
  board: {
    id: string;
    code: string;
    name: string;
  };
  classes: CurriculumTreeClass[];
};

export type CurriculumVersionSummary = CurriculumTreeVersion & {
  counts: ReturnType<typeof summarizeTree>;
};

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseBoolean(value: string | undefined) {
  return typeof value === "string" && ["true", "1", "yes", "y"].includes(value.trim().toLowerCase());
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseCsvTable(text: string) {
  const lines = splitLines(text);
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

function defaultBoardName(code: string) {
  return code === "CBSE" ? "Central Board of Secondary Education" : code;
}

function buildFallbackSeedFromCsv(rows: Record<string, string>[], fileName: string): CurriculumSeed {
  if (!rows.length) {
    throw new Error("CSV import is empty");
  }

  const boardCode = rows[0].boardCode?.trim();
  const academicYear = rows[0].academicYear?.trim();
  if (!boardCode || !academicYear) {
    throw new Error("CSV import must include boardCode and academicYear columns");
  }

  const board = {
    code: boardCode,
    name: defaultBoardName(boardCode),
  };
  const classes = new Map<number, CurriculumSeed["classes"][number]>();
  const subjectMaps = new Map<string, Map<string, CurriculumSeed["classes"][number]["subjects"][number]>>();
  const chapterMaps = new Map<string, Map<string, CurriculumSeed["classes"][number]["subjects"][number]["chapters"][number]>>();
  const topicMaps = new Map<string, Map<string, CurriculumSeed["classes"][number]["subjects"][number]["chapters"][number]["topics"][number]>>();

  function assertSame(label: string, left: Record<string, unknown>, right: Record<string, unknown>) {
    const leftText = JSON.stringify(left);
    const rightText = JSON.stringify(right);
    if (leftText !== rightText) {
      throw new Error(`Conflicting duplicate ${label}: ${leftText} !== ${rightText}`);
    }
  }

  for (const row of rows) {
    const level = Number(row.classLevel);
    if (!Number.isInteger(level) || level <= 0) {
      throw new Error(`Invalid class level in CSV row: ${JSON.stringify(row)}`);
    }
    const className = row.className?.trim() || `Class ${level}`;
    const classStableKey = normalizeStableKey(row.classStableKey?.trim() || `class-${level}`);
    const classSequence = Number(row.classSequence ?? level);
    const subjectStableKey = row.subjectStableKey?.trim();
    const subjectName = row.subjectName?.trim();
    const subjectSequence = Number(row.subjectSequence ?? 0);
    const chapterStableKey = row.chapterStableKey?.trim();
    const chapterName = row.chapterName?.trim();
    const chapterSequence = Number(row.chapterSequence ?? 0);
    const topicStableKey = row.topicStableKey?.trim();
    const topicName = row.topicName?.trim();
    const topicSequence = Number(row.topicSequence ?? 0);

    if (!subjectStableKey || !subjectName || !chapterStableKey || !chapterName || !topicStableKey || !topicName) {
      throw new Error(`CSV row is missing hierarchy columns: ${JSON.stringify(row)}`);
    }

    const classEntry =
      classes.get(level) ??
      {
        level,
        name: className,
        sequence: classSequence,
        stableKey: classStableKey,
        subjects: [],
      };
    if (classes.has(level)) {
      assertSame(
        `class ${level}`,
        {
          level: classEntry.level,
          name: classEntry.name,
          sequence: classEntry.sequence,
          stableKey: classEntry.stableKey,
        },
        {
          level,
          name: className,
          sequence: classSequence,
          stableKey: classStableKey,
        },
      );
    }
    classes.set(level, classEntry);

    const classSubjectMap = subjectMaps.get(classStableKey) ?? new Map();
    subjectMaps.set(classStableKey, classSubjectMap);
    const classChapterMap = chapterMaps.get(`${classStableKey}:${subjectStableKey}`) ?? new Map();
    chapterMaps.set(`${classStableKey}:${subjectStableKey}`, classChapterMap);
    const classTopicMap = topicMaps.get(`${classStableKey}:${subjectStableKey}:${chapterStableKey}`) ?? new Map();
    topicMaps.set(`${classStableKey}:${subjectStableKey}:${chapterStableKey}`, classTopicMap);

    const subjectEntry =
      classSubjectMap.get(subjectStableKey) ??
      {
        stableKey: subjectStableKey,
        name: subjectName,
        sequence: subjectSequence,
        isDefaultSelected: parseBoolean(row.defaultSelected),
        isOptional: parseBoolean(row.optional),
        isLanguageSubject: parseBoolean(row.isLanguageSubject ?? row.languageSubject),
        sourceUrl: row.subjectSourceUrl?.trim() || undefined,
        verificationStatus: (row.verificationStatus?.trim() as CurriculumVerificationStatus) ?? "REVIEW_REQUIRED",
        chapters: [],
      };
    if (classSubjectMap.has(subjectStableKey)) {
      assertSame(
        `subject ${subjectStableKey}`,
        {
          stableKey: subjectEntry.stableKey,
          name: subjectEntry.name,
          sequence: subjectEntry.sequence,
          isDefaultSelected: subjectEntry.isDefaultSelected,
          isOptional: subjectEntry.isOptional,
          isLanguageSubject: subjectEntry.isLanguageSubject,
          sourceUrl: subjectEntry.sourceUrl,
          verificationStatus: subjectEntry.verificationStatus,
        },
        {
          stableKey: subjectStableKey,
          name: subjectName,
          sequence: subjectSequence,
          isDefaultSelected: parseBoolean(row.defaultSelected),
          isOptional: parseBoolean(row.optional),
          isLanguageSubject: parseBoolean(row.isLanguageSubject ?? row.languageSubject),
          sourceUrl: row.subjectSourceUrl?.trim() || undefined,
          verificationStatus: (row.verificationStatus?.trim() as CurriculumVerificationStatus) ?? "REVIEW_REQUIRED",
        },
      );
    }
    classSubjectMap.set(subjectStableKey, subjectEntry);

    const chapterEntry =
      classChapterMap.get(chapterStableKey) ??
      {
        stableKey: chapterStableKey,
        name: chapterName,
        sequence: chapterSequence,
        sourceUrl: row.chapterSourceUrl?.trim() || undefined,
        verificationStatus: (row.verificationStatus?.trim() as CurriculumVerificationStatus) ?? "REVIEW_REQUIRED",
        topics: [],
      };
    if (classChapterMap.has(chapterStableKey)) {
      assertSame(
        `chapter ${chapterStableKey}`,
        {
          stableKey: chapterEntry.stableKey,
          name: chapterEntry.name,
          sequence: chapterEntry.sequence,
          sourceUrl: chapterEntry.sourceUrl,
          verificationStatus: chapterEntry.verificationStatus,
        },
        {
          stableKey: chapterStableKey,
          name: chapterName,
          sequence: chapterSequence,
          sourceUrl: row.chapterSourceUrl?.trim() || undefined,
          verificationStatus: (row.verificationStatus?.trim() as CurriculumVerificationStatus) ?? "REVIEW_REQUIRED",
        },
      );
    }
    classChapterMap.set(chapterStableKey, chapterEntry);

    const topicEntry =
      classTopicMap.get(topicStableKey) ??
      {
        stableKey: topicStableKey,
        name: topicName,
        sequence: topicSequence,
        sourceUrl: row.topicSourceUrl?.trim() || undefined,
        verificationStatus: (row.verificationStatus?.trim() as CurriculumVerificationStatus) ?? "REVIEW_REQUIRED",
      };
    if (classTopicMap.has(topicStableKey)) {
      assertSame(
        `topic ${topicStableKey}`,
        {
          stableKey: topicEntry.stableKey,
          name: topicEntry.name,
          sequence: topicEntry.sequence,
          sourceUrl: topicEntry.sourceUrl,
          verificationStatus: topicEntry.verificationStatus,
        },
        {
          stableKey: topicStableKey,
          name: topicName,
          sequence: topicSequence,
          sourceUrl: row.topicSourceUrl?.trim() || undefined,
          verificationStatus: (row.verificationStatus?.trim() as CurriculumVerificationStatus) ?? "REVIEW_REQUIRED",
        },
      );
    }
    classTopicMap.set(topicStableKey, topicEntry);
  }

  for (const classEntry of classes.values()) {
    const classStableKey = classEntry.stableKey ?? normalizeStableKey(`class-${classEntry.level}`);
    const subjectMap = subjectMaps.get(classStableKey);
    if (!subjectMap) continue;
    classEntry.subjects = Array.from(subjectMap.values()).map((subject) => {
      const subjectStableKey = subject.stableKey;
      const chapterMap = chapterMaps.get(`${classStableKey}:${subjectStableKey}`);
      return {
        ...subject,
        chapters: chapterMap
          ? Array.from(chapterMap.values()).map((chapter) => {
              const chapterStableKey = chapter.stableKey;
              const topicMap = topicMaps.get(`${classStableKey}:${subjectStableKey}:${chapterStableKey}`);
              return {
                ...chapter,
                topics: topicMap ? Array.from(topicMap.values()) : [],
              };
            })
          : [],
      };
    });
  }

  return curriculumSeedSchema.parse({
    schemaVersion: "1.0",
    seedId: basename(fileName, extname(fileName)),
    board,
    curriculumVersion: {
      academicYear,
      version: "1.0",
      name: `${boardCode} ${academicYear}`,
      status: "DRAFT",
      verificationStatus: "REVIEW_REQUIRED",
      notes: [],
      sources: [],
    },
    classes: Array.from(classes.values()),
  });
}

function ensureUniqueNestedKeys(seed: CurriculumSeed) {
  const seen = new Set<string>();

  for (const curriculumClass of seed.classes) {
    const classKey = `class:${curriculumClass.stableKey ?? curriculumClass.level}`;
    if (seen.has(classKey)) {
      throw new Error(`Duplicate class key: ${classKey}`);
    }
    seen.add(classKey);

    const subjectSeen = new Set<string>();
    for (const subject of curriculumClass.subjects) {
      if (subjectSeen.has(subject.stableKey)) {
        throw new Error(`Duplicate subject stable key in ${classKey}: ${subject.stableKey}`);
      }
      subjectSeen.add(subject.stableKey);

      const chapterSeen = new Set<string>();
      for (const chapter of subject.chapters) {
        if (chapterSeen.has(chapter.stableKey)) {
          throw new Error(`Duplicate chapter stable key in ${subject.stableKey}: ${chapter.stableKey}`);
        }
        chapterSeen.add(chapter.stableKey);

        const topicSeen = new Set<string>();
        for (const topic of chapter.topics) {
          if (topicSeen.has(topic.stableKey)) {
            throw new Error(`Duplicate topic stable key in ${chapter.stableKey}: ${topic.stableKey}`);
          }
          topicSeen.add(topic.stableKey);
        }
      }
    }
  }
}

export function parseCurriculumSeedText(raw: string, fileName = "curriculum-seed.json") {
  const extension = extname(fileName).toLowerCase();

  if (extension === ".json") {
    const parsed = curriculumSeedSchema.parse(JSON.parse(raw));
    ensureUniqueNestedKeys(parsed);
    return parsed;
  }

  if (extension === ".csv") {
    const rows = parseCsvTable(raw);
    const parsed = buildFallbackSeedFromCsv(rows, fileName);
    ensureUniqueNestedKeys(parsed);
    return parsed;
  }

  throw new Error(`Unsupported curriculum seed file type: ${extension}`);
}

export async function loadCurriculumSeedFromFile(filePath: string) {
  const raw = await readFile(filePath, "utf8");
  const seed = parseCurriculumSeedText(raw, filePath);
  if (extname(filePath).toLowerCase() === ".csv") {
    const manifestPath = join(dirname(filePath), `${basename(filePath, extname(filePath))}.json`);
    try {
      await access(manifestPath);
      const manifest = curriculumSeedSchema.parse(JSON.parse(await readFile(manifestPath, "utf8")));
      return curriculumSeedSchema.parse({
        ...manifest,
        classes: seed.classes,
      });
    } catch {
      return seed;
    }
  }
  return seed;
}

function countSeedTree(seed: CurriculumSeed) {
  let classes = 0;
  let subjects = 0;
  let chapters = 0;
  let topics = 0;

  for (const curriculumClass of seed.classes) {
    classes += 1;
    subjects += curriculumClass.subjects.length;
    for (const subject of curriculumClass.subjects) {
      chapters += subject.chapters.length;
      for (const chapter of subject.chapters) {
        topics += chapter.topics.length;
      }
    }
  }

  return { classes, subjects, chapters, topics };
}

function mapVersionFields(seed: CurriculumSeed) {
  return {
    academicYear: seed.curriculumVersion.academicYear,
    version: seed.curriculumVersion.version,
    name: seed.curriculumVersion.name,
    verificationStatus: seed.curriculumVersion.verificationStatus,
    status: "DRAFT" as const,
    sourceUrl: seed.curriculumVersion.sources[0]?.url ?? null,
    notes: seed.curriculumVersion.notes.length ? seed.curriculumVersion.notes.join("\n") : null,
    sourceReferences: seed.curriculumVersion.sources as Prisma.InputJsonValue,
    publishedAt: null,
    archivedAt: null,
  };
}

async function maybeCreateBoard(tx: Prisma.TransactionClient, seed: CurriculumSeed, dryRun: boolean, counts: ImportCounts) {
  const existing = await tx.curriculumBoard.findUnique({ where: { code: seed.board.code } });
  if (!existing) {
    counts.inserted += 1;
    if (dryRun) {
      return {
        id: seed.board.code,
        code: seed.board.code,
        name: seed.board.name,
      };
    }
    return tx.curriculumBoard.create({
      data: { code: seed.board.code, name: seed.board.name },
    });
  }

  if (existing.name !== seed.board.name) {
    counts.updated += 1;
    if (!dryRun) {
      return tx.curriculumBoard.update({ where: { id: existing.id }, data: { name: seed.board.name } });
    }
  } else {
    counts.skipped += 1;
  }

  return existing;
}

async function maybeCreateVersion(
  tx: Prisma.TransactionClient,
  boardId: string,
  seed: CurriculumSeed,
  dryRun: boolean,
  counts: ImportCounts,
) {
  const desired = mapVersionFields(seed);
  const existing = await tx.curriculumVersion.findFirst({
    where: {
      boardId,
      academicYear: desired.academicYear,
      version: desired.version,
    },
  });

  if (!existing) {
    counts.inserted += 1;
    if (dryRun) {
      return {
        id: `${boardId}:${desired.academicYear}:${desired.version}`,
        boardId,
        ...desired,
      };
    }
    return tx.curriculumVersion.create({
      data: {
        boardId,
        ...desired,
      },
    });
  }

  const needsUpdate =
    existing.name !== desired.name ||
    existing.verificationStatus !== desired.verificationStatus ||
    existing.sourceUrl !== desired.sourceUrl ||
    existing.notes !== desired.notes ||
    existing.status !== "DRAFT";

  if (needsUpdate) {
    counts.updated += 1;
    if (!dryRun) {
      return tx.curriculumVersion.update({
        where: { id: existing.id },
        data: desired,
      });
    }
  } else {
    counts.skipped += 1;
  }

  return existing;
}

function subjectPayload(subject: CurriculumSeed["classes"][number]["subjects"][number]) {
  return {
    stableKey: subject.stableKey,
    name: subject.name,
    sequence: subject.sequence,
    isDefaultSelected: subject.isDefaultSelected,
    isOptional: subject.isOptional,
    isLanguageSubject: subject.isLanguageSubject,
    sourceUrl: subject.sourceUrl ?? null,
    verificationStatus: subject.verificationStatus ?? "REVIEW_REQUIRED",
    archivedAt: null,
  };
}

function chapterPayload(chapter: CurriculumSeed["classes"][number]["subjects"][number]["chapters"][number]) {
  return {
    stableKey: chapter.stableKey,
    name: chapter.name,
    sequence: chapter.sequence,
    sourceUrl: chapter.sourceUrl ?? null,
    verificationStatus: chapter.verificationStatus ?? "REVIEW_REQUIRED",
    archivedAt: null,
  };
}

function topicPayload(topic: CurriculumSeed["classes"][number]["subjects"][number]["chapters"][number]["topics"][number]) {
  return {
    stableKey: topic.stableKey,
    name: topic.name,
    sequence: topic.sequence,
    sourceUrl: topic.sourceUrl ?? null,
    verificationStatus: topic.verificationStatus ?? "REVIEW_REQUIRED",
    archivedAt: null,
  };
}

async function maybeCreateClass(
  tx: Prisma.TransactionClient,
  versionId: string,
  curriculumClass: CurriculumSeed["classes"][number],
  dryRun: boolean,
  counts: ImportCounts,
) {
  const stableKey = curriculumClass.stableKey ?? normalizeStableKey(`${curriculumClass.name}-${curriculumClass.level}`);
  const existing = await tx.curriculumClass.findFirst({
    where: {
      versionId,
      stableKey,
    },
  });

  if (!existing) {
    counts.inserted += 1;
    if (dryRun) {
      return {
        id: `${versionId}:${stableKey}`,
        versionId,
        level: curriculumClass.level,
        name: curriculumClass.name,
        stableKey,
        sequence: curriculumClass.sequence,
      };
    }
    return tx.curriculumClass.create({
      data: {
        versionId,
        level: curriculumClass.level,
        name: curriculumClass.name,
        stableKey,
        sequence: curriculumClass.sequence,
      },
    });
  }

  const needsUpdate =
    existing.level !== curriculumClass.level ||
    existing.name !== curriculumClass.name ||
    existing.sequence !== curriculumClass.sequence;
  if (needsUpdate) {
    counts.updated += 1;
    if (!dryRun) {
      return tx.curriculumClass.update({
        where: { id: existing.id },
        data: {
          level: curriculumClass.level,
          name: curriculumClass.name,
          stableKey,
          sequence: curriculumClass.sequence,
        },
      });
    }
  } else {
    counts.skipped += 1;
  }
  return existing;
}

async function maybeCreateSubject(
  tx: Prisma.TransactionClient,
  childClassId: string,
  subject: CurriculumSeed["classes"][number]["subjects"][number],
  dryRun: boolean,
  counts: ImportCounts,
) {
  const existing = await tx.curriculumSubject.findFirst({
    where: {
      classId: childClassId,
      stableKey: subject.stableKey,
    },
    include: {
      chapters: {
        include: {
          topics: true,
        },
      },
    },
  });

  const desired = subjectPayload(subject);

  if (!existing) {
    counts.inserted += 1;
    if (dryRun) {
      return {
        id: `${childClassId}:${subject.stableKey}`,
        classId: childClassId,
        ...desired,
        chapters: [],
      } as unknown as typeof existing;
    }
    return tx.curriculumSubject.create({
      data: {
        classId: childClassId,
        ...desired,
      },
    });
  }

  const needsUpdate =
    existing.name !== desired.name ||
    existing.sequence !== desired.sequence ||
    existing.isDefaultSelected !== desired.isDefaultSelected ||
    existing.isOptional !== desired.isOptional ||
    existing.isLanguageSubject !== desired.isLanguageSubject ||
    existing.sourceUrl !== desired.sourceUrl ||
    existing.verificationStatus !== desired.verificationStatus ||
    existing.archivedAt !== desired.archivedAt;

  if (needsUpdate) {
    counts.updated += 1;
    if (!dryRun) {
      await tx.curriculumSubject.update({
        where: { id: existing.id },
        data: desired,
      });
    }
  } else {
    counts.skipped += 1;
  }

  return existing;
}

async function maybeCreateChapter(
  tx: Prisma.TransactionClient,
  subjectId: string,
  chapter: CurriculumSeed["classes"][number]["subjects"][number]["chapters"][number],
  dryRun: boolean,
  counts: ImportCounts,
) {
  const existing = await tx.curriculumChapter.findFirst({
    where: {
      subjectId,
      stableKey: chapter.stableKey,
    },
    include: {
      topics: true,
    },
  });
  const desired = chapterPayload(chapter);

  if (!existing) {
    counts.inserted += 1;
    if (dryRun) {
      return {
        id: `${subjectId}:${chapter.stableKey}`,
        subjectId,
        ...desired,
        topics: [],
      } as unknown as typeof existing;
    }
    return tx.curriculumChapter.create({
      data: {
        subjectId,
        ...desired,
      },
    });
  }

  const needsUpdate =
    existing.name !== desired.name ||
    existing.sequence !== desired.sequence ||
    existing.sourceUrl !== desired.sourceUrl ||
    existing.verificationStatus !== desired.verificationStatus ||
    existing.archivedAt !== desired.archivedAt;
  if (needsUpdate) {
    counts.updated += 1;
    if (!dryRun) {
      await tx.curriculumChapter.update({
        where: { id: existing.id },
        data: desired,
      });
    }
  } else {
    counts.skipped += 1;
  }
  return existing;
}

async function maybeCreateTopic(
  tx: Prisma.TransactionClient,
  chapterId: string,
  topic: CurriculumSeed["classes"][number]["subjects"][number]["chapters"][number]["topics"][number],
  dryRun: boolean,
  counts: ImportCounts,
) {
  const existing = await tx.curriculumTopic.findFirst({
    where: {
      chapterId,
      stableKey: topic.stableKey,
    },
  });
  const desired = topicPayload(topic);

  if (!existing) {
    counts.inserted += 1;
    if (dryRun) {
      return {
        id: `${chapterId}:${topic.stableKey}`,
        chapterId,
        ...desired,
      } as unknown as typeof existing;
    }
    return tx.curriculumTopic.create({
      data: {
        chapterId,
        ...desired,
      },
    });
  }

  const needsUpdate =
    existing.name !== desired.name ||
    existing.sequence !== desired.sequence ||
    existing.sourceUrl !== desired.sourceUrl ||
    existing.verificationStatus !== desired.verificationStatus ||
    existing.archivedAt !== desired.archivedAt;
  if (needsUpdate) {
    counts.updated += 1;
    if (!dryRun) {
      await tx.curriculumTopic.update({
        where: { id: existing.id },
        data: desired,
      });
    }
  } else {
    counts.skipped += 1;
  }
  return existing;
}

export async function importCurriculumSeed(
  db: PrismaClient | Prisma.TransactionClient,
  seed: CurriculumSeed,
  options: { dryRun?: boolean } = {},
): Promise<CurriculumImportResult> {
  const dryRun = Boolean(options.dryRun);
  const counts: ImportCounts = { inserted: 0, updated: 0, skipped: 0, errors: 0 };
  const warnings: string[] = [];

  const board = await maybeCreateBoard(db, seed, dryRun, counts);
  const version = await maybeCreateVersion(db, board.id, seed, dryRun, counts);

  for (const curriculumClass of seed.classes) {
    const classRecord = await maybeCreateClass(db, version.id, curriculumClass, dryRun, counts);
    for (const subject of curriculumClass.subjects) {
      const subjectRecord = await maybeCreateSubject(db, classRecord.id, subject, dryRun, counts);
      const subjectId = subjectRecord?.id ?? (await db.curriculumSubject.findFirst({ where: { classId: classRecord.id, stableKey: subject.stableKey } }))?.id;
      if (!subjectId) {
        throw new Error(`Failed to resolve subject ${subject.stableKey}`);
      }

      for (const chapter of subject.chapters) {
        const chapterRecord = await maybeCreateChapter(db, subjectId, chapter, dryRun, counts);
        const chapterId = chapterRecord?.id ?? (await db.curriculumChapter.findFirst({ where: { subjectId, stableKey: chapter.stableKey } }))?.id;
        if (!chapterId) {
          throw new Error(`Failed to resolve chapter ${chapter.stableKey}`);
        }

        for (const topic of chapter.topics) {
          await maybeCreateTopic(db, chapterId, topic, dryRun, counts);
        }
      }
    }
  }

  return {
    dryRun,
    seedId: seed.seedId,
    boardCode: seed.board.code,
    curriculumVersionId: version.id,
    ...counts,
    warnings,
  };
}

export function summarizeSeed(seed: CurriculumSeed) {
  const counts = countSeedTree(seed);
  return {
    classes: counts.classes,
    subjects: counts.subjects,
    chapters: counts.chapters,
    topics: counts.topics,
    sourceCount: seed.curriculumVersion.sources.length,
  };
}

export async function snapshotCurriculumToChild(
  tx: Prisma.TransactionClient,
  input: {
    childId: string;
    curriculumVersionId: string;
    curriculumClassId: string;
    selectedSubjectIds: string[];
  },
  versionInput?: CurriculumTreeVersion | null,
) {
  const version =
    versionInput ??
    (await tx.curriculumVersion.findUnique({
      where: { id: input.curriculumVersionId },
      include: {
        board: true,
        classes: {
          include: {
            subjects: {
              include: {
                chapters: {
                  include: {
                    topics: true,
                  },
                },
              },
            },
          },
        },
      },
    }));

  if (!version || version.status !== "PUBLISHED") {
    throw new Error("Choose a published curriculum version");
  }

  const curriculumClass = version.classes.find((entry) => entry.id === input.curriculumClassId);
  if (!curriculumClass) {
    throw new Error("Choose a valid class");
  }

  const selectedSubjectIds = input.selectedSubjectIds.length
    ? input.selectedSubjectIds
    : curriculumClass.subjects.filter((subject) => subject.isDefaultSelected).map((subject) => subject.id);

  if (!selectedSubjectIds.length) {
    throw new Error("Select at least one subject");
  }

  const selectedSubjects = curriculumClass.subjects
    .filter((subject) => selectedSubjectIds.includes(subject.id))
    .sort((left, right) => left.sequence - right.sequence);

  if (!selectedSubjects.length) {
    throw new Error("Select at least one subject");
  }

  const assignmentId = randomUUID();
  const subjectRows = selectedSubjects.map((subject) => ({
    id: randomUUID(),
    childId: input.childId,
    name: subject.name,
    color: resolveSubjectColor(subject.name),
    order: subject.sequence,
    curriculumAssignmentId: assignmentId,
    curriculumVersionId: version.id,
    curriculumSubjectId: subject.id,
  }));
  const chapterRows: Array<{
    id: string;
    subjectId: string;
    name: string;
    order: number;
    curriculumAssignmentId: string;
    curriculumVersionId: string;
    curriculumSubjectId: string;
    curriculumChapterId: string;
  }> = [];
  const topicRows: Array<{
    id: string;
    chapterId: string;
    name: string;
    description: null;
    status: "NOT_STARTED";
    confidenceRating: null;
    notes: null;
    order: number;
    curriculumAssignmentId: string;
    curriculumVersionId: string;
    curriculumSubjectId: string;
    curriculumChapterId: string;
    curriculumTopicId: string;
  }> = [];

  for (const subject of selectedSubjects) {
    const subjectRow = subjectRows.find((row) => row.curriculumSubjectId === subject.id);
    if (!subjectRow) {
      throw new Error(`Failed to prepare subject ${subject.id}`);
    }
    for (const chapter of subject.chapters.filter((entry) => !entry.archivedAt).sort((left, right) => left.sequence - right.sequence)) {
      const chapterRow = {
        id: randomUUID(),
        subjectId: subjectRow.id,
        name: chapter.name,
        order: chapter.sequence,
        curriculumAssignmentId: assignmentId,
        curriculumVersionId: version.id,
        curriculumSubjectId: subject.id,
        curriculumChapterId: chapter.id,
      };
      chapterRows.push(chapterRow);

      for (const topic of chapter.topics.filter((entry) => !entry.archivedAt).sort((left, right) => left.sequence - right.sequence)) {
        topicRows.push({
          id: randomUUID(),
          chapterId: chapterRow.id,
          name: topic.name,
          description: null,
          status: "NOT_STARTED",
          confidenceRating: null,
          notes: null,
          order: topic.sequence,
          curriculumAssignmentId: assignmentId,
          curriculumVersionId: version.id,
          curriculumSubjectId: subject.id,
          curriculumChapterId: chapter.id,
          curriculumTopicId: topic.id,
        });
      }
    }
  }

  const assignment = await tx.curriculumAssignment.create({
    data: {
      id: assignmentId,
      childId: input.childId,
      curriculumVersionId: version.id,
      curriculumClassId: curriculumClass.id,
      selectedSubjectIds,
    },
  });

  if (subjectRows.length) {
    await tx.subject.createMany({ data: subjectRows });
  }
  if (chapterRows.length) {
    await tx.chapter.createMany({ data: chapterRows });
  }
  if (topicRows.length) {
    await tx.topic.createMany({ data: topicRows });
  }

  return assignment;
}

function buildVersionTree(version: CurriculumTreeVersion): CurriculumTreeVersion {
  return {
    ...version,
    classes: [...version.classes]
      .map((curriculumClass) => ({
        ...curriculumClass,
        subjects: [...curriculumClass.subjects]
          .filter((subject) => !subject.archivedAt)
          .map((subject) => ({
            ...subject,
            chapters: [...subject.chapters]
              .filter((chapter) => !chapter.archivedAt)
              .map((chapter) => ({
                ...chapter,
                topics: [...chapter.topics].filter((topic) => !topic.archivedAt),
              }))
              .sort((left, right) => left.sequence - right.sequence),
          }))
          .sort((left, right) => left.sequence - right.sequence),
      }))
      .sort((left, right) => left.sequence - right.sequence),
  };
}

export async function loadCurriculumVersionTree(versionId: string): Promise<CurriculumTreeVersion | null> {
  const version = await prisma.curriculumVersion.findUnique({
    where: { id: versionId },
    include: {
      board: true,
      classes: {
        include: {
          subjects: {
            include: {
              chapters: {
                include: {
                  topics: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!version) return null;
  return buildVersionTree({
    ...version,
    sourceReferences: version.sourceReferences ?? null,
  });
}

export async function loadPublishedCurriculumCatalog(): Promise<CurriculumTreeVersion[]> {
  const versions = await prisma.curriculumVersion.findMany({
    where: { status: "PUBLISHED" },
    include: {
      board: true,
      classes: {
        include: {
          subjects: {
            include: {
              chapters: {
                include: {
                  topics: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return versions
    .sort((left, right) =>
      left.board.code.localeCompare(right.board.code) ||
      left.academicYear.localeCompare(right.academicYear) ||
      left.version.localeCompare(right.version),
    )
    .map((version) => buildVersionTree(version));
}

export async function loadCurriculumList(): Promise<CurriculumVersionSummary[]> {
  const versions = await prisma.curriculumVersion.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: {
      board: true,
      classes: {
        include: {
          subjects: {
            include: {
              chapters: {
                include: {
                  topics: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return versions.map((version) => {
    const tree = buildVersionTree(version);
    const counts = summarizeTree(tree);
    return {
      ...tree,
      counts,
    };
  });
}

export function summarizeTree(version: CurriculumTreeVersion) {
  let classes = 0;
  let subjects = 0;
  let chapters = 0;
  let topics = 0;

  for (const curriculumClass of version.classes) {
    classes += 1;
    subjects += curriculumClass.subjects.length;
    for (const subject of curriculumClass.subjects) {
      chapters += subject.chapters.length;
      for (const chapter of subject.chapters) {
        topics += chapter.topics.length;
      }
    }
  }

  return { classes, subjects, chapters, topics };
}
