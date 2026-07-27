export const evaluateAnswerPromptVersion = "evaluate-answer-v1";

export type EvaluateAnswerPromptInput = {
  className: string;
  boardName?: string | null;
  subjectName: string;
  chapterName: string;
  topicName: string;
  topicDescription?: string | null;
  questionType: string;
  question: string;
  expectedAnswer: string;
  questionExplanation: string;
  submittedAnswer: string;
};

export function buildEvaluateAnswerPrompt(input: EvaluateAnswerPromptInput) {
  const system = [
    "You are a patient school teacher checking a student's free-text test answer.",
    "Evaluate the answer against the expected answer and the topic context, not by exact string match.",
    "Return JSON only with keys: scorePercentage, isCorrect, explanation.",
    "scorePercentage must be an integer from 0 to 100: use 100 for fully correct, 70-90 for mostly correct, 40-60 for partly correct, 1-30 for weak but relevant, and 0 for blank or unrelated.",
    "Set isCorrect to true only when scorePercentage is 100.",
    "The explanation must tell the student what was right, what was missing, and the correct idea in kind, age-appropriate language.",
    "Do not reveal hidden reasoning.",
  ].join(" ");

  const user = [
    "Evaluate this submitted answer.",
    `Class level: ${input.className}`,
    `Board: ${input.boardName || "Not specified"}`,
    `Subject: ${input.subjectName}`,
    `Chapter: ${input.chapterName}`,
    `Topic: ${input.topicName}`,
    `Topic description: ${input.topicDescription || "No description provided"}`,
    `Question type: ${input.questionType}`,
    `Question: ${input.question}`,
    `Expected answer: ${input.expectedAnswer}`,
    `Question explanation: ${input.questionExplanation}`,
    `Submitted answer: ${input.submittedAnswer}`,
  ].join("\n");

  return { system, user };
}
