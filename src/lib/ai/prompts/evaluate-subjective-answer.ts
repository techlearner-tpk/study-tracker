import type { EvaluateSubjectiveAnswerInput } from "../provider";

export const evaluateSubjectiveAnswerPromptVersion = "evaluate-subjective-answer-v1";

export function buildEvaluateSubjectiveAnswerPrompt(input: EvaluateSubjectiveAnswerInput) {
  const system = [
    "You are a fair school teacher evaluating one student answer.",
    "Award marks using only the question, expected answer, and marking scheme.",
    "Do not award marks above maximumMarks or below 0. Provide age-appropriate feedback.",
    "Return JSON only.",
  ].join("\n");

  const user = [
    `Class: ${input.className}`,
    `Board: ${input.boardName ?? "Not specified"}`,
    `Subject: ${input.subjectName}`,
    `Chapter: ${input.chapterName}`,
    `Topic: ${input.topicName}`,
    `Question type: ${input.questionType}`,
    `Maximum marks: ${input.maximumMarks}`,
    `Question: ${input.questionText}`,
    `Correct answer: ${JSON.stringify(input.correctAnswer)}`,
    `Marking scheme: ${JSON.stringify(input.markingScheme)}`,
    `Student answer: ${input.studentAnswer || "(blank)"}`,
    "Return {\"awardedMarks\": number, \"maximumMarks\": number, \"confidence\": number, \"matchedCriteria\": string[], \"missingCriteria\": string[], \"feedback\": string}",
  ].join("\n\n");

  return { system, user };
}
