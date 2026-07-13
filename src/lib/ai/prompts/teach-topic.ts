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
    "The first section must explain what the topic is in simple plain language.",
    "Include a second section that explains why the topic matters or what the child should notice.",
    "The final checkQuestion must be a short comprehension check, not a trick question.",
  ].join(" ");

  const user = [
    `Class level: ${input.className}`,
    input.boardName ? `Board: ${input.boardName}` : null,
    `Subject: ${input.subjectName}`,
    `Chapter: ${input.chapterName}`,
    `Topic: ${input.topicName}`,
    input.topicDescription ? `Topic description: ${input.topicDescription}` : null,
    "Create a short, friendly lesson with these sections:",
    "1. Plain-English explanation",
    "2. Why it matters",
    "3. Simple example",
    "4. Try this",
    "Use concise wording and include one worked example where relevant.",
    "Suggested actions should be exactly 4 items and may include: Explain more simply, Give another example, Ask me a question, I did not understand.",
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}
