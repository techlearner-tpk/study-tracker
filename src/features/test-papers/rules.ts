import { OnlineTestQuestionType } from "@prisma/client";

export const supportedTestPaperSubjects = ["Mathematics", "Science", "English"] as const;

const allowedTypesBySubject: Record<(typeof supportedTestPaperSubjects)[number], Set<OnlineTestQuestionType>> = {
  Mathematics: new Set([
    OnlineTestQuestionType.MULTIPLE_CHOICE,
    OnlineTestQuestionType.VERY_SHORT_ANSWER,
    OnlineTestQuestionType.SHORT_ANSWER,
    OnlineTestQuestionType.LONG_ANSWER,
    OnlineTestQuestionType.NUMERICAL,
    OnlineTestQuestionType.CASE_BASED,
  ]),
  Science: new Set([
    OnlineTestQuestionType.MULTIPLE_CHOICE,
    OnlineTestQuestionType.TRUE_FALSE,
    OnlineTestQuestionType.VERY_SHORT_ANSWER,
    OnlineTestQuestionType.SHORT_ANSWER,
    OnlineTestQuestionType.LONG_ANSWER,
    OnlineTestQuestionType.NUMERICAL,
    OnlineTestQuestionType.CASE_BASED,
    OnlineTestQuestionType.ASSERTION_REASON,
  ]),
  English: new Set([
    OnlineTestQuestionType.READING_COMPREHENSION,
    OnlineTestQuestionType.GRAMMAR,
    OnlineTestQuestionType.WRITING,
    OnlineTestQuestionType.VOCABULARY,
    OnlineTestQuestionType.MULTIPLE_CHOICE,
    OnlineTestQuestionType.SHORT_ANSWER,
    OnlineTestQuestionType.LONG_ANSWER,
  ]),
};

export function isSupportedTestPaperSubject(subjectName: string): subjectName is (typeof supportedTestPaperSubjects)[number] {
  return supportedTestPaperSubjects.includes(subjectName as (typeof supportedTestPaperSubjects)[number]);
}

export function allowedQuestionTypesForSubject(subjectName: string) {
  if (!isSupportedTestPaperSubject(subjectName)) return new Set<OnlineTestQuestionType>();
  return allowedTypesBySubject[subjectName];
}

export function validateTemplateTotals(template: {
  subjectName: string;
  totalMarks: number;
  sections: {
    order: number;
    rules: {
      questionType: OnlineTestQuestionType;
      questionCount: number;
      marksPerQuestion: number;
    }[];
  }[];
}) {
  if (!isSupportedTestPaperSubject(template.subjectName)) {
    throw new Error("Templates are supported only for Mathematics, Science, and English.");
  }
  if (!template.sections.length) throw new Error("Add at least one section before activation.");

  const allowedTypes = allowedQuestionTypesForSubject(template.subjectName);
  let total = 0;
  let ruleCount = 0;
  for (const section of template.sections) {
    if (section.order < 0) throw new Error("Section ordering must be valid.");
    for (const rule of section.rules) {
      ruleCount += 1;
      if (!allowedTypes.has(rule.questionType)) {
        throw new Error(`${rule.questionType.replaceAll("_", " ")} is not valid for ${template.subjectName}.`);
      }
      if (rule.questionCount <= 0 || rule.marksPerQuestion <= 0) {
        throw new Error("Every question rule needs positive question count and marks.");
      }
      total += rule.questionCount * rule.marksPerQuestion;
    }
  }
  if (!ruleCount) throw new Error("Add at least one question rule before activation.");
  if (total !== template.totalMarks) {
    throw new Error(`Template rules add up to ${total} marks, but total marks is ${template.totalMarks}.`);
  }
  return total;
}
