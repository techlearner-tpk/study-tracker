import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { CurriculumActions, CurriculumClassForm, CurriculumChapterForm, CurriculumSubjectForm, CurriculumTopicForm, CurriculumVersionForm, ArchiveButton } from "@/features/curriculum/components";
import { archiveCurriculumChapter, archiveCurriculumSubject, archiveCurriculumTopic } from "@/features/curriculum/actions";
import { loadCurriculumVersionTree, summarizeTree } from "@/features/curriculum/service";
import { requireParentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function filterVersion(version: Awaited<ReturnType<typeof loadCurriculumVersionTree>>, q: string) {
  if (!version || !q) return version;
  const query = q.toLowerCase();
  const matches = (value: string) => value.toLowerCase().includes(query);
  const classes = version.classes
    .map((curriculumClass) => {
      const subjects = curriculumClass.subjects
        .map((subject) => {
          const chapters = subject.chapters
            .map((chapter) => {
              const topics = chapter.topics.filter((topic) => matches(topic.name) || matches(topic.stableKey));
              if (matches(chapter.name) || matches(chapter.stableKey) || topics.length) {
                return { ...chapter, topics };
              }
              return null;
            })
            .filter(Boolean);
          if (matches(subject.name) || matches(subject.stableKey) || chapters.length) {
            return { ...subject, chapters: chapters as typeof subject.chapters };
          }
          return null;
        })
        .filter(Boolean);
      if (matches(curriculumClass.name) || matches(curriculumClass.stableKey) || subjects.length) {
        return { ...curriculumClass, subjects: subjects as typeof curriculumClass.subjects };
      }
      return null;
    })
    .filter(Boolean);

  return { ...version, classes: classes as typeof version.classes };
}

export default async function CurriculumVersionPage({
  params,
  searchParams,
}: {
  params: Promise<{ versionId: string }>;
  searchParams: Promise<{ q?: string; preview?: string }>;
}) {
  await requireParentUser();
  const { versionId } = await params;
  const { q = "", preview } = await searchParams;
  const version = await loadCurriculumVersionTree(versionId);
  if (!version) notFound();

  const filtered = filterVersion(version, q);
  const editable = version.status === "DRAFT" && preview !== "1";
  const counts = summarizeTree(filtered ?? version);

  return (
    <AppShell>
      <div className="grid gap-6">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500">
            <Link href="/admin/curriculum" className="hover:text-stone-900">
              Curriculum
            </Link>
            <span>/</span>
            <span>{version.board.code}</span>
            <span>/</span>
            <span>{version.academicYear}</span>
            <span>/</span>
            <span>{version.version}</span>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-emerald-800">{version.board.name}</p>
                <Badge>{version.status}</Badge>
                <Badge>{version.verificationStatus}</Badge>
                {preview === "1" ? <Badge>Preview</Badge> : null}
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">{version.name}</h1>
              <p className="text-sm text-stone-600">
                {version.academicYear} · {version.version} · {counts.classes} classes · {counts.subjects} subjects · {counts.chapters} chapters · {counts.topics} topics
              </p>
            </div>
            <CurriculumActions version={filtered ?? version} />
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Version details</CardTitle>
              <form className="flex items-center gap-2">
                <input name="q" defaultValue={q} placeholder="Search classes, subjects, chapters, topics" className="h-10 rounded-md border border-stone-300 bg-white px-3 text-sm" />
                <button type="submit" className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-medium hover:bg-stone-100">
                  Search
                </button>
              </form>
            </div>
            <div className="mt-4">{editable ? <CurriculumVersionForm version={version} /> : <p className="text-sm text-stone-600">Published curricula are read only. Clone to edit.</p>}</div>
          </Card>

          <Card>
            <CardTitle>Admin notes</CardTitle>
            <div className="mt-4 grid gap-2 text-sm text-stone-600">
              <p>Published versions cannot be edited in place.</p>
              <p>Bulk add chapters or topics one per line inside each subject or chapter panel.</p>
              <p>Archive rows before removing them from the active tree.</p>
            </div>
          </Card>
        </section>

        {editable ? (
          <Card>
            <CardTitle>Add class</CardTitle>
            <div className="mt-4">
              <CurriculumClassForm versionId={version.id} />
            </div>
          </Card>
        ) : null}

        <section className="grid gap-4">
          {filtered?.classes.map((curriculumClass) => (
            <Card key={curriculumClass.id}>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">{curriculumClass.name}</CardTitle>
                    <p className="text-sm text-stone-600">Level {curriculumClass.level} · {curriculumClass.subjects.length} subjects</p>
                  </div>
                </div>
                {editable ? (
                  <CurriculumClassForm versionId={version.id} curriculumClass={curriculumClass} />
                ) : null}

                <div className="grid gap-4">
                  {curriculumClass.subjects.map((subject) => (
                    <div key={subject.id} className="rounded-md border border-stone-200 bg-stone-50 p-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-stone-900">{subject.name}</h3>
                          {subject.isDefaultSelected ? <Badge>Default</Badge> : null}
                          {subject.isOptional ? <Badge>Optional</Badge> : null}
                          {subject.isLanguageSubject ? <Badge>Language</Badge> : null}
                          <Badge>{subject.verificationStatus}</Badge>
                        </div>
                        <p className="text-sm text-stone-600">{subject.chapters.length} chapters</p>
                        {editable ? (
                          <div className="grid gap-3">
                            <CurriculumSubjectForm classId={curriculumClass.id} subject={subject} />
                            <ArchiveButton action={archiveCurriculumSubject} id={subject.id} label="Archive subject" />
                          </div>
                        ) : null}
                        <div className="grid gap-3">
                          {subject.chapters.map((chapter) => (
                            <div key={chapter.id} className="rounded-md border border-stone-200 bg-white p-4">
                              <div className="flex flex-col gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-sm font-semibold text-stone-900">{chapter.name}</h4>
                                  <Badge>{chapter.verificationStatus}</Badge>
                                </div>
                                <p className="text-xs text-stone-500">{chapter.topics.length} topics</p>
                                {editable ? (
                                  <div className="grid gap-3">
                                    <CurriculumChapterForm subjectId={subject.id} chapter={chapter} />
                                    <ArchiveButton action={archiveCurriculumChapter} id={chapter.id} label="Archive chapter" />
                                  </div>
                                ) : null}
                                <div className="grid gap-2">
                                  {chapter.topics.map((topic) => (
                                    <div key={topic.id} className="rounded-md border border-stone-200 bg-stone-50 p-3">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-medium text-stone-900">{topic.name}</p>
                                        <Badge>{topic.verificationStatus}</Badge>
                                      </div>
                                      <p className="text-xs text-stone-500">Sequence {topic.sequence}</p>
                                      {editable ? (
                                        <div className="mt-3 grid gap-3">
                                          <CurriculumTopicForm chapterId={chapter.id} topic={topic} />
                                          <ArchiveButton action={archiveCurriculumTopic} id={topic.id} label="Archive topic" />
                                        </div>
                                      ) : null}
                                    </div>
                                  ))}
                                  {editable ? <CurriculumTopicForm chapterId={chapter.id} /> : null}
                                </div>
                              </div>
                            </div>
                          ))}
                          {editable ? <CurriculumChapterForm subjectId={subject.id} /> : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </section>
      </div>
    </AppShell>
  );
}

