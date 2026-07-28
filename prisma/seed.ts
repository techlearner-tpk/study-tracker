import {
  PrismaClient,
  LearningStatus,
  HabitGoalMetric,
  OutcomeGoalType,
  OnlineTestDifficulty,
  OnlineTestQuestionType,
  SubscriptionStatus,
  TestTemplateStatus,
} from "@prisma/client";
import { resolveSubjectColor } from "@/lib/subject-colors";

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
const parentName = process.env.ADMIN_NAME ?? "Parent";
const placeholderPasswordHash = "clerk-managed-account";

const children = [
  { name: "Tisha", className: "8", school: "Sanskriti Public School", themeColor: "#4f766a" },
  { name: "Aarav", className: "5", school: "Sanskriti Public School", themeColor: "#5b6f95" },
];

async function seedParent() {
  const parent = await prisma.user.upsert({
    where: { email: parentEmail },
    update: {
      name: parentName,
      role: "PARENT",
      verifiedAt: new Date(),
    },
    create: {
      email: parentEmail,
      name: parentName,
      role: "PARENT",
      verifiedAt: new Date(),
      passwordHash: placeholderPasswordHash,
    },
  });

  await prisma.subscription.upsert({
    where: { parentId: parent.id },
    update: {
      status: SubscriptionStatus.ACTIVE,
      startsAt: new Date(),
      expiresAt: null,
    },
    create: {
      parentId: parent.id,
      status: SubscriptionStatus.ACTIVE,
      startsAt: new Date(),
    },
  });

  await prisma.aiSetting.upsert({
    where: { id: 1 },
    update: {
      topicPromptLimit: 5,
      testQuestionCount: 5,
      maxUserPromptLength: 500,
      testPaperMaxQuestions: 30,
      testPaperRetryCount: 2,
      evaluationReviewThreshold: 0.75,
      testAutosaveIntervalMs: 5000,
    },
    create: {
      id: 1,
      topicPromptLimit: 5,
      testQuestionCount: 5,
      maxUserPromptLength: 500,
      testPaperMaxQuestions: 30,
      testPaperRetryCount: 2,
      evaluationReviewThreshold: 0.75,
      testAutosaveIntervalMs: 5000,
    },
  });

  return parent;
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
      update: { color: resolveSubjectColor(subjectName) },
      create: { childId: created.id, name: subjectName, color: resolveSubjectColor(subjectName) },
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

  await prisma.user.upsert({
    where: { email: `${child.name.toLowerCase()}@studytracker.local` },
    update: {
      name: child.name,
      role: "KID",
      childId: created.id,
      verifiedAt: new Date(),
    },
    create: {
      email: `${child.name.toLowerCase()}@studytracker.local`,
      name: child.name,
      role: "KID",
      childId: created.id,
      verifiedAt: new Date(),
      passwordHash: placeholderPasswordHash,
    },
  });

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

async function seedTestTemplates(createdByUserId: string) {
  const templates = [
    {
      name: "Mathematics Quick Test",
      subjectName: "Mathematics",
      sectionName: "Mathematics",
      rules: [
        { questionType: OnlineTestQuestionType.MULTIPLE_CHOICE, questionCount: 2, marksPerQuestion: 1 },
        { questionType: OnlineTestQuestionType.SHORT_ANSWER, questionCount: 2, marksPerQuestion: 2 },
        { questionType: OnlineTestQuestionType.LONG_ANSWER, questionCount: 1, marksPerQuestion: 4 },
      ],
    },
    {
      name: "Science Quick Test",
      subjectName: "Science",
      sectionName: "Science",
      rules: [
        { questionType: OnlineTestQuestionType.MULTIPLE_CHOICE, questionCount: 2, marksPerQuestion: 1 },
        { questionType: OnlineTestQuestionType.SHORT_ANSWER, questionCount: 2, marksPerQuestion: 2 },
        { questionType: OnlineTestQuestionType.LONG_ANSWER, questionCount: 1, marksPerQuestion: 4 },
      ],
    },
    {
      name: "English Quick Test",
      subjectName: "English",
      sectionName: "English",
      rules: [
        { questionType: OnlineTestQuestionType.READING_COMPREHENSION, questionCount: 1, marksPerQuestion: 4 },
        { questionType: OnlineTestQuestionType.GRAMMAR, questionCount: 2, marksPerQuestion: 1 },
        { questionType: OnlineTestQuestionType.WRITING, questionCount: 1, marksPerQuestion: 4 },
      ],
    },
  ];

  for (const templateData of templates) {
    await prisma.testTemplate.create({
      data: {
        name: templateData.name,
        subjectName: templateData.subjectName,
        totalMarks: 10,
        durationMinutes: 20,
        difficulty: OnlineTestDifficulty.MIXED,
        status: TestTemplateStatus.ACTIVE,
        createdByUserId,
        sections: {
          create: {
            name: templateData.sectionName,
            order: 0,
            rules: {
              create: templateData.rules.map((rule, index) => ({
                ...rule,
                difficulty: OnlineTestDifficulty.MEDIUM,
                order: index,
              })),
            },
          },
        },
      },
    });
  }
}

async function main() {
  await prisma.onlineTestAnswer.deleteMany();
  await prisma.onlineTestAttempt.deleteMany();
  await prisma.onlineTestQuestion.deleteMany();
  await prisma.onlineTestSection.deleteMany();
  await prisma.onlineTestPaperTopic.deleteMany();
  await prisma.aiTopicUsageReservation.deleteMany();
  await prisma.onlineTestPaper.deleteMany();
  await prisma.testTemplateRule.deleteMany();
  await prisma.testTemplateSection.deleteMany();
  await prisma.testTemplate.deleteMany();
  await prisma.aiLearningMessage.deleteMany();
  await prisma.aiTestAttempt.deleteMany();
  await prisma.aiLearningSession.deleteMany();
  await prisma.aiTopicUsage.deleteMany();
  await prisma.aiRequestLog.deleteMany();
  await prisma.revisionSession.deleteMany();
  await prisma.practiceSession.deleteMany();
  await prisma.studySession.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.outcomeGoal.deleteMany();
  await prisma.habitGoal.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.child.deleteMany();
  await prisma.user.deleteMany();

  const parent = await seedParent();
  await seedTestTemplates(parent.id);
  const shouldSeedDemoData = process.env.SEED_DEMO_DATA === "true" || process.env.NODE_ENV !== "production";
  if (shouldSeedDemoData) {
    for (const child of children) {
      await seedChild(parent.id, child);
    }
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
