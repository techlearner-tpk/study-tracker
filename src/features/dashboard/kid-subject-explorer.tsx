"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type KidTopic = {
  id: string;
  name: string;
  status: string;
};

type KidChapter = {
  id: string;
  name: string;
  topics: KidTopic[];
};

export type KidSubject = {
  id: string;
  name: string;
  color: string;
  chapters: KidChapter[];
};

function progressFor(topics: KidTopic[]) {
  const completed = topics.filter((topic) => topic.status === "COMPLETED").length;
  return {
    completed,
    percentage: topics.length ? Math.round((completed / topics.length) * 100) : 0,
  };
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}

function includes(value: string, query: string) {
  return value.toLowerCase().includes(query);
}

export function KidSubjectExplorer({ subjects }: { subjects: KidSubject[] }) {
  const [query, setQuery] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id ?? "");
  const [selectedChapterId, setSelectedChapterId] = useState(subjects[0]?.chapters[0]?.id ?? "");
  const normalizedQuery = query.trim().toLowerCase();

  const visibleSubjects = normalizedQuery
    ? subjects.filter((subject) =>
        includes(subject.name, normalizedQuery) ||
        subject.chapters.some((chapter) =>
          includes(chapter.name, normalizedQuery) ||
          chapter.topics.some((topic) => includes(topic.name, normalizedQuery)),
        ),
      )
    : subjects;
  const activeSubject = visibleSubjects.find((subject) => subject.id === selectedSubjectId) ?? visibleSubjects[0] ?? null;
  const subjectMatches = activeSubject ? includes(activeSubject.name, normalizedQuery) : false;
  const visibleChapters = activeSubject
    ? normalizedQuery && !subjectMatches
      ? activeSubject.chapters.filter((chapter) =>
          includes(chapter.name, normalizedQuery) || chapter.topics.some((topic) => includes(topic.name, normalizedQuery)),
        )
      : activeSubject.chapters
    : [];
  const activeChapter = visibleChapters.find((chapter) => chapter.id === selectedChapterId) ?? visibleChapters[0] ?? null;
  const chapterMatches = activeChapter ? includes(activeChapter.name, normalizedQuery) : false;
  const visibleTopics = activeChapter
    ? normalizedQuery && !subjectMatches && !chapterMatches
      ? activeChapter.topics.filter((topic) => includes(topic.name, normalizedQuery))
      : activeChapter.topics
    : [];

  function selectSubject(subject: KidSubject) {
    setSelectedSubjectId(subject.id);
    setSelectedChapterId(subject.chapters[0]?.id ?? "");
  }

  return (
    <div className="grid gap-5">
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Subject map</CardTitle>
            <p className="mt-2 text-sm text-slate-600">Choose a subject and chapter, or search for any topic.</p>
          </div>
          <div className="relative w-full lg:w-80">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search subjects, chapters, or topics"
              className="pl-9 pr-10"
              aria-label="Search subjects, chapters, or topics"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                aria-label="Clear subject search"
                title="Clear search"
              >
                <X size={16} />
              </button>
            ) : null}
          </div>
        </div>

        {visibleSubjects.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {visibleSubjects.map((subject) => {
              const topics = subject.chapters.flatMap((chapter) => chapter.topics);
              const progress = progressFor(topics);
              const active = subject.id === activeSubject?.id;
              return (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => selectSubject(subject)}
                  className="min-h-32 rounded-lg border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  style={{
                    borderColor: active ? subject.color : `${subject.color}44`,
                    background: `linear-gradient(135deg, ${subject.color}12, #ffffff 82%)`,
                    boxShadow: active ? `inset 0 -3px 0 ${subject.color}` : undefined,
                  }}
                  aria-pressed={active}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block font-semibold text-slate-950">{subject.name}</span>
                      <span className="mt-1 block text-sm text-slate-600">{subject.chapters.length} chapters | {topics.length} topics</span>
                    </span>
                    <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: subject.color }} />
                  </span>
                  <span className="mt-4 flex justify-between text-xs text-slate-500"><span>{progress.completed} completed</span><span>{progress.percentage}%</span></span>
                  <span className="mt-2 block h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full" style={{ width: `${progress.percentage}%`, backgroundColor: subject.color }} /></span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-md border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">No subjects, chapters, or topics match "{query}".</div>
        )}
      </Card>

      {activeSubject ? (
        <Card style={{ borderColor: `${activeSubject.color}55` }}>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <div className="flex items-center gap-3"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: activeSubject.color }} /><CardTitle className="text-xl">{activeSubject.name}</CardTitle></div>
              <p className="mt-2 text-sm text-slate-600">Select a chapter to see all its topics.</p>
            </div>
            <SubjectProgress subject={activeSubject} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-sm font-semibold text-slate-700">Chapters</p>
              <div className="mt-3 grid gap-2">
                {visibleChapters.map((chapter) => {
                  const chapterProgress = progressFor(chapter.topics);
                  const active = chapter.id === activeChapter?.id;
                  return (
                    <button
                      key={chapter.id}
                      type="button"
                      onClick={() => setSelectedChapterId(chapter.id)}
                      className={cn("flex min-w-0 items-center justify-between gap-3 rounded-md border px-3 py-3 text-left text-sm transition hover:bg-white", active ? "bg-white" : "bg-transparent")}
                      style={{ borderColor: active ? `${activeSubject.color}88` : "#e2e8f0" }}
                      aria-pressed={active}
                    >
                      <span className="min-w-0"><span className="block break-words font-medium leading-snug text-slate-800">{chapter.name}</span><span className="block text-xs text-slate-500">{chapter.topics.length} topics | {chapterProgress.percentage}%</span></span>
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full border" style={{ borderColor: activeSubject.color, backgroundColor: active ? activeSubject.color : "transparent" }} />
                    </button>
                  );
                })}
                {!visibleChapters.length ? <p className="text-sm text-slate-500">No matching chapters.</p> : null}
              </div>
            </div>

            <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-4">
              {activeChapter ? (
                <>
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div><p className="break-words font-semibold text-slate-950">Topics in {activeChapter.name}</p><p className="mt-1 text-sm text-slate-500">Chapter progress {progressFor(activeChapter.topics).percentage}%</p></div>
                    <div className="w-full sm:w-56"><Progress value={progressFor(activeChapter.topics).percentage} /></div>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {visibleTopics.map((topic) => (
                      <Link key={topic.id} href={`/kid/topics/${topic.id}`} className="flex min-h-12 items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2.5 transition hover:border-emerald-200 hover:bg-emerald-50">
                        <span className="min-w-0 break-words font-medium text-slate-950">{topic.name}</span>
                        <span className="flex shrink-0 items-center gap-2"><Badge>{statusLabel(topic.status)}</Badge><ChevronRight size={17} className="text-slate-400" /></span>
                      </Link>
                    ))}
                    {!visibleTopics.length ? <p className="text-sm text-slate-500">No matching topics in this chapter.</p> : null}
                  </div>
                </>
              ) : <p className="text-sm text-slate-500">Select a chapter to see its topics.</p>}
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function SubjectProgress({ subject }: { subject: KidSubject }) {
  const topics = subject.chapters.flatMap((chapter) => chapter.topics);
  const progress = progressFor(topics);
  return <div className="w-full sm:w-56"><div className="mb-2 flex justify-between text-sm text-slate-600"><span>{progress.percentage}% complete</span><span>{progress.completed}/{topics.length}</span></div><Progress value={progress.percentage} /></div>;
}
