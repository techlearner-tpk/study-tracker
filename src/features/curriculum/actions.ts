"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, CurriculumStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireParentUser } from "@/lib/auth";
import { formDataToObject } from "@/lib/validations";
import {
  curriculumChapterFormSchema,
  curriculumClassFormSchema,
  curriculumImportFormSchema,
  curriculumSelectionSchema,
  curriculumSubjectFormSchema,
  curriculumTopicFormSchema,
  curriculumVersionFormSchema,
  normalizeStableKey,
} from "./schema";
import { importCurriculumSeed, loadCurriculumVersionTree, parseCurriculumSeedText, snapshotCurriculumToChild } from "./service";

async function requireEditableVersion(versionId: string) {
  const version = await prisma.curriculumVersion.findUnique({
    where: { id: versionId },
    include: { board: true },
  });
  if (!version) {
    throw new Error("Curriculum version not found");
  }
  if (version.status !== CurriculumStatus.DRAFT) {
    throw new Error("Published curricula must be cloned before editing");
  }
  return version;
}

function revalidateCurriculum(versionId: string) {
  revalidatePath("/admin/curriculum");
  revalidatePath(`/admin/curriculum/${versionId}`);
}

export async function saveCurriculumVersion(formData: FormData) {
  await requireParentUser();
  const data = curriculumVersionFormSchema.parse(formDataToObject(formData));

  const board = await prisma.curriculumBoard.upsert({
    where: { code: data.boardCode },
    update: { name: data.boardName },
    create: { code: data.boardCode, name: data.boardName },
  });

  if (data.id) {
    const version = await prisma.curriculumVersion.findUnique({ where: { id: data.id } });
    if (!version) throw new Error("Curriculum version not found");
    if (version.status !== CurriculumStatus.DRAFT) {
      throw new Error("Published curricula must be cloned before editing");
    }

    await prisma.curriculumVersion.update({
      where: { id: data.id },
      data: {
        boardId: board.id,
        academicYear: data.academicYear,
        version: data.version,
        name: data.name,
        sourceUrl: data.sourceUrl,
        notes: data.notes ?? null,
      },
    });
    revalidateCurriculum(data.id);
    return;
  }

  const version = await prisma.curriculumVersion.create({
    data: {
      boardId: board.id,
      academicYear: data.academicYear,
      version: data.version,
      name: data.name,
      sourceUrl: data.sourceUrl,
      notes: data.notes ?? null,
      status: CurriculumStatus.DRAFT,
    },
  });

  revalidatePath("/admin/curriculum");
  redirect(`/admin/curriculum/${version.id}`);
}

export async function publishCurriculumVersion(formData: FormData) {
  await requireParentUser();
  const id = String(formData.get("id") ?? "");
  const version = await requireEditableVersion(id);
  await prisma.curriculumVersion.update({
    where: { id },
    data: { status: CurriculumStatus.PUBLISHED, publishedAt: version.publishedAt ?? new Date() },
  });
  revalidateCurriculum(id);
}

export async function archiveCurriculumVersion(formData: FormData) {
  await requireParentUser();
  const id = String(formData.get("id") ?? "");
  await prisma.curriculumVersion.update({
    where: { id },
    data: { status: CurriculumStatus.ARCHIVED, archivedAt: new Date() },
  });
  revalidateCurriculum(id);
}

export async function cloneCurriculumVersion(formData: FormData) {
  await requireParentUser();
  const sourceVersionId = String(formData.get("id") ?? "");
  const source = await prisma.curriculumVersion.findUnique({
    where: { id: sourceVersionId },
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
  if (!source) throw new Error("Curriculum version not found");

  const clone = await prisma.$transaction(async (tx) => {
    const board = await tx.curriculumBoard.upsert({
      where: { code: source.board.code },
      update: { name: source.board.name },
      create: { code: source.board.code, name: source.board.name },
    });

    const version = await tx.curriculumVersion.create({
      data: {
        boardId: board.id,
        academicYear: source.academicYear,
        version: `${source.version}-copy`,
        name: `${source.name} (Copy)`,
        status: CurriculumStatus.DRAFT,
        verificationStatus: source.verificationStatus,
        sourceUrl: source.sourceUrl,
        notes: source.notes,
        sourceReferences: source.sourceReferences ?? Prisma.JsonNull,
      },
    });

    for (const curriculumClass of source.classes) {
      const classRecord = await tx.curriculumClass.create({
        data: {
          versionId: version.id,
          level: curriculumClass.level,
          name: curriculumClass.name,
          stableKey: curriculumClass.stableKey,
          sequence: curriculumClass.sequence,
        },
      });

      for (const subject of curriculumClass.subjects) {
        const subjectRecord = await tx.curriculumSubject.create({
          data: {
            classId: classRecord.id,
            stableKey: subject.stableKey,
            name: subject.name,
            sequence: subject.sequence,
            isDefaultSelected: subject.isDefaultSelected,
            isOptional: subject.isOptional,
            isLanguageSubject: subject.isLanguageSubject,
            sourceUrl: subject.sourceUrl,
            verificationStatus: subject.verificationStatus,
            archivedAt: subject.archivedAt,
          },
        });

        for (const chapter of subject.chapters) {
          const chapterRecord = await tx.curriculumChapter.create({
            data: {
              subjectId: subjectRecord.id,
              stableKey: chapter.stableKey,
              name: chapter.name,
              sequence: chapter.sequence,
              sourceUrl: chapter.sourceUrl,
              verificationStatus: chapter.verificationStatus,
              archivedAt: chapter.archivedAt,
            },
          });

          for (const topic of chapter.topics) {
            await tx.curriculumTopic.create({
              data: {
                chapterId: chapterRecord.id,
                stableKey: topic.stableKey,
                name: topic.name,
                sequence: topic.sequence,
                sourceUrl: topic.sourceUrl,
                verificationStatus: topic.verificationStatus,
                archivedAt: topic.archivedAt,
              },
            });
          }
        }
      }
    }

    return version;
  });

  revalidatePath("/admin/curriculum");
  redirect(`/admin/curriculum/${clone.id}`);
}

export async function saveCurriculumClass(formData: FormData) {
  await requireParentUser();
  const data = curriculumClassFormSchema.parse(formDataToObject(formData));
  const version = await requireEditableVersion(data.versionId);
  const stableKey = data.stableKey ?? `class-${data.level}`;

  if (data.id) {
    await prisma.curriculumClass.update({
      where: { id: data.id },
      data: {
        level: data.level,
        name: data.name,
        stableKey,
        sequence: data.sequence,
      },
    });
  } else {
    await prisma.curriculumClass.create({
      data: {
        versionId: version.id,
        level: data.level,
        name: data.name,
        stableKey,
        sequence: data.sequence,
      },
    });
  }
  revalidateCurriculum(version.id);
}

export async function saveCurriculumSubject(formData: FormData) {
  await requireParentUser();
  const data = curriculumSubjectFormSchema.parse(formDataToObject(formData));
  const chapterParent = await prisma.curriculumClass.findUnique({
    where: { id: data.classId },
    include: { version: true },
  });
  if (!chapterParent) throw new Error("Curriculum class not found");
  await requireEditableVersion(chapterParent.versionId);
  const stableKey = data.stableKey ?? data.name;

  if (data.id) {
    await prisma.curriculumSubject.update({
      where: { id: data.id },
      data: {
        name: data.name,
        stableKey,
        sequence: data.sequence,
        isDefaultSelected: data.isDefaultSelected,
        isOptional: data.isOptional,
        isLanguageSubject: data.isLanguageSubject,
        sourceUrl: data.sourceUrl,
        verificationStatus: data.verificationStatus,
      },
    });
  } else {
    await prisma.curriculumSubject.create({
      data: {
        classId: data.classId,
        stableKey,
        name: data.name,
        sequence: data.sequence,
        isDefaultSelected: data.isDefaultSelected,
        isOptional: data.isOptional,
        isLanguageSubject: data.isLanguageSubject,
        sourceUrl: data.sourceUrl,
        verificationStatus: data.verificationStatus,
      },
    });
  }
  revalidateCurriculum(chapterParent.versionId);
}

export async function saveCurriculumChapter(formData: FormData) {
  await requireParentUser();
  const data = curriculumChapterFormSchema.parse(formDataToObject(formData));
  const subject = await prisma.curriculumSubject.findUnique({
    where: { id: data.subjectId },
    include: {
      class: {
        include: { version: true },
      },
    },
  });
  if (!subject) throw new Error("Curriculum subject not found");
  await requireEditableVersion(subject.class.versionId);
  const stableKey = data.stableKey ?? data.name;

  if (data.bulkItems) {
    const names = data.bulkItems.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const baseStableKey = data.stableKey ?? normalizeStableKey(data.name);
    let sequence = data.sequence;
    for (const name of names) {
      sequence += 1;
      await prisma.curriculumChapter.create({
        data: {
          subjectId: data.subjectId,
          stableKey: `${baseStableKey}-${normalizeStableKey(name) || sequence}`,
          name,
          sequence,
          sourceUrl: data.sourceUrl,
          verificationStatus: data.verificationStatus,
        },
      });
    }
    revalidateCurriculum(subject.class.versionId);
    return;
  }

  if (data.id) {
    await prisma.curriculumChapter.update({
      where: { id: data.id },
      data: {
        name: data.name,
        stableKey,
        sequence: data.sequence,
        sourceUrl: data.sourceUrl,
        verificationStatus: data.verificationStatus,
      },
    });
  } else {
    await prisma.curriculumChapter.create({
      data: {
        subjectId: data.subjectId,
        stableKey,
        name: data.name,
        sequence: data.sequence,
        sourceUrl: data.sourceUrl,
        verificationStatus: data.verificationStatus,
      },
    });
  }
  revalidateCurriculum(subject.class.versionId);
}

export async function saveCurriculumTopic(formData: FormData) {
  await requireParentUser();
  const data = curriculumTopicFormSchema.parse(formDataToObject(formData));
  const chapter = await prisma.curriculumChapter.findUnique({
    where: { id: data.chapterId },
    include: {
      subject: {
        include: {
          class: { include: { version: true } },
        },
      },
    },
  });
  if (!chapter) throw new Error("Curriculum chapter not found");
  await requireEditableVersion(chapter.subject.class.versionId);
  const stableKey = data.stableKey ?? data.name;

  if (data.bulkItems) {
    const names = data.bulkItems.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const baseStableKey = data.stableKey ?? normalizeStableKey(data.name);
    let sequence = data.sequence;
    for (const name of names) {
      sequence += 1;
      await prisma.curriculumTopic.create({
        data: {
          chapterId: data.chapterId,
          stableKey: `${baseStableKey}-${normalizeStableKey(name) || sequence}`,
          name,
          sequence,
          sourceUrl: data.sourceUrl,
          verificationStatus: data.verificationStatus,
        },
      });
    }
    revalidateCurriculum(chapter.subject.class.versionId);
    return;
  }

  if (data.id) {
    await prisma.curriculumTopic.update({
      where: { id: data.id },
      data: {
        name: data.name,
        stableKey,
        sequence: data.sequence,
        sourceUrl: data.sourceUrl,
        verificationStatus: data.verificationStatus,
      },
    });
  } else {
    await prisma.curriculumTopic.create({
      data: {
        chapterId: data.chapterId,
        stableKey,
        name: data.name,
        sequence: data.sequence,
        sourceUrl: data.sourceUrl,
        verificationStatus: data.verificationStatus,
      },
    });
  }
  revalidateCurriculum(chapter.subject.class.versionId);
}

export async function archiveCurriculumSubject(formData: FormData) {
  await requireParentUser();
  const id = String(formData.get("id") ?? "");
  const subject = await prisma.curriculumSubject.findUnique({
    where: { id },
    include: { class: { include: { version: true } } },
  });
  if (!subject) throw new Error("Curriculum subject not found");
  await requireEditableVersion(subject.class.versionId);
  await prisma.curriculumSubject.update({ where: { id }, data: { archivedAt: new Date() } });
  revalidateCurriculum(subject.class.versionId);
}

export async function archiveCurriculumChapter(formData: FormData) {
  await requireParentUser();
  const id = String(formData.get("id") ?? "");
  const chapter = await prisma.curriculumChapter.findUnique({
    where: { id },
    include: { subject: { include: { class: { include: { version: true } } } } },
  });
  if (!chapter) throw new Error("Curriculum chapter not found");
  await requireEditableVersion(chapter.subject.class.versionId);
  await prisma.curriculumChapter.update({ where: { id }, data: { archivedAt: new Date() } });
  revalidateCurriculum(chapter.subject.class.versionId);
}

export async function archiveCurriculumTopic(formData: FormData) {
  await requireParentUser();
  const id = String(formData.get("id") ?? "");
  const topic = await prisma.curriculumTopic.findUnique({
    where: { id },
    include: { chapter: { include: { subject: { include: { class: { include: { version: true } } } } } } },
  });
  if (!topic) throw new Error("Curriculum topic not found");
  await requireEditableVersion(topic.chapter.subject.class.versionId);
  await prisma.curriculumTopic.update({ where: { id }, data: { archivedAt: new Date() } });
  revalidateCurriculum(topic.chapter.subject.class.versionId);
}

export async function importCurriculumFromForm(formData: FormData) {
  await requireParentUser();
  const file = formData.get("file");
  const parsed = curriculumImportFormSchema.parse({
    dryRun: formData.get("dryRun") === "on" || formData.get("dryRun") === "true",
  });
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a JSON or CSV file");
  }
  const seed = parseCurriculumSeedText(await file.text(), file.name);
  return importCurriculumSeed(prisma, seed, { dryRun: parsed.dryRun });
}

export async function importCurriculumAction(
  _: import("@/features/curriculum/service").CurriculumImportResult | null,
  formData: FormData,
) {
  return importCurriculumFromForm(formData);
}

export async function applyCurriculumToChild(formData: FormData) {
  await requireParentUser();
  const data = curriculumSelectionSchema.parse({
    curriculumVersionId: String(formData.get("curriculumVersionId") ?? ""),
    curriculumClassId: String(formData.get("curriculumClassId") ?? ""),
    selectedSubjectIds: formData.getAll("selectedSubjectIds").map(String),
  });
  const curriculumVersion = await loadCurriculumVersionTree(data.curriculumVersionId);
  if (!curriculumVersion) {
    throw new Error("Choose a published curriculum version");
  }

  await prisma.$transaction(async (tx) => {
    const childId = String(formData.get("childId") ?? "");
    await snapshotCurriculumToChild(tx, {
      childId,
      curriculumVersionId: data.curriculumVersionId,
      curriculumClassId: data.curriculumClassId,
      selectedSubjectIds: data.selectedSubjectIds,
    }, curriculumVersion);
  });

  revalidatePath("/");
  if (formData.get("redirectToChild") === "true") {
    redirect(`/children/${formData.get("childId")}`);
  }
}
