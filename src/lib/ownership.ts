import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type OwnedChild = Prisma.ChildGetPayload<{
  include: {
    kidUser: true;
    subjects: {
      include: {
        chapters: {
          include: {
            topics: {
              include: {
                studySessions: true;
                practiceSessions: true;
                revisionSessions: true;
              };
            };
          };
        };
      };
    };
    habitGoals: true;
    outcomeGoals: true;
  };
}>;

export async function getOwnedChild(userId: string, childId: string): Promise<OwnedChild> {
  const child = await prisma.child.findUnique({
    where: { id: childId },
    include: {
      kidUser: true,
      subjects: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: {
          chapters: {
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
            include: {
              topics: {
                orderBy: [{ order: "asc" }, { createdAt: "asc" }],
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

  if (!child || (child.userId !== userId && child.kidUser?.id !== userId)) notFound();
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
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: {
      chapter: { include: { subject: { include: { child: { include: { kidUser: true } } } } } },
      studySessions: { orderBy: { startTime: "desc" } },
      practiceSessions: { orderBy: { date: "desc" } },
      revisionSessions: { orderBy: { date: "desc" } },
    },
  });

  const child = topic?.chapter.subject.child;
  if (!topic || !child || (child.userId !== userId && child.kidUser?.id !== userId)) notFound();
  return topic;
}
