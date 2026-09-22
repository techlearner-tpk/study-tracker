"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Label, Select } from "@/components/ui/form";
import type { CurriculumTreeVersion } from "./service";

type PublishedCurriculum = CurriculumTreeVersion;
type CurriculumClass = PublishedCurriculum["classes"][number];

export function CurriculumPicker({ curricula }: { curricula: PublishedCurriculum[] }) {
  const [enabled, setEnabled] = useState(false);
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
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  function resetForClass(nextClass: CurriculumClass | undefined) {
    setClassId(nextClass?.id ?? "");
    setSelectedSubjectIds([]);
  }

  return (
    <div className="grid gap-4 rounded-md border border-slate-200 bg-slate-50/60 p-4">
      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => {
            setEnabled(event.target.checked);
            if (!event.target.checked) setSelectedSubjectIds([]);
          }}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
        />
        <span>
          <span className="block font-semibold text-slate-900">Choose starter subjects from a curriculum</span>
          <span className="mt-1 block text-xs text-slate-500">Optional. Only subject names are added; chapters and topics stay empty so they can match the student&apos;s actual learning plan.</span>
        </span>
      </label>

      {enabled && curricula.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Label>
              Board
              <Select
                value={activeBoardCode}
                onChange={(event) => {
                  const nextBoardCode = event.target.value;
                  setBoardCode(nextBoardCode);
                  const nextVersion = curricula.find((curriculum) => curriculum.board.code === nextBoardCode);
                  setVersionId(nextVersion?.id ?? "");
                  resetForClass(nextVersion?.classes[0]);
                }}
              >
                {boards.map((board) => <option key={board.code} value={board.code}>{board.name}</option>)}
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
                  resetForClass(nextVersion?.classes[0]);
                }}
              >
                {versions.map((curriculum) => <option key={curriculum.id} value={curriculum.id}>{curriculum.academicYear} | {curriculum.name}</option>)}
              </Select>
            </Label>
            <Label>
              Curriculum level
              <Select
                name="curriculumClassId"
                value={activeClassId}
                onChange={(event) => {
                  const nextClass = classes.find((entry) => entry.id === event.target.value);
                  resetForClass(nextClass);
                }}
              >
                {classes.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
              </Select>
            </Label>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Starter subjects</h3>
                <p className="mt-1 text-xs text-slate-500">Select any useful subjects, or leave everything unchecked and add custom subjects later.</p>
              </div>
              <span className="text-xs text-slate-500">{selectedSubjectIds.length} selected</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {(selectedClass?.subjects ?? []).map((subject) => {
                const checked = selectedSubjectIds.includes(subject.id);
                return (
                  <label key={subject.id} className="flex items-start gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="selectedSubjectIds"
                      value={subject.id}
                      checked={checked}
                      onChange={(event) => setSelectedSubjectIds((current) => event.target.checked ? [...current, subject.id] : current.filter((value) => value !== subject.id))}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                    />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
                        {subject.name}
                        {subject.isOptional ? <Badge>Optional</Badge> : null}
                        {subject.isLanguageSubject ? <Badge>Language</Badge> : null}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      {enabled && !curricula.length ? (
        <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">No published curriculum is available. Create the child now and add any subject later.</p>
      ) : null}
    </div>
  );
}
