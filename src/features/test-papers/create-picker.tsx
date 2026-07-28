"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/form";
import { generateOnlineTestPaperAction } from "./actions";

const activeTemplateStatus = "ACTIVE";

type ChildOption = {
  id: string;
  name: string;
  className: string;
  subjects: {
    id: string;
    name: string;
    chapters: {
      id: string;
      name: string;
      topics: {
        id: string;
        name: string;
      }[];
    }[];
  }[];
};

type TemplateOption = {
  id: string;
  name: string;
  subjectName: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
};

export function TestPaperCreatePicker({
  childOptions,
  kidMode = false,
  templates,
}: {
  childOptions: ChildOption[];
  kidMode?: boolean;
  templates: TemplateOption[];
}) {
  const firstChild = childOptions[0] ?? null;
  const [childId, setChildId] = useState(firstChild?.id ?? "");
  const selectedChild = childOptions.find((child) => child.id === childId) ?? firstChild;
  const [subjectId, setSubjectId] = useState(selectedChild?.subjects[0]?.id ?? "");
  const selectedSubject = selectedChild?.subjects.find((subject) => subject.id === subjectId) ?? selectedChild?.subjects[0] ?? null;
  const activeTemplates = templates.filter((template) => template.status === activeTemplateStatus && template.subjectName === selectedSubject?.name);
  const [templateId, setTemplateId] = useState(activeTemplates[0]?.id ?? "");
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const normalizedTemplateId = activeTemplates.some((template) => template.id === templateId) ? templateId : activeTemplates[0]?.id ?? "";

  const topicCount = useMemo(
    () => selectedSubject?.chapters.reduce((sum, chapter) => sum + chapter.topics.length, 0) ?? 0,
    [selectedSubject],
  );

  function handleChildChange(nextChildId: string) {
    const nextChild = childOptions.find((child) => child.id === nextChildId);
    const nextSubject = nextChild?.subjects[0];
    setChildId(nextChildId);
    setSubjectId(nextSubject?.id ?? "");
    setSelectedTopicIds([]);
    const nextTemplate = templates.find((template) => template.status === activeTemplateStatus && template.subjectName === nextSubject?.name);
    setTemplateId(nextTemplate?.id ?? "");
  }

  function handleSubjectChange(nextSubjectId: string) {
    const nextSubject = selectedChild?.subjects.find((subject) => subject.id === nextSubjectId);
    setSubjectId(nextSubjectId);
    setSelectedTopicIds([]);
    const nextTemplate = templates.find((template) => template.status === activeTemplateStatus && template.subjectName === nextSubject?.name);
    setTemplateId(nextTemplate?.id ?? "");
  }

  function handleTopicChange(topicId: string, checked: boolean) {
    setSelectedTopicIds((current) => {
      if (checked) return current.includes(topicId) ? current : [...current, topicId];
      return current.filter((id) => id !== topicId);
    });
  }

  return (
    <form action={generateOnlineTestPaperAction} className="grid gap-5">
      <input type="hidden" name="source" value={kidMode ? "SELF_PRACTICE" : "ASSIGNED_BY_PARENT"} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Label>
          Child
          <Select name="childId" value={childId} onChange={(event) => handleChildChange(event.target.value)} required>
            {childOptions.map((child) => <option key={child.id} value={child.id}>{child.name} | {child.className}</option>)}
          </Select>
        </Label>
        <Label>
          Subject
          <Select name="subjectId" value={selectedSubject?.id ?? ""} onChange={(event) => handleSubjectChange(event.target.value)} required>
            {selectedChild?.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </Select>
        </Label>
        <Label>
          Template
          <Select name="templateId" value={normalizedTemplateId} onChange={(event) => setTemplateId(event.target.value)} required>
            {activeTemplates.map((template) => (
              <option key={template.id} value={template.id}>{template.name}</option>
            ))}
          </Select>
        </Label>
      </div>

      <div className="grid gap-3">
        <div>
          <CardTitle>Select topics</CardTitle>
          <p className="mt-1 text-sm text-slate-600">
            Showing {topicCount} topics for {selectedChild?.name ?? "selected child"} | {selectedSubject?.name ?? "selected subject"}.
            {" "}{selectedTopicIds.length} selected.
          </p>
        </div>
        {selectedSubject ? (
          <div key={selectedSubject.id} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {selectedSubject.chapters.map((chapter) => (
              <div key={chapter.id} className="rounded-md border border-slate-200 p-3">
                <p className="font-semibold">{selectedSubject.name} | {chapter.name}</p>
                <div className="mt-2 grid gap-2">
                  {chapter.topics.map((topic) => (
                    <label key={topic.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="topicIds"
                        value={topic.id}
                        checked={selectedTopicIds.includes(topic.id)}
                        onChange={(event) => handleTopicChange(topic.id, event.target.checked)}
                      />
                      <span>{topic.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">No supported subjects found for this child.</p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Label>
          Title
          <Input name="title" placeholder="Optional" />
        </Label>
        {!kidMode ? (
          <Label>
            Due date
            <Input name="dueAt" type="date" />
          </Label>
        ) : null}
      </div>
      <Button type="submit" pendingText="Generating paper..." disabled={!selectedSubject || !normalizedTemplateId || selectedTopicIds.length === 0}>
        Generate paper
      </Button>
    </form>
  );
}
