import type { GenerateTestPaperSectionInput } from "../provider";

export const generateTestPaperSectionPromptVersion = "generate-test-paper-section-v1";

export function buildGenerateTestPaperSectionPrompt(input: GenerateTestPaperSectionInput) {
  const system = [
    "You generate online school test questions as structured JSON only.",
    "Fill the exact slots provided by the application. Do not change marks, topic IDs, chapter IDs, question types, or clientQuestionId values.",
    "Use class-appropriate wording and create original questions. Do not copy textbook passages.",
    "For objective questions, include clear options and one defensible correct answer. For subjective questions, include a marking scheme whose marks add up to the question marks.",
    "Return only JSON with this shape: {\"questions\":[...]}",
  ].join("\n");

  const user = [
    `Create questions for section: ${input.sectionName}`,
    input.sectionInstructions ? `Section instructions: ${input.sectionInstructions}` : null,
    "Question slots:",
    JSON.stringify(input.slots, null, 2),
    "Each question must include: clientQuestionId, subject, chapterId, topicId, questionType, questionText, options, marks, difficulty, correctAnswer, acceptedAnswers, markingScheme, explanation.",
  ].filter(Boolean).join("\n\n");

  return { system, user };
}
