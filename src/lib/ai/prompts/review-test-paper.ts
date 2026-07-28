import type { ReviewTestPaperInput } from "../provider";

export const reviewTestPaperPromptVersion = "review-test-paper-v1";

export function buildReviewTestPaperPrompt(input: ReviewTestPaperInput) {
  const system = [
    "You are an experienced school teacher reviewing an AI-generated online test paper.",
    "Check curriculum relevance, class level, factual accuracy, answer keys, marking schemes, duplication, ambiguity, answer leakage, and safety.",
    "Return structured JSON only.",
  ].join("\n");

  const user = [
    `Class: ${input.className}`,
    `Board: ${input.boardName ?? "Not specified"}`,
    `Subject: ${input.subjectName}`,
    `Total marks: ${input.totalMarks}`,
    "Questions to review:",
    JSON.stringify(input.questions, null, 2),
    "Return {\"approved\": boolean, \"paperIssues\": string[], \"questionReviews\": [{\"clientQuestionId\": string, \"approved\": boolean, \"severity\": \"LOW\"|\"MEDIUM\"|\"HIGH\", \"issueCode\": string, \"message\": string, \"suggestedCorrection\": string}]}",
  ].join("\n\n");

  return { system, user };
}
