import type { ReviewTestPaperInput } from "../provider";

export const reviewTestPaperPromptVersion = "review-test-paper-v3";

const issueCodes = [
  "OUT_OF_SYLLABUS",
  "WRONG_CLASS_LEVEL",
  "WRONG_TOPIC",
  "INCORRECT_ANSWER",
  "INVALID_MARKING_SCHEME",
  "AMBIGUOUS_QUESTION",
  "DUPLICATE_QUESTION",
  "ANSWER_LEAKAGE",
  "DIFFICULTY_MISMATCH",
  "MARKS_MISMATCH",
  "LANGUAGE_QUALITY",
  "UNSAFE_CONTENT",
];

export function buildReviewTestPaperPrompt(input: ReviewTestPaperInput) {
  const system = [
    "You are an experienced school teacher reviewing an AI-generated online test paper.",
    "Check curriculum relevance, class level, factual accuracy, answer keys, marking schemes, duplication, ambiguity, answer leakage, and safety.",
    "Reject a question only for a substantive issue that would make the test incorrect, unfair, unsafe, out of scope, or materially inconsistent with its assigned marks or difficulty.",
    "Do not reject for harmless wording preferences, optional refinements, or another valid way to express a correct answer.",
    "Return exactly one questionReviews entry for every supplied clientQuestionId and do not invent IDs.",
    "Set approved=true for the paper exactly when every question is approved and there is no paper-level blocking issue.",
    `If a question is not approved, issueCode must be exactly one of: ${issueCodes.join(", ")}.`,
    "If a question is approved, omit severity, issueCode, message, and suggestedCorrection for that question.",
    "Never use issueCode values such as NONE, OK, VALID, APPROVED, or NO_ISSUE.",
    "Return structured JSON only.",
  ].join("\n");

  const user = [
    `Class: ${input.className}`,
    `Board: ${input.boardName ?? "Not specified"}`,
    `Subject: ${input.subjectName}`,
    `Total marks: ${input.totalMarks}`,
    "Questions to review:",
    JSON.stringify(input.questions, null, 2),
    [
      "Return this exact JSON shape:",
      "{\"approved\": boolean, \"paperIssues\": string[], \"questionReviews\": [{\"clientQuestionId\": string, \"approved\": boolean, \"severity\": \"LOW\"|\"MEDIUM\"|\"HIGH\", \"issueCode\": \"OUT_OF_SYLLABUS\"|\"WRONG_CLASS_LEVEL\"|\"WRONG_TOPIC\"|\"INCORRECT_ANSWER\"|\"INVALID_MARKING_SCHEME\"|\"AMBIGUOUS_QUESTION\"|\"DUPLICATE_QUESTION\"|\"ANSWER_LEAKAGE\"|\"DIFFICULTY_MISMATCH\"|\"MARKS_MISMATCH\"|\"LANGUAGE_QUALITY\"|\"UNSAFE_CONTENT\", \"message\": string, \"suggestedCorrection\": string}]}",
      "For approved questionReviews, return only {\"clientQuestionId\": string, \"approved\": true}.",
    ].join("\n"),
  ].join("\n\n");

  return { system, user };
}
