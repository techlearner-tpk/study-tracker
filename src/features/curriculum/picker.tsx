"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/form";
import type { CurriculumTreeVersion } from "./service";

type PublishedCurriculum = CurriculumTreeVersion;

type CurriculumClass = PublishedCurriculum["classes"][number];

type CurriculumSubject = CurriculumClass["subjects"][number];

function resetSubjectSelection(subjects: CurriculumSubject[]) {
  const defaults = subjects.filter((subject) => subject.isDefaultSelected).map((subject) => subject.id);
  return defaults.length ? defaults : subjects.map((subject) => subject.id);
}

export function CurriculumPicker({
  curricula,
  className,
  onClassNameChange,
}: {
  curricula: PublishedCurriculum[];
  className: string;
  onClassNameChange: (value: string) => void;
}) {
  const boards = useMemo(
    () => Array.from(new Map(curricula.map((curriculum) => [curriculum.board.code, curriculum.board])).values()),
    [curricula],
  );
  const [boardCode, setBoardCode] = useState(boards[0]?.code ?? "");

  const activeBoardCode = boards.some((board) => board.code === boardCode) ? boardCode : boards[0]?.code ?? "";
  const versions = useMemo(
    () => curricula.filter((curriculum) => curriculum.board.code === activeBoardCode),
    [activeBoardCode, curricula],
  );
  const [versionId, setVersionId] = useState(versions[0]?.id ?? "");
  const activeVersionId = versions.some((curriculum) => curriculum.id === versionId) ? versionId : versions[0]?.id ?? "";
  const selectedVersion = versions.find((curriculum) => curriculum.id === activeVersionId) ?? versions[0] ?? null;

  const classes = selectedVersion?.classes ?? [];
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const activeClassId = classes.some((entry) => entry.id === classId) ? classId : classes[0]?.id ?? "";
  const selectedClass = classes.find((entry) => entry.id === activeClassId) ?? classes[0] ?? null;
  const subjectOptions = useMemo(() => selectedClass?.subjects ?? [], [selectedClass]);
  const defaultSubjectIds = useMemo(() => resetSubjectSelection(subjectOptions), [subjectOptions]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>(defaultSubjectIds);

  if (!curricula.length) {
    return (
      <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 p-3 text-sm text-stone-600">
        No published curriculum is available yet. The form will fall back to the manual child setup.
      </div>
    );
  }

  const syncClassSelection = (nextClass: CurriculumClass | undefined) => {
    if (!nextClass) {
      onClassNameChange("");
      setSelectedSubjectIds([]);
      return;
    }
    onClassNameChange(nextClass.name);
    setSelectedSubjectIds(resetSubjectSelection(nextClass.subjects));
  };

  return (
    <div className="grid gap-4 rounded-md border border-stone-200 bg-stone-50 p-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Label>
          Board
          <Select
            name="curriculumBoardCode"
            value={activeBoardCode}
            onChange={(event) => {
              const nextBoardCode = event.target.value;
              setBoardCode(nextBoardCode);
              const nextVersions = curricula.filter((curriculum) => curriculum.board.code === nextBoardCode);
              const nextVersion = nextVersions[0];
              setVersionId(nextVersion?.id ?? "");
              const nextClass = nextVersion?.classes[0];
              setClassId(nextClass?.id ?? "");
              syncClassSelection(nextClass);
            }}
          >
            {boards.map((board) => (
              <option key={board.code} value={board.code}>
                {board.name}
              </option>
            ))}
          </Select>
        </Label>
        <Label>
          Curriculum version
          <Select
            name="curriculumVersionId"
            value={activeVersionId}
            onChange={(event) => {
              const nextVersionId = event.target.value;
              setVersionId(nextVersionId);
              const nextVersion = versions.find((curriculum) => curriculum.id === nextVersionId);
              const nextClass = nextVersion?.classes[0];
              setClassId(nextClass?.id ?? "");
              syncClassSelection(nextClass);
            }}
          >
            {versions.map((curriculum) => (
              <option key={curriculum.id} value={curriculum.id}>
                {curriculum.academicYear} · {curriculum.version} · {curriculum.name}
              </option>
            ))}
          </Select>
        </Label>
        <Label>
          Class
          <Select
            name="curriculumClassId"
            value={activeClassId}
            onChange={(event) => {
              const nextClassId = event.target.value;
              setClassId(nextClassId);
              const nextClass = classes.find((entry) => entry.id === nextClassId);
              syncClassSelection(nextClass);
            }}
          >
            {classes.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </Select>
        </Label>
      </div>

      <Label>
        Class name
        <Input name="className" value={className} onChange={(event) => onClassNameChange(event.target.value)} />
      </Label>

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-900">Subjects</h3>
          <p className="text-xs text-stone-500">{selectedSubjectIds.length} selected</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {subjectOptions.map((subject) => {
            const checked = selectedSubjectIds.includes(subject.id);
            return (
              <label
                key={subject.id}
                className="grid gap-2 rounded-md border border-stone-200 bg-white p-3 text-sm text-stone-700"
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    name="selectedSubjectIds"
                    value={subject.id}
                    checked={checked}
                    onChange={(event) => {
                      setSelectedSubjectIds((current) =>
                        event.target.checked
                          ? [...current, subject.id]
                          : current.filter((value) => value !== subject.id),
                      );
                    }}
                    className="mt-1 h-4 w-4 rounded border-stone-300 text-emerald-800 focus:ring-emerald-700"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-stone-900">{subject.name}</span>
                      {subject.isDefaultSelected ? <Badge>Default</Badge> : null}
                      {subject.isOptional ? <Badge>Optional</Badge> : null}
                      {subject.isLanguageSubject ? <Badge>Language</Badge> : null}
                    </div>
                    <p className="text-xs text-stone-500">{subject.chapters.length} chapters</p>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
