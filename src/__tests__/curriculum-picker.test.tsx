// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { CurriculumPicker } from "@/features/curriculum/picker";
import type { CurriculumTreeVersion } from "@/features/curriculum/service";

const curricula: CurriculumTreeVersion[] = [
  {
    id: "version_1",
    academicYear: "2026-27",
    version: "1.0",
    name: "CBSE Starter",
    status: "PUBLISHED" as const,
    verificationStatus: "REVIEW_REQUIRED" as const,
    sourceUrl: null,
    notes: null,
    sourceReferences: null,
    publishedAt: null,
    archivedAt: null,
    board: { id: "board_1", code: "CBSE", name: "Central Board" },
    classes: [
      {
        id: "class_1",
        level: 5,
        name: "Class 5",
        stableKey: "class-5",
        sequence: 1,
        subjects: [
          {
            id: "subject_math",
            stableKey: "math",
            name: "Mathematics",
            sequence: 1,
            isDefaultSelected: true,
            isOptional: false,
            isLanguageSubject: false,
            sourceUrl: null,
            verificationStatus: "VERIFIED_FROM_OFFICIAL_SOURCE",
            archivedAt: null,
            chapters: [
              {
                id: "chapter_math",
                stableKey: "fractions",
                name: "Fractions",
                sequence: 1,
                sourceUrl: null,
                verificationStatus: "VERIFIED_FROM_OFFICIAL_SOURCE",
                archivedAt: null,
                topics: [],
              },
            ],
          },
          {
            id: "subject_english",
            stableKey: "english",
            name: "English",
            sequence: 2,
            isDefaultSelected: false,
            isOptional: true,
            isLanguageSubject: true,
            sourceUrl: null,
            verificationStatus: "CURATED_FROM_OFFICIAL_SOURCE",
            archivedAt: null,
            chapters: [
              {
                id: "chapter_english",
                stableKey: "reading",
                name: "Reading",
                sequence: 1,
                sourceUrl: null,
                verificationStatus: "CURATED_FROM_OFFICIAL_SOURCE",
                archivedAt: null,
                topics: [],
              },
            ],
          },
        ],
      },
    ],
  },
];

function Wrapper() {
  const [className, setClassName] = useState("");
  return <CurriculumPicker curricula={curricula} className={className} onClassNameChange={setClassName} />;
}

describe("curriculum picker", () => {
  it("preselects the default subject", () => {
    render(<Wrapper />);
    const math = screen.getByRole("checkbox", { name: /Mathematics/i }) as HTMLInputElement;
    const english = screen.getByRole("checkbox", { name: /English/i }) as HTMLInputElement;

    expect(math.checked).toBe(true);
    expect(english.checked).toBe(false);
  });

  it("allows the parent to deselect a subject", () => {
    render(<Wrapper />);
    const math = screen.getByRole("checkbox", { name: /Mathematics/i }) as HTMLInputElement;
    fireEvent.click(math);
    expect(math.checked).toBe(false);
  });
});
