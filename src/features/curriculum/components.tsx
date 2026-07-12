"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { archiveCurriculumVersion, cloneCurriculumVersion, importCurriculumAction, publishCurriculumVersion, saveCurriculumChapter, saveCurriculumClass, saveCurriculumSubject, saveCurriculumTopic, saveCurriculumVersion } from "./actions";
import type { CurriculumImportResult, CurriculumTreeVersion } from "./service";

export function CurriculumVersionForm({ version }: { version?: Partial<CurriculumTreeVersion> & { board?: { code: string; name: string } } }) {
  return (
    <form action={saveCurriculumVersion} className="grid gap-4 md:grid-cols-2">
      {version ? <input type="hidden" name="id" value={version.id} /> : null}
      <Label>
        Board code
        <Input name="boardCode" defaultValue={version?.board?.code ?? "CBSE"} required />
      </Label>
      <Label>
        Board name
        <Input name="boardName" defaultValue={version?.board?.name ?? "Central Board of Secondary Education"} required />
      </Label>
      <Label>
        Academic year
        <Input name="academicYear" defaultValue={version?.academicYear ?? "2026-27"} required />
      </Label>
      <Label>
        Version
        <Input name="version" defaultValue={version?.version ?? "1.0"} required />
      </Label>
      <Label className="md:col-span-2">
        Name
        <Input name="name" defaultValue={version?.name ?? ""} required />
      </Label>
      <Label className="md:col-span-2">
        Source URL
        <Input name="sourceUrl" defaultValue={version?.sourceUrl ?? ""} />
      </Label>
      <Label className="md:col-span-2">
        Notes
        <Textarea name="notes" defaultValue={version?.notes ?? ""} />
      </Label>
      <div className="md:col-span-2">
        <Button type="submit">{version?.id ? "Save draft" : "Create draft"}</Button>
      </div>
    </form>
  );
}

export function CurriculumImportPanel() {
  const [state, action] = useActionState<CurriculumImportResult | null, FormData>(importCurriculumAction, null);

  return (
    <Card>
      <CardTitle>Import curriculum</CardTitle>
      <form action={action} className="mt-4 grid gap-4">
        <Label>
          Seed file
          <Input name="file" type="file" accept=".json,.csv,application/json,text/csv" required />
        </Label>
        <Label className="flex items-center gap-2 text-sm font-medium text-stone-700">
          <input type="checkbox" name="dryRun" className="h-4 w-4 rounded border-stone-300 text-emerald-800" />
          Dry run
        </Label>
        <Button type="submit" variant="secondary">Run import</Button>
      </form>
      {state ? (
        <div className="mt-4 grid gap-1 text-sm text-stone-700">
          <p>Inserted: {state.inserted}</p>
          <p>Updated: {state.updated}</p>
          <p>Skipped: {state.skipped}</p>
          <p>Errors: {state.errors}</p>
          <p>Seed: {state.seedId}</p>
        </div>
      ) : null}
    </Card>
  );
}

export function CurriculumActions({ version }: { version: CurriculumTreeVersion }) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={cloneCurriculumVersion}>
        <input type="hidden" name="id" value={version.id} />
        <Button type="submit" variant="secondary">Clone</Button>
      </form>
      {version.status === "DRAFT" ? (
        <form action={publishCurriculumVersion}>
          <input type="hidden" name="id" value={version.id} />
          <Button type="submit">Publish</Button>
        </form>
      ) : null}
      {version.status !== "ARCHIVED" ? (
        <form action={archiveCurriculumVersion}>
          <input type="hidden" name="id" value={version.id} />
          <Button type="submit" variant="danger">Archive</Button>
        </form>
      ) : null}
      <Link href={`/admin/curriculum/${version.id}/export`} className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-medium text-stone-800 hover:bg-stone-100">
        Export JSON
      </Link>
    </div>
  );
}

export function CurriculumClassForm({
  versionId,
  curriculumClass,
}: {
  versionId: string;
  curriculumClass?: { id: string; level: number; name: string; stableKey: string; sequence: number };
}) {
  return (
    <form action={saveCurriculumClass} className="grid gap-4 md:grid-cols-[100px_minmax(0,1fr)_minmax(0,1fr)_100px_auto]">
      <input type="hidden" name="versionId" value={versionId} />
      {curriculumClass ? <input type="hidden" name="id" value={curriculumClass.id} /> : null}
      <Label>
        Level
        <Input name="level" type="number" min="1" defaultValue={curriculumClass?.level ?? 1} required />
      </Label>
      <Label>
        Class name
        <Input name="name" defaultValue={curriculumClass?.name ?? ""} placeholder="Class 5" required />
      </Label>
      <Label>
        Stable key
        <Input name="stableKey" defaultValue={curriculumClass?.stableKey ?? ""} placeholder="class-5" />
      </Label>
      <Label>
        Sequence
        <Input name="sequence" type="number" min="0" defaultValue={curriculumClass?.sequence ?? 0} />
      </Label>
      <Button type="submit">{curriculumClass ? "Save class" : "Add class"}</Button>
    </form>
  );
}

export function CurriculumSubjectForm({
  classId,
  subject,
}: {
  classId: string;
  subject?: {
    id: string;
    name: string;
    stableKey: string;
    sequence: number;
    isDefaultSelected: boolean;
    isOptional: boolean;
    isLanguageSubject: boolean;
    sourceUrl: string | null;
    verificationStatus: string;
  };
}) {
  return (
    <form action={saveCurriculumSubject} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="classId" value={classId} />
      {subject ? <input type="hidden" name="id" value={subject.id} /> : null}
      <Label>
        Subject
        <Input name="name" defaultValue={subject?.name ?? ""} required />
      </Label>
      <Label>
        Stable key
        <Input name="stableKey" defaultValue={subject?.stableKey ?? ""} placeholder="math" />
      </Label>
      <Label>
        Sequence
        <Input name="sequence" type="number" min="0" defaultValue={subject?.sequence ?? 0} />
      </Label>
      <Label>
        Source URL
        <Input name="sourceUrl" defaultValue={subject?.sourceUrl ?? ""} />
      </Label>
      <Label>
        Verification
        <Select name="verificationStatus" defaultValue={subject?.verificationStatus ?? "REVIEW_REQUIRED"}>
          <option value="OFFICIAL">Official</option>
          <option value="VERIFIED_FROM_OFFICIAL_SOURCE">Verified from official source</option>
          <option value="CURATED_FROM_OFFICIAL_SOURCE">Curated from official source</option>
          <option value="REVIEW_REQUIRED">Review required</option>
        </Select>
      </Label>
      <div className="grid gap-2 sm:grid-cols-3 md:col-span-2">
        <Label className="flex items-center gap-2">
          <input type="checkbox" name="isDefaultSelected" defaultChecked={subject?.isDefaultSelected ?? false} className="h-4 w-4 rounded border-stone-300 text-emerald-800" />
          Default
        </Label>
        <Label className="flex items-center gap-2">
          <input type="checkbox" name="isOptional" defaultChecked={subject?.isOptional ?? false} className="h-4 w-4 rounded border-stone-300 text-emerald-800" />
          Optional
        </Label>
        <Label className="flex items-center gap-2">
          <input type="checkbox" name="isLanguageSubject" defaultChecked={subject?.isLanguageSubject ?? false} className="h-4 w-4 rounded border-stone-300 text-emerald-800" />
          Language
        </Label>
      </div>
      <div className="md:col-span-2">
        <Button type="submit">{subject ? "Save subject" : "Add subject"}</Button>
      </div>
    </form>
  );
}

export function CurriculumChapterForm({
  subjectId,
  chapter,
}: {
  subjectId: string;
  chapter?: { id: string; name: string; stableKey: string; sequence: number; sourceUrl: string | null; verificationStatus: string };
}) {
  return (
    <form action={saveCurriculumChapter} className="grid gap-4">
      <input type="hidden" name="subjectId" value={subjectId} />
      {chapter ? <input type="hidden" name="id" value={chapter.id} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Label>
          Chapter
          <Input name="name" defaultValue={chapter?.name ?? ""} required />
        </Label>
        <Label>
          Stable key
          <Input name="stableKey" defaultValue={chapter?.stableKey ?? ""} placeholder="fractions" />
        </Label>
        <Label>
          Sequence
          <Input name="sequence" type="number" min="0" defaultValue={chapter?.sequence ?? 0} />
        </Label>
        <Label>
          Source URL
          <Input name="sourceUrl" defaultValue={chapter?.sourceUrl ?? ""} />
        </Label>
      </div>
      {chapter ? null : (
        <Label>
          Bulk add chapters
          <Textarea name="bulkItems" placeholder="One chapter per line" />
        </Label>
      )}
      <Label>
        Verification
        <Select name="verificationStatus" defaultValue={chapter?.verificationStatus ?? "REVIEW_REQUIRED"}>
          <option value="OFFICIAL">Official</option>
          <option value="VERIFIED_FROM_OFFICIAL_SOURCE">Verified from official source</option>
          <option value="CURATED_FROM_OFFICIAL_SOURCE">Curated from official source</option>
          <option value="REVIEW_REQUIRED">Review required</option>
        </Select>
      </Label>
      <Button type="submit">{chapter ? "Save chapter" : "Add chapter"}</Button>
    </form>
  );
}

export function CurriculumTopicForm({
  chapterId,
  topic,
}: {
  chapterId: string;
  topic?: { id: string; name: string; stableKey: string; sequence: number; sourceUrl: string | null; verificationStatus: string };
}) {
  return (
    <form action={saveCurriculumTopic} className="grid gap-4">
      <input type="hidden" name="chapterId" value={chapterId} />
      {topic ? <input type="hidden" name="id" value={topic.id} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Label>
          Topic
          <Input name="name" defaultValue={topic?.name ?? ""} required />
        </Label>
        <Label>
          Stable key
          <Input name="stableKey" defaultValue={topic?.stableKey ?? ""} placeholder="equivalent-fractions" />
        </Label>
        <Label>
          Sequence
          <Input name="sequence" type="number" min="0" defaultValue={topic?.sequence ?? 0} />
        </Label>
        <Label>
          Source URL
          <Input name="sourceUrl" defaultValue={topic?.sourceUrl ?? ""} />
        </Label>
      </div>
      {topic ? null : (
        <Label>
          Bulk add topics
          <Textarea name="bulkItems" placeholder="One topic per line" />
        </Label>
      )}
      <Label>
        Verification
        <Select name="verificationStatus" defaultValue={topic?.verificationStatus ?? "REVIEW_REQUIRED"}>
          <option value="OFFICIAL">Official</option>
          <option value="VERIFIED_FROM_OFFICIAL_SOURCE">Verified from official source</option>
          <option value="CURATED_FROM_OFFICIAL_SOURCE">Curated from official source</option>
          <option value="REVIEW_REQUIRED">Review required</option>
        </Select>
      </Label>
      <Button type="submit">{topic ? "Save topic" : "Add topic"}</Button>
    </form>
  );
}

export function ArchiveButton({ action, id, label }: { action: (formData: FormData) => Promise<void>; id: string; label: string }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost">
        {label}
      </Button>
    </form>
  );
}
