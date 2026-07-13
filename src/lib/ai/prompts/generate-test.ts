export const generateTestPromptVersion = "generate-test-v4";

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
    "Make the test feel like a real challenge, not a generic review or a template.",
    "Every question must be specific to the exact topic, chapter, and subject context.",
    "Do not use vague placeholders like 'a correct example', 'a random unrelated thing', or 'the one that fits the topic'.",
    "Cover different skills across the set: understanding, application, one worked example, one common mistake, and one quick check.",
    "At least one question should ask the child to solve or explain a real topic example.",
    "At least one question should require a calculation, a specific fact, or a topic-based explanation depending on the subject.",
    "If the topic is math, include actual numbers, symbols, or steps.",
    "If the topic is reading or language, ask about meaning, detail, vocabulary, or inference from the text idea.",
    "If the topic is science or social science, use concrete classroom or everyday situations.",
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
    "Do not use generic questions like 'What is one key fact about the topic?' or 'Which example best matches the topic?'.",
    "Instead, write topic-specific prompts that mention the real idea, a worked example, or an exact application.",
    "For short-answer questions, provide a concise correctAnswer and explanation.",
    "Make the set feel like a proper challenge for a student who just learned the lesson.",
    "Keep the correctAnswer precise and directly tied to the question.",
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}
