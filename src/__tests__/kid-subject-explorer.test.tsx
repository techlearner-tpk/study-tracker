// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KidSubjectExplorer, type KidSubject } from "@/features/dashboard/kid-subject-explorer";

const subjects: KidSubject[] = [
  {
    id: "english",
    name: "English",
    color: "#2563eb",
    chapters: [
      {
        id: "reading",
        name: "Reading",
        topics: [{ id: "inference", name: "Inference", status: "IN_PROGRESS" }],
      },
    ],
  },
  {
    id: "mathematics",
    name: "Mathematics",
    color: "#ea6548",
    chapters: [
      {
        id: "integers",
        name: "Integers",
        topics: [{ id: "operations", name: "Operations on integers", status: "NOT_STARTED" }],
      },
      {
        id: "geometry",
        name: "Geometry",
        topics: [{ id: "polygons", name: "Polygons", status: "NOT_STARTED" }],
      },
    ],
  },
];

describe("KidSubjectExplorer", () => {
  it("lets a kid select a subject and chapter", () => {
    render(<KidSubjectExplorer subjects={subjects} />);

    fireEvent.click(screen.getByRole("button", { name: /Mathematics/ }));
    fireEvent.click(screen.getByRole("button", { name: /Geometry/ }));

    expect(screen.getByRole("link", { name: /Polygons/ }).getAttribute("href")).toBe("/kid/topics/polygons");
    expect(screen.queryByRole("link", { name: /Operations on integers/ })).toBeNull();
  });

  it("searches across subject, chapter, and topic names", () => {
    render(<KidSubjectExplorer subjects={subjects} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Search subjects, chapters, or topics" }), {
      target: { value: "polygon" },
    });

    expect(screen.getByRole("button", { name: /Mathematics/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /English/ })).toBeNull();
    expect(screen.getByRole("link", { name: /Polygons/ })).toBeTruthy();
  });
});
