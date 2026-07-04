import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function getOwnedChild(userId: string, childId: string) {
  const child = await prisma.child.findFirst({
    where: { id: childId, userId },
    include: {
      subjects: {
        include: {
          chapters: {
            include: {
              topics: {
                include: {
                  studySessions: true,
                  practiceSessions: true,
                  revisionSessions: true,
                },
              },
            },
          },
        },
      },
      habitGoals: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
      outcomeGoals: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!child) notFound();
  return child;
}

export async function getOwnedSubject(userId: string, subjectId: string) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, child: { userId } },
    include: { child: true },
  });

  if (!subject) notFound();
  return subject;
}

export async function getOwnedChapter(userId: string, chapterId: string) {
  const chapter = await prisma.chapter.findFirst({
    where: { id: chapterId, subject: { child: { userId } } },
    include: { subject: { include: { child: true } } },
  });

  if (!chapter) notFound();
  return chapter;
}

export async function getOwnedTopic(userId: string, topicId: string) {
  const topic = await prisma.topic.findFirst({
    where: { id: topicId, chapter: { subject: { child: { userId } } } },
    include: {
      chapter: { include: { subject: { include: { child: true } } } },
      studySessions: { orderBy: { startTime: "desc" } },
      practiceSessions: { orderBy: { date: "desc" } },
      revisionSessions: { orderBy: { date: "desc" } },
    },
  });

  if (!topic) notFound();
  return topic;
}
