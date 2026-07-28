"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/form";
import { submitOnlineTestAttemptAction } from "./actions";
import type { OnlineTestPaperTree } from "./service";

export function OnlineTestTakeForm({ paper, attemptId, backHref }: { paper: OnlineTestPaperTree; attemptId: string; backHref: string }) {
  const questions = useMemo(() => paper.sections.flatMap((section) => section.questions.map((question) => ({ ...question, sectionName: section.name }))), [paper.sections]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const storageKey = `study-tracker.online-test.${paper.id}.${attemptId}`;
  const question = questions[current];

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) setAnswers(JSON.parse(stored));
  }, [storageKey]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      window.localStorage.setItem(storageKey, JSON.stringify(answers));
    }, 5000);
    return () => window.clearInterval(timer);
  }, [answers, storageKey]);

  return (
    <div className="grid gap-6">
      <header>
        <p className="text-sm text-slate-600">{paper.subject.name} | {paper.child.className}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{paper.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{paper.totalMarks} marks | {paper.durationMinutes} minutes | Question {current + 1} of {questions.length}</p>
      </header>

      <form action={submitOnlineTestAttemptAction} className="grid gap-5">
        <input type="hidden" name="paperId" value={paper.id} />
        <input type="hidden" name="attemptId" value={attemptId} />
        {questions.map((item) => (
          <input key={item.id} type="hidden" name={`answer_${item.id}`} value={answers[item.id] ?? ""} readOnly />
        ))}

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{question.sectionName}</CardTitle>
              <p className="mt-3 text-lg font-semibold">{question.questionText}</p>
              <p className="mt-2 text-sm text-slate-600">{question.marks} marks</p>
            </div>
            <span className="rounded-md bg-slate-50 px-2 py-1 text-xs">{question.questionType.replaceAll("_", " ")}</span>
          </div>

          <div className="mt-5">
            {Array.isArray(question.optionsJson) ? (
              <div className="grid gap-2">
                {question.optionsJson.map((option) => (
                  <label key={String(option)} className="flex items-center gap-2 rounded-md border border-slate-200 p-3 text-sm">
                    <input
                      type="radio"
                      name={`visible_${question.id}`}
                      checked={(answers[question.id] ?? "") === String(option)}
                      onChange={() => setAnswers((currentAnswers) => ({ ...currentAnswers, [question.id]: String(option) }))}
                    />
                    <span>{String(option)}</span>
                  </label>
                ))}
              </div>
            ) : question.marks <= 2 ? (
              <Input
                value={answers[question.id] ?? ""}
                onChange={(event) => setAnswers((currentAnswers) => ({ ...currentAnswers, [question.id]: event.target.value }))}
                placeholder="Type your answer"
              />
            ) : (
              <Textarea
                value={answers[question.id] ?? ""}
                onChange={(event) => setAnswers((currentAnswers) => ({ ...currentAnswers, [question.id]: event.target.value }))}
                placeholder="Type your answer"
              />
            )}
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button type="button" variant="secondary" disabled={current === 0} onClick={() => setCurrent((value) => Math.max(0, value - 1))}>Previous</Button>
            <Button type="button" variant="secondary" disabled={current === questions.length - 1} onClick={() => setCurrent((value) => Math.min(questions.length - 1, value + 1))}>Next</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {questions.map((item, index) => (
              <Button key={item.id} type="button" variant={index === current ? "primary" : "secondary"} className="h-9 w-9 p-0" onClick={() => setCurrent(index)}>
                {index + 1}
              </Button>
            ))}
          </div>
          <Button type="submit" pendingText="Submitting...">Submit test</Button>
        </div>
        <a href={backHref} className="text-sm text-emerald-800 hover:underline">Back to paper</a>
      </form>
    </div>
  );
}
