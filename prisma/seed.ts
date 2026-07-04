import { PrismaClient, LearningStatus, HabitGoalMetric, OutcomeGoalType } from "@prisma/client";
import { hashPassword } from "../src/lib/security";

const prisma = new PrismaClient();

const defaultSubjects = [
  "Marathi",
  "Hindi",
  "English",
  "Mathematics",
  "Science",
  "Social Science",
];

const parentEmail = process.env.ADMIN_EMAIL ?? "parent@studytracker.local";
const parentPassword = process.env.ADMIN_PASSWORD ?? "studytracker123";
const parentName = process.env.ADMIN_NAME ?? "Parent";

const children = [
  { name: "Tisha", className: "8", school: "Sanskriti Public School", themeColor: "#4f766a" },
  { name: "Aarav", className: "5", school: "Sanskriti Public School", themeColor: "#5b6f95" },
];

async function seedParent() {
  return prisma.user.upsert({
    where: { email: parentEmail },
    update: {
      name: parentName,
      passwordHash: hashPassword(parentPassword),
      role: "PARENT",
    },
    create: {
      email: parentEmail,
      name: parentName,
      passwordHash: hashPassword(parentPassword),
      role: "PARENT",
    },
  });
}

async function seedChild(userId: string, child: (typeof children)[number]) {
  const created = await prisma.child.upsert({
    where: { id: child.name.toLowerCase() },
    update: { ...child, userId },
    create: { id: child.name.toLowerCase(), userId, ...child },
  });

  for (const subjectName of defaultSubjects) {
    const subject = await prisma.subject.upsert({
      where: { childId_name: { childId: created.id, name: subjectName } },
      update: {},
      create: { childId: created.id, name: subjectName },
    });

    if (subjectName === "Mathematics" && child.name === "Tisha") {
      const chapter = await prisma.chapter.create({
        data: { subjectId: subject.id, name: "Chapter 1: Numbers", order: 1 },
      });
      await prisma.topic.createMany({
        data: [
          {
            chapterId: chapter.id,
            name: "Integers",
            description: "Positive and negative whole numbers.",
            status: LearningStatus.COMPLETED,
            confidenceRating: 4,
            notes: "Comfortable with ordering integers.",
            completedAt: new Date(),
          },
          {
            chapterId: chapter.id,
            name: "Rational Numbers",
            description: "Fractions and decimals on the number line.",
            status: LearningStatus.IN_PROGRESS,
            confidenceRating: 3,
            notes: "Needs more practice with simplification.",
          },
          {
            chapterId: chapter.id,
            name: "Absolute Value",
            status: LearningStatus.NOT_STARTED,
          },
        ],
      });
    }
  }

  await prisma.habitGoal.createMany({
    data: [
      {
        childId: created.id,
        title: "Study 30 minutes daily",
        metric: HabitGoalMetric.STUDY_MINUTES_DAILY,
        targetValue: 30,
      },
      {
        childId: created.id,
        title: "Study 5 days each week",
        metric: HabitGoalMetric.STUDY_DAYS_WEEKLY,
        targetValue: 5,
      },
    ],
    skipDuplicates: true,
  });

  const firstTopic = await prisma.topic.findFirst({
    where: { chapter: { subject: { childId: created.id, name: "Mathematics" } } },
  });

  if (firstTopic) {
    await prisma.outcomeGoal.create({
      data: {
        childId: created.id,
        title: "Complete Integers",
        type: OutcomeGoalType.COMPLETE_TOPIC,
        targetTopicId: firstTopic.id,
      },
    });
  }
}

async function main() {
  await prisma.user.deleteMany();
  await prisma.revisionSession.deleteMany();
  await prisma.practiceSession.deleteMany();
  await prisma.studySession.deleteMany();
  await prisma.outcomeGoal.deleteMany();
  await prisma.habitGoal.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.child.deleteMany();

  const parent = await seedParent();
  for (const child of children) {
    await seedChild(parent.id, child);
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
