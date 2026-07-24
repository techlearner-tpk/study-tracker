"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { formatClassLabel } from "@/lib/display";
import { createAssignment } from "./actions";
import { getAssignmentSelection, serializeAssignmentSelection, type AssignmentSelectionChild, type AssignmentSelectionState } from "./selection";

type AssignmentComposerProps = {
  mode: "parent" | "kid";
  tree: AssignmentSelectionChild[];
  fixedChildId?: string;
};

function updateSearchParams(current: Pick<URLSearchParams, "toString">, pathname: string, next: Record<string, string | undefined>) {
  const params = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(next)) {
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function selectionQuery(selection: AssignmentSelectionState) {
  return {
    childId: selection.childId,
    subjectId: selection.subjectId,
    chapterId: selection.chapterId,
    topicId: selection.topicId,
    type: selection.type,
    priority: selection.priority,
  };
}

export function AssignmentComposer({ mode, tree, fixedChildId }: AssignmentComposerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selection = getAssignmentSelection(tree, searchParams, fixedChildId);
  const selectedChild = tree.find((child) => child.id === selection.childId);
  const selectedSubject = selectedChild?.subjects.find((subject) => subject.id === selection.subjectId);
  const selectedChapter = selectedSubject?.chapters.find((chapter) => chapter.id === selection.chapterId);
  const selectedTopic = selectedChapter?.topics.find((topic) => topic.id === selection.topicId);
  const hasTopics = Boolean(selectedChapter?.topics.length);

  useEffect(() => {
    const canonical = serializeAssignmentSelection(pathname, selectionQuery(selection));
    const current = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    if (canonical !== current) {
      router.replace(canonical, { scroll: false });
    }
  }, [pathname, router, searchParams, selection]);

  return (
    <div className="grid gap-4">
      <form action={createAssignment} className="grid gap-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Label>
                Child
                {mode === "kid" ? (
                  <>
                    <Input value={selectedChild?.name ?? ""} readOnly />
                    <input type="hidden" name="childId" value={selection.childId} />
                  </>
                ) : (
                  <Select
                    name="childId"
                    value={selection.childId}
                    onChange={(event) =>
                      router.replace(
                        updateSearchParams(searchParams, pathname, {
                          childId: event.target.value,
                          subjectId: undefined,
                          chapterId: undefined,
                          topicId: undefined,
                        }),
                        { scroll: false },
                      )
                    }
                    required
                  >
                    {tree.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.name} - {formatClassLabel(child.className)}
                      </option>
                    ))}
                  </Select>
                )}
              </Label>

              <Label>
                Subject
                <Select
                  name="subjectId"
                  value={selection.subjectId}
                  onChange={(event) =>
                    router.replace(
                      updateSearchParams(searchParams, pathname, {
                        subjectId: event.target.value,
                        chapterId: undefined,
                        topicId: undefined,
                      }),
                      { scroll: false },
                    )
                  }
                  required
                  disabled={!selectedChild?.subjects.length}
                >
                  {selectedChild?.subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </Select>
              </Label>

              <Label>
                Chapter
                <Select
                  name="chapterId"
                  value={selection.chapterId}
                  onChange={(event) =>
                    router.replace(
                      updateSearchParams(searchParams, pathname, {
                        chapterId: event.target.value,
                        topicId: undefined,
                      }),
                      { scroll: false },
                    )
                  }
                  required
                  disabled={!selectedSubject?.chapters.length}
                >
                  {selectedSubject?.chapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.name}
                    </option>
                  ))}
                </Select>
              </Label>

              <Label>
                Topic
                <Select
                  name="topicId"
                  value={selection.topicId}
                  onChange={(event) =>
                    router.replace(updateSearchParams(searchParams, pathname, { topicId: event.target.value }), { scroll: false })
                  }
                  required
                  disabled={!hasTopics}
                >
                  {selectedChapter?.topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </Select>
              </Label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Label>
                Type
                <Select
                  name="type"
                  value={selection.type}
                  onChange={(event) => router.replace(updateSearchParams(searchParams, pathname, { type: event.target.value }), { scroll: false })}
                  required
                >
                  <option value="STUDY">Study</option>
                  <option value="PRACTICE">Practice</option>
                  <option value="REVISION">Revision</option>
                  <option value="TEST">Test</option>
                </Select>
              </Label>

              <Label>
                Priority
                <Select
                  name="priority"
                  value={selection.priority}
                  onChange={(event) => router.replace(updateSearchParams(searchParams, pathname, { priority: event.target.value }), { scroll: false })}
                  required
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </Select>
              </Label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Label>
                Planned date
                <Input name="plannedDate" type="date" />
              </Label>
              <Label>
                Due date
                <Input name="dueDate" type="date" />
              </Label>
            </div>

            <Label>
              Instructions
              <Textarea name="instructions" placeholder="Optional notes for the assignment" />
            </Label>
          </Card>

          <Card className="grid gap-4">
            {selection.type === "STUDY" ? (
              <Label>
                Study session target
                <Input name="studySessionTarget" type="number" min="1" defaultValue="1" />
              </Label>
            ) : null}
            {selection.type === "PRACTICE" ? (
              <Label>
                Question target
                <Input name="questionTarget" type="number" min="1" defaultValue="10" />
              </Label>
            ) : null}
            {selection.type === "REVISION" ? (
              <Label>
                Revision minutes
                <Input name="durationMinutes" type="number" min="1" defaultValue="15" />
              </Label>
            ) : null}
            {selection.type === "TEST" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Label>
                  Maximum marks
                  <Input name="maximumMarks" type="number" min="1" defaultValue="20" />
                </Label>
                <Label>
                  Passing marks
                  <Input name="passingMarks" type="number" min="1" defaultValue="10" />
                </Label>
                <Label>
                  Duration minutes
                  <Input name="durationMinutes" type="number" min="1" defaultValue="30" />
                </Label>
                <Label>
                  Score
                  <Input name="score" type="number" min="0" />
                </Label>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={!selectedTopic}>
                Create assignment
              </Button>
              {!hasTopics && selectedChapter ? <span className="text-sm text-stone-600">Create a topic first, then come back here.</span> : null}
            </div>
          </Card>
        </div>
      </form>

      {selectedChapter ? <Card className="text-sm text-stone-600">You can add a new topic from the page panel below if {selectedChapter.name} does not have one yet.</Card> : null}
    </div>
  );
}
