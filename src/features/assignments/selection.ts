export type AssignmentSelectionTopic = {
  id: string;
  name: string;
};

export type AssignmentSelectionChapter = {
  id: string;
  name: string;
  topics: AssignmentSelectionTopic[];
};

export type AssignmentSelectionSubject = {
  id: string;
  name: string;
  chapters: AssignmentSelectionChapter[];
};

export type AssignmentSelectionChild = {
  id: string;
  name: string;
  className: string;
  subjects: AssignmentSelectionSubject[];
};

export type AssignmentSelectionState = {
  childId: string;
  subjectId: string;
  chapterId: string;
  topicId: string;
  type: string;
  priority: string;
};

export function findSelectionForTopic(children: AssignmentSelectionChild[], topicId: string) {
  for (const child of children) {
    for (const subject of child.subjects) {
      for (const chapter of subject.chapters) {
        const topic = chapter.topics.find((item) => item.id === topicId);
        if (topic) {
          return {
            childId: child.id,
            subjectId: subject.id,
            chapterId: chapter.id,
            topicId: topic.id,
          };
        }
      }
    }
  }

  return null;
}

export function getAssignmentSelection(
  children: AssignmentSelectionChild[],
  params: Pick<URLSearchParams, "get" | "toString">,
  fixedChildId?: string,
): AssignmentSelectionState {
  const topicParam = params.get("topicId");
  const topicSelection = topicParam ? findSelectionForTopic(children, topicParam) : null;
  const childId = fixedChildId ?? params.get("childId") ?? topicSelection?.childId ?? children[0]?.id ?? "";
  const selectedChild = children.find((child) => child.id === childId) ?? children[0];
  const subjectId = topicSelection?.subjectId ?? params.get("subjectId") ?? selectedChild?.subjects[0]?.id ?? "";
  const selectedSubject = selectedChild?.subjects.find((subject) => subject.id === subjectId) ?? selectedChild?.subjects[0];
  const chapterId = topicSelection?.chapterId ?? params.get("chapterId") ?? selectedSubject?.chapters[0]?.id ?? "";
  const selectedChapter = selectedSubject?.chapters.find((chapter) => chapter.id === chapterId) ?? selectedSubject?.chapters[0];
  const topicId = topicSelection?.topicId ?? topicParam ?? selectedChapter?.topics[0]?.id ?? "";

  return {
    childId,
    subjectId: selectedSubject?.id ?? subjectId,
    chapterId: selectedChapter?.id ?? chapterId,
    topicId: selectedChapter?.topics.some((topic) => topic.id === topicId) ? topicId : selectedChapter?.topics[0]?.id ?? topicId,
    type: params.get("type") ?? "STUDY",
    priority: params.get("priority") ?? "MEDIUM",
  };
}

export function serializeAssignmentSelection(
  pathname: string,
  selection: Partial<AssignmentSelectionState> & { childId?: string; subjectId?: string; chapterId?: string; topicId?: string },
) {
  const params = new URLSearchParams();
  if (selection.childId) params.set("childId", selection.childId);
  if (selection.subjectId) params.set("subjectId", selection.subjectId);
  if (selection.chapterId) params.set("chapterId", selection.chapterId);
  if (selection.topicId) params.set("topicId", selection.topicId);
  if (selection.type) params.set("type", selection.type);
  if (selection.priority) params.set("priority", selection.priority);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
