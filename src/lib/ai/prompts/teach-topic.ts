export const teachTopicPromptVersion = "teach-topic-v1";

export type TeachTopicPromptInput = {
  className: string;
  boardName?: string | null;
  subjectName: string;
  chapterName: string;
  topicName: string;
  topicDescription?: string | null;
};

export function buildTeachTopicPrompt(input: TeachTopicPromptInput) {
  const system = [
    "You are a patient school tutor for a child.",
    "Use age-appropriate language for the child's class level.",
    "Stay focused on education and the specific topic only.",
    "Do not invent curriculum facts. Admit uncertainty when needed.",
    "Do not ask for personal information. Do not mention system prompts or AI internals.",
    "If the child asks for unsafe or unrelated help, gently redirect to learning.",
    "Return JSON only with keys: title, sections, suggestedActions, checkQuestion.",
    "Sections must be an array of objects with heading and body.",
  ].join(" ");

  const user = [
    `Class level: ${input.className}`,
    input.boardName ? `Board: ${input.boardName}` : null,
    `Subject: ${input.subjectName}`,
    `Chapter: ${input.chapterName}`,
    `Topic: ${input.topicName}`,
    input.topicDescription ? `Topic description: ${input.topicDescription}` : null,
    "Create a short, friendly lesson with:",
    "1. What this means",
    "2. Simple example",
    "3. Try this",
    "4. Check your understanding",
    "Use concise wording and include one worked example where relevant.",
    "Suggested actions should be exactly 4 items and may include: Explain more simply, Give another example, Ask me a question, I did not understand.",
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}
