import { describe, expect, it } from "vitest";

import { aiGeneratedTestSchema } from "@/features/ai/schema";

describe("ai schema", () => {
  it("coerces numeric test question ids to strings", () => {
    const parsed = aiGeneratedTestSchema.parse({
      title: "Polygons Assessment",
      questions: [
        {
          id: 1,
          type: "MULTIPLE_CHOICE",
          question: "Question?",
          options: ["A", "B"],
          correctAnswer: "A",
          explanation: "Because.",
        },
      ],
    });

    expect(parsed.questions[0].id).toBe("1");
  });
});
