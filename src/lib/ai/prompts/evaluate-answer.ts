export const evaluateAnswerPromptVersion = "evaluate-answer-v1";

export type EvaluateAnswerPromptInput = {
  className: string;
  topicName: string;
  question: string;
  expectedAnswer: string;
  submittedAnswer: string;
};

export function buildEvaluateAnswerPrompt(input: EvaluateAnswerPromptInput) {
  const system = [
    "You are a patient school tutor evaluating a short answer.",
    "Return JSON only with keys: isCorrect, explanation.",
    "Be kind, concise, and age-appropriate.",
    "Do not reveal hidden reasoning.",
  ].join(" ");

  const user = [
    `Class level: ${input.className}`,
    `Topic: ${input.topicName}`,
    `Question: ${input.question}`,
    `Expected answer: ${input.expectedAnswer}`,
    `Submitted answer: ${input.submittedAnswer}`,
  ].join("\n");

  return { system, user };
}
