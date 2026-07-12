/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, expect, it } from "vitest";
import { curriculumSeedSchema } from "@/features/curriculum/schema";
import { importCurriculumSeed, parseCurriculumSeedText, snapshotCurriculumToChild } from "@/features/curriculum/service";

function createMinimalSeed() {
  return curriculumSeedSchema.parse({
    schemaVersion: "1.0",
    seedId: "cbse-mini",
    board: {
      code: "CBSE",
      name: "Central Board of Secondary Education",
    },
    curriculumVersion: {
      academicYear: "2026-27",
      version: "1.0",
      name: "Mini CBSE",
      status: "DRAFT",
      verificationStatus: "REVIEW_REQUIRED",
      notes: ["Draft"],
      sources: [{ name: "NCERT", url: "https://example.com/ncert" }],
    },
    classes: [
      {
        level: 5,
        name: "Class 5",
        sequence: 1,
        stableKey: "class-5",
        subjects: [
          {
            stableKey: "math",
            name: "Mathematics",
            sequence: 1,
            isDefaultSelected: true,
            isOptional: false,
            isLanguageSubject: false,
            verificationStatus: "VERIFIED_FROM_OFFICIAL_SOURCE",
            chapters: [
              {
                stableKey: "fractions",
                name: "Fractions",
                sequence: 1,
                verificationStatus: "VERIFIED_FROM_OFFICIAL_SOURCE",
                topics: [
                  {
                    stableKey: "equivalent-fractions",
                    name: "Equivalent fractions",
                    sequence: 1,
                    verificationStatus: "VERIFIED_FROM_OFFICIAL_SOURCE",
                  },
                ],
              },
            ],
          },
          {
            stableKey: "english",
            name: "English",
            sequence: 2,
            isDefaultSelected: false,
            isOptional: true,
            isLanguageSubject: true,
            verificationStatus: "CURATED_FROM_OFFICIAL_SOURCE",
            chapters: [
              {
                stableKey: "reading",
                name: "Reading",
                sequence: 1,
                verificationStatus: "CURATED_FROM_OFFICIAL_SOURCE",
                topics: [
                  {
                    stableKey: "main-idea",
                    name: "Main idea",
                    sequence: 1,
                    verificationStatus: "CURATED_FROM_OFFICIAL_SOURCE",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });
}

function createMemoryDb() {
  const state = {
    boards: [] as Array<{ id: string; code: string; name: string }>,
    versions: [] as Array<any>,
    classes: [] as Array<any>,
    subjects: [] as Array<any>,
    chapters: [] as Array<any>,
    topics: [] as Array<any>,
  };

  let counter = 0;
  const nextId = (prefix: string) => `${prefix}_${++counter}`;

  const findBy = <T extends Record<string, any>>(records: T[], where: Record<string, any>) =>
    records.find((record) => Object.entries(where).every(([key, value]) => record[key] === value));

  return {
    curriculumBoard: {
      findUnique: async ({ where }: { where: { code: string } }) => findBy(state.boards, where) ?? null,
      create: async ({ data }: { data: { code: string; name: string } }) => {
        const record = { id: nextId("board"), ...data };
        state.boards.push(record);
        return record;
      },
      update: async ({ where, data }: { where: { id: string }; data: { name: string } }) => {
        const record = findBy(state.boards, where);
        if (!record) throw new Error("missing board");
        Object.assign(record, data);
        return record;
      },
    },
    curriculumVersion: {
      findFirst: async ({ where }: { where: { boardId: string; academicYear: string; version: string } }) =>
        findBy(state.versions, where) ?? null,
      create: async ({ data }: { data: any }) => {
        const record = { id: nextId("version"), ...data };
        state.versions.push(record);
        return record;
      },
      update: async ({ where, data }: { where: { id: string }; data: any }) => {
        const record = findBy(state.versions, where);
        if (!record) throw new Error("missing version");
        Object.assign(record, data);
        return record;
      },
    },
    curriculumClass: {
      findFirst: async ({ where }: { where: { versionId: string; stableKey: string } }) =>
        findBy(state.classes, where) ?? null,
      create: async ({ data }: { data: any }) => {
        const record = { id: nextId("class"), ...data };
        state.classes.push(record);
        return record;
      },
      update: async ({ where, data }: { where: { id: string }; data: any }) => {
        const record = findBy(state.classes, where);
        if (!record) throw new Error("missing class");
        Object.assign(record, data);
        return record;
      },
    },
    curriculumSubject: {
      findFirst: async ({ where }: { where: { classId: string; stableKey: string } }) =>
        findBy(state.subjects, where) ?? null,
      create: async ({ data }: { data: any }) => {
        const record = { id: nextId("subject"), ...data };
        state.subjects.push(record);
        return record;
      },
      update: async ({ where, data }: { where: { id: string }; data: any }) => {
        const record = findBy(state.subjects, where);
        if (!record) throw new Error("missing subject");
        Object.assign(record, data);
        return record;
      },
    },
    curriculumChapter: {
      findFirst: async ({ where }: { where: { subjectId: string; stableKey: string } }) =>
        findBy(state.chapters, where) ?? null,
      create: async ({ data }: { data: any }) => {
        const record = { id: nextId("chapter"), ...data };
        state.chapters.push(record);
        return record;
      },
      update: async ({ where, data }: { where: { id: string }; data: any }) => {
        const record = findBy(state.chapters, where);
        if (!record) throw new Error("missing chapter");
        Object.assign(record, data);
        return record;
      },
    },
    curriculumTopic: {
      findFirst: async ({ where }: { where: { chapterId: string; stableKey: string } }) =>
        findBy(state.topics, where) ?? null,
      create: async ({ data }: { data: any }) => {
        const record = { id: nextId("topic"), ...data };
        state.topics.push(record);
        return record;
      },
      update: async ({ where, data }: { where: { id: string }; data: any }) => {
        const record = findBy(state.topics, where);
        if (!record) throw new Error("missing topic");
        Object.assign(record, data);
        return record;
      },
    },
    state,
  };
}

function createSnapshotTx() {
  const calls = {
    assignment: [] as any[],
    subject: [] as any[],
    chapter: [] as any[],
    topic: [] as any[],
  };

  const tx: any = {
    curriculumVersion: {
      findUnique: async () => ({
        id: "version_1",
        status: "PUBLISHED",
        board: { id: "board_1", code: "CBSE", name: "Central Board" },
        classes: [
          {
            id: "class_1",
            level: 5,
            name: "Class 5",
            stableKey: "class-5",
            sequence: 1,
            subjects: [
              {
                id: "subject_math",
                stableKey: "math",
                name: "Mathematics",
                sequence: 1,
                isDefaultSelected: true,
                isOptional: false,
                isLanguageSubject: false,
                sourceUrl: null,
                verificationStatus: "VERIFIED_FROM_OFFICIAL_SOURCE",
                archivedAt: null,
                chapters: [
                  {
                    id: "chapter_math_fractions",
                    stableKey: "fractions",
                    name: "Fractions",
                    sequence: 1,
                    sourceUrl: null,
                    verificationStatus: "VERIFIED_FROM_OFFICIAL_SOURCE",
                    archivedAt: null,
                    topics: [
                      {
                        id: "topic_equivalent",
                        stableKey: "equivalent-fractions",
                        name: "Equivalent fractions",
                        sequence: 1,
                        sourceUrl: null,
                        verificationStatus: "VERIFIED_FROM_OFFICIAL_SOURCE",
                        archivedAt: null,
                      },
                    ],
                  },
                ],
              },
              {
                id: "subject_english",
                stableKey: "english",
                name: "English",
                sequence: 2,
                isDefaultSelected: false,
                isOptional: true,
                isLanguageSubject: true,
                sourceUrl: null,
                verificationStatus: "CURATED_FROM_OFFICIAL_SOURCE",
                archivedAt: null,
                chapters: [
                  {
                    id: "chapter_english",
                    stableKey: "reading",
                    name: "Reading",
                    sequence: 1,
                    sourceUrl: null,
                    verificationStatus: "CURATED_FROM_OFFICIAL_SOURCE",
                    archivedAt: null,
                    topics: [
                      {
                        id: "topic_main_idea",
                        stableKey: "main-idea",
                        name: "Main idea",
                        sequence: 1,
                        sourceUrl: null,
                        verificationStatus: "CURATED_FROM_OFFICIAL_SOURCE",
                        archivedAt: null,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
    },
    curriculumAssignment: {
      create: async ({ data }: any) => {
        calls.assignment.push(data);
        return { id: "assignment_1", ...data };
      },
    },
    subject: {
      createMany: async ({ data }: any) => {
        calls.subject.push(...data);
        return { count: data.length };
      },
    },
    chapter: {
      createMany: async ({ data }: any) => {
        calls.chapter.push(...data);
        return { count: data.length };
      },
    },
    topic: {
      createMany: async ({ data }: any) => {
        calls.topic.push(...data);
        return { count: data.length };
      },
    },
  };

  return { tx, calls };
}

describe("curriculum service", () => {
  it("validates the seed schema", () => {
    const seed = createMinimalSeed();
    expect(seed.board.code).toBe("CBSE");
    expect(seed.classes[0].subjects[0].chapters[0].topics[0].name).toBe("Equivalent fractions");
  });

  it("rejects duplicate keys in CSV imports", () => {
    const csv = [
      "boardCode,academicYear,classLevel,subjectName,subjectStableKey,defaultSelected,optional,verificationStatus,chapterSequence,chapterName,chapterStableKey,topicSequence,topicName,topicStableKey",
      "CBSE,2026-27,5,Mathematics,math,true,false,VERIFIED_FROM_OFFICIAL_SOURCE,1,Fractions,fractions,1,Equivalent fractions,eq-fractions",
      "CBSE,2026-27,5,Mathematics,math,true,false,VERIFIED_FROM_OFFICIAL_SOURCE,1,Fractions,fractions,1,Equivalent fractions revised,eq-fractions",
    ].join("\n");

    expect(() => parseCurriculumSeedText(csv, "cbse-2026-27-detailed.seed.csv")).toThrow(/Conflicting duplicate topic/i);
  });

  it("imports a curriculum idempotently", async () => {
    const db = createMemoryDb();
    const seed = createMinimalSeed();

    const first = await importCurriculumSeed(db as any, seed, { dryRun: false });
    const second = await importCurriculumSeed(db as any, seed, { dryRun: false });

    expect(first.inserted).toBeGreaterThan(0);
    expect(second.inserted).toBe(0);
    expect(second.updated).toBe(0);
    expect(second.skipped).toBeGreaterThan(0);
    expect(db.state.boards).toHaveLength(1);
    expect(db.state.versions).toHaveLength(1);
    expect(db.state.classes).toHaveLength(1);
    expect(db.state.subjects).toHaveLength(2);
    expect(db.state.chapters).toHaveLength(2);
    expect(db.state.topics).toHaveLength(2);
  });

  it("snapshots only selected subjects into the child tree", async () => {
    const { tx, calls } = createSnapshotTx();
    const assignment = await snapshotCurriculumToChild(tx, {
      childId: "child_1",
      curriculumVersionId: "version_1",
      curriculumClassId: "class_1",
      selectedSubjectIds: ["subject_english"],
    });

    expect(assignment.childId).toBe("child_1");
    expect(calls.assignment[0].selectedSubjectIds).toEqual(["subject_english"]);
    expect(calls.subject).toHaveLength(1);
    expect(calls.subject[0].name).toBe("English");
    expect(calls.chapter).toHaveLength(1);
    expect(calls.topic).toHaveLength(1);
    expect(calls.topic[0].curriculumTopicId).toBe("topic_main_idea");
    expect(calls.topic[0].name).toBe("Main idea");
  });

  it("keeps the snapshot independent from later source edits", async () => {
    const { tx, calls } = createSnapshotTx();
    const version = await tx.curriculumVersion.findUnique();
    version.classes[0].subjects[0].name = "Mathematics (Edited Later)";

    await snapshotCurriculumToChild(tx, {
      childId: "child_1",
      curriculumVersionId: "version_1",
      curriculumClassId: "class_1",
      selectedSubjectIds: ["subject_math"],
    });

    expect(calls.subject[0].name).toBe("Mathematics");
    expect(calls.chapter[0].name).toBe("Fractions");
    expect(calls.topic[0].name).toBe("Equivalent fractions");
  });
});
