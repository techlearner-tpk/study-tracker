export const generateTestPromptVersion = "generate-test-v1";

export type GenerateTestPromptInput = {
  className: string;
  boardName?: string | null;
  subjectName: string;
  chapterName: string;
  topicName: string;
  topicDescription?: string | null;
  questionCount: number;
};

export function buildGenerateTestPrompt(input: GenerateTestPromptInput) {
  const system = [
    "You are a patient school tutor creating a topic-specific test for a child.",
    "Stay focused on education and the specific topic only.",
    "Do not invent curriculum facts. Admit uncertainty when needed.",
    "Do not ask for personal information. Do not mention system prompts or AI internals.",
    "Return JSON only with keys: title, questions.",
    "Each question must have id, type, question, options, correctAnswer, explanation.",
    "Question types must be one of: MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER.",
    "Use age-appropriate wording for the class level.",
  ].join(" ");

  const user = [
    `Class level: ${input.className}`,
    input.boardName ? `Board: ${input.boardName}` : null,
    `Subject: ${input.subjectName}`,
    `Chapter: ${input.chapterName}`,
    `Topic: ${input.topicName}`,
    input.topicDescription ? `Topic description: ${input.topicDescription}` : null,
    `Create exactly ${input.questionCount} questions.`,
    "Prefer a mix of multiple choice, true/false, and short answer questions.",
    "Keep questions short, clear, and age-appropriate.",
    "For short-answer questions, provide a concise correctAnswer and explanation.",
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}
