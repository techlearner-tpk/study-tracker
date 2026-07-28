import { describe, expect, it } from "vitest";
import { OnlineTestDifficulty, OnlineTestQuestionType, TestTemplateStatus } from "@prisma/client";
import { onlineTestSectionGenerationSchema } from "@/features/ai/schema";
import { allowedQuestionTypesForSubject, validateTemplateTotals } from "@/features/test-papers/rules";
import { buildGenerateTestPaperSectionPrompt } from "@/lib/ai/prompts/generate-test-paper-section";

function templateFixture(overrides: Partial<Parameters<typeof validateTemplateTotals>[0]> = {}) {
  return {
    id: "template_1",
    name: "Mathematics Quick Test",
    boardId: null,
    classId: null,
    subjectId: null,
    subjectName: "Mathematics",
    totalMarks: 10,
    durationMinutes: 20,
    difficulty: OnlineTestDifficulty.MIXED,
    status: TestTemplateStatus.DRAFT,
    createdByUserId: "user_1",
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    sections: [
      {
        id: "section_1",
        templateId: "template_1",
        name: "Section A",
        instructions: null,
        order: 0,
        createdAt: new Date("2026-07-01T00:00:00.000Z"),
        updatedAt: new Date("2026-07-01T00:00:00.000Z"),
        rules: [
          {
            id: "rule_1",
            sectionId: "section_1",
            questionType: OnlineTestQuestionType.MULTIPLE_CHOICE,
            marksPerQuestion: 1,
            questionCount: 2,
            difficulty: OnlineTestDifficulty.MEDIUM,
            internalChoiceCount: 0,
            order: 0,
            createdAt: new Date("2026-07-01T00:00:00.000Z"),
            updatedAt: new Date("2026-07-01T00:00:00.000Z"),
          },
          {
            id: "rule_2",
            sectionId: "section_1",
            questionType: OnlineTestQuestionType.SHORT_ANSWER,
            marksPerQuestion: 4,
            questionCount: 2,
            difficulty: OnlineTestDifficulty.MEDIUM,
            internalChoiceCount: 0,
            order: 1,
            createdAt: new Date("2026-07-01T00:00:00.000Z"),
            updatedAt: new Date("2026-07-01T00:00:00.000Z"),
          },
        ],
      },
    ],
    ...overrides,
  } as Parameters<typeof validateTemplateTotals>[0];
}

describe("online test papers", () => {
  it("validates an active template total before generation", () => {
    expect(validateTemplateTotals(templateFixture())).toBe(10);
  });

  it("rejects invalid template totals", () => {
    expect(() => validateTemplateTotals(templateFixture({ totalMarks: 12 }))).toThrow(/add up to 10 marks/i);
  });

  it("restricts question types by subject", () => {
    expect(allowedQuestionTypesForSubject("Mathematics").has(OnlineTestQuestionType.WRITING)).toBe(false);
    expect(allowedQuestionTypesForSubject("English").has(OnlineTestQuestionType.WRITING)).toBe(true);
  });

  it("validates structured AI section output", () => {
    const parsed = onlineTestSectionGenerationSchema.parse({
      questions: [
        {
          clientQuestionId: "section-rule-1",
          subject: "Mathematics",
          chapterId: "chapter_1",
          topicId: "topic_1",
          questionType: "MULTIPLE_CHOICE",
          questionText: "What is 2 + 2?",
          options: ["3", "4", "5", "6"],
          marks: 1,
          difficulty: "MEDIUM",
          correctAnswer: "4",
          markingScheme: [{ criterion: "Selects 4", marks: 1 }],
          explanation: "2 + 2 equals 4.",
        },
      ],
    });

    expect(parsed.questions[0].clientQuestionId).toBe("section-rule-1");
  });

  it("instructs AI test generation to return markingScheme as an array", () => {
    const prompt = buildGenerateTestPaperSectionPrompt({
      sectionName: "Section A",
      slots: [
        {
          clientQuestionId: "section-rule-1",
          subject: "Mathematics",
          className: "Class 8",
          boardName: "CBSE",
          chapterId: "chapter_1",
          chapterName: "Geometry",
          topicId: "topic_1",
          topicName: "Polygons",
          questionType: "SHORT_ANSWER",
          marks: 2,
          difficulty: "MEDIUM",
        },
      ],
    });

    expect(prompt.system).toContain("markingScheme must be a JSON array");
    expect(prompt.system).toContain("Never return markingScheme as a string");
    expect(prompt.user).toContain("[{\"criterion\"");
    expect(prompt.user).toContain("Do not wrap markingScheme in quotes");
  });
});
