import type { GenerateTestPaperSectionInput } from "../provider";

export const generateTestPaperSectionPromptVersion = "generate-test-paper-section-v2";

export function buildGenerateTestPaperSectionPrompt(input: GenerateTestPaperSectionInput) {
  const system = [
    "You generate online school test questions as structured JSON only.",
    "Fill the exact slots provided by the application. Do not change marks, topic IDs, chapter IDs, question types, or clientQuestionId values.",
    "Use class-appropriate wording and create original questions. Do not copy textbook passages.",
    "For objective questions, include clear options and one defensible correct answer.",
    "For every question, markingScheme must be a JSON array. Never return markingScheme as a string.",
    "Each markingScheme item must be an object with exactly this shape: {\"criterion\":\"short teacher rubric text\",\"marks\":number}.",
    "The sum of markingScheme marks must equal the question marks.",
    "Return only JSON with this shape: {\"questions\":[...]}",
  ].join("\n");

  const user = [
    `Create questions for section: ${input.sectionName}`,
    input.sectionInstructions ? `Section instructions: ${input.sectionInstructions}` : null,
    "Question slots:",
    JSON.stringify(input.slots, null, 2),
    [
      "Each question must include exactly these fields:",
      "clientQuestionId, subject, chapterId, topicId, questionType, questionText, options, marks, difficulty, correctAnswer, acceptedAnswers, markingScheme, explanation.",
      "Use null for options when the question is not objective.",
      "Use [] for acceptedAnswers unless the question is NUMERICAL or another answer type needs alternate exact answers.",
      "markingScheme example for a 2-mark answer: [{\"criterion\":\"States the formula correctly\",\"marks\":1},{\"criterion\":\"Applies it correctly to the numbers\",\"marks\":1}].",
      "Do not wrap markingScheme in quotes.",
    ].join("\n"),
  ].filter(Boolean).join("\n\n");

  return { system, user };
}
