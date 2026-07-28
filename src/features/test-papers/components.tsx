import Link from "next/link";
import {
  OnlineTestAttemptStatus,
  OnlineTestPaperSource,
  OnlineTestPaperStatus,
  OnlineTestQuestionType,
  TestTemplateStatus,
} from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { AiCautionNote } from "@/features/ai/components";
import {
  acceptAiOnlineTestMarksAction,
  activateTestTemplateAction,
  addTestTemplateRuleAction,
  addTestTemplateSectionAction,
  archiveTestTemplateAction,
  cloneTestTemplateAction,
  createTestTemplateAction,
  generateOnlineTestPaperAction,
  startOnlineTestAttemptAction,
} from "./actions";
import { supportedTestPaperSubjects, type OnlineTestPaperTree } from "./service";
import { OnlineTestTakeForm } from "./take-form";

type Template = Awaited<ReturnType<typeof import("./queries").loadTestTemplatesForAdmin>>[number];
type SelectionData = Awaited<ReturnType<typeof import("./service").loadTestPaperSelectionForParent>>;

function statusTone(status: string) {
  if (status === "ACTIVE" || status === "EVALUATED") return "bg-emerald-50 text-emerald-800";
  if (status === "FAILED" || status === "ARCHIVED") return "bg-red-50 text-red-800";
  if (status === "NEEDS_REVIEW" || status === "SUBMITTED") return "bg-amber-50 text-amber-800";
  return "bg-slate-50 text-slate-700";
}

function questionTypeLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}

export function TestTemplateAdminView({ templates, selectedTemplate }: { templates: Template[]; selectedTemplate?: Template | null }) {
  const active = selectedTemplate ?? templates[0] ?? null;
  const ruleTotal = active?.sections.reduce((sum, section) => sum + section.rules.reduce((ruleSum, rule) => ruleSum + rule.questionCount * rule.marksPerQuestion, 0), 0) ?? 0;

  return (
    <div className="grid gap-6">
      <header>
        <p className="text-sm font-medium text-emerald-800">Admin</p>
        <h1 className="text-3xl font-semibold tracking-tight">Test Templates</h1>
        <p className="mt-2 text-sm text-slate-600">Configure subject-specific online test paper blueprints.</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardTitle>Create template</CardTitle>
          <form action={createTestTemplateAction} className="mt-4 grid gap-3">
            <Label>
              Name
              <Input name="name" placeholder="Mathematics Quick Test" required />
            </Label>
            <Label>
              Subject
              <Select name="subjectName" required>
                {supportedTestPaperSubjects.map((subject) => <option key={subject}>{subject}</option>)}
              </Select>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Label>
                Total marks
                <Input name="totalMarks" type="number" min="1" defaultValue="10" required />
              </Label>
              <Label>
                Duration
                <Input name="durationMinutes" type="number" min="1" defaultValue="20" required />
              </Label>
            </div>
            <Label>
              Difficulty
              <Select name="difficulty" defaultValue="MIXED">
                {["EASY", "MEDIUM", "HARD", "MIXED"].map((value) => <option key={value}>{value}</option>)}
              </Select>
            </Label>
            <Button type="submit" pendingText="Creating...">Create template</Button>
          </form>
        </Card>

        <Card>
          <CardTitle>Templates</CardTitle>
          <div className="mt-4 grid gap-3">
            {templates.map((template) => (
              <Link key={template.id} href={`/admin/test-templates?templateId=${template.id}`} className="rounded-md border border-slate-200 p-3 hover:bg-emerald-50">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{template.name}</p>
                    <p className="text-sm text-slate-600">{template.subjectName} | {template.totalMarks} marks | {template.durationMinutes} min</p>
                  </div>
                  <Badge className={statusTone(template.status)}>{template.status}</Badge>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </section>

      {active ? (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{active.name}</CardTitle>
              <p className="mt-1 text-sm text-slate-600">
                {active.subjectName} | rules total {ruleTotal}/{active.totalMarks} marks
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <form action={activateTestTemplateAction}>
                <input type="hidden" name="templateId" value={active.id} />
                <Button type="submit" pendingText="Activating...">Activate</Button>
              </form>
              <form action={cloneTestTemplateAction}>
                <input type="hidden" name="templateId" value={active.id} />
                <Button type="submit" variant="secondary">Clone</Button>
              </form>
              <form action={archiveTestTemplateAction}>
                <input type="hidden" name="templateId" value={active.id} />
                <Button type="submit" variant="ghost">Archive</Button>
              </form>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-3">
              {active.sections.map((section) => (
                <div key={section.id} className="rounded-md border border-slate-200 p-4">
                  <p className="font-semibold">{section.name}</p>
                  {section.instructions ? <p className="mt-1 text-sm text-slate-600">{section.instructions}</p> : null}
                  <div className="mt-3 grid gap-2">
                    {section.rules.map((rule) => (
                      <div key={rule.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm">
                        <span>{questionTypeLabel(rule.questionType)}</span>
                        <span>{rule.questionCount} x {rule.marksPerQuestion} marks | {rule.difficulty}</span>
                      </div>
                    ))}
                  </div>
                  <form action={addTestTemplateRuleAction} className="mt-3 grid gap-2 sm:grid-cols-4">
                    <input type="hidden" name="sectionId" value={section.id} />
                    <Select name="questionType" required>
                      {Object.values(OnlineTestQuestionType).map((type) => <option key={type}>{type}</option>)}
                    </Select>
                    <Input name="questionCount" type="number" min="1" placeholder="Count" required />
                    <Input name="marksPerQuestion" type="number" min="1" placeholder="Marks" required />
                    <Button type="submit" variant="secondary">Add rule</Button>
                  </form>
                </div>
              ))}
            </div>
            <Card className="bg-slate-50 shadow-none">
              <CardTitle>Add section</CardTitle>
              <form action={addTestTemplateSectionAction} className="mt-4 grid gap-3">
                <input type="hidden" name="templateId" value={active.id} />
                <Label>
                  Section name
                  <Input name="name" required />
                </Label>
                <Label>
                  Instructions
                  <Input name="instructions" />
                </Label>
                <Button type="submit">Add section</Button>
              </form>
            </Card>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

export function TestPaperList({ papers, hrefBase, newHref }: { papers: any[]; hrefBase: string; newHref: string }) {
  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-800">AI</p>
          <h1 className="text-3xl font-semibold tracking-tight">Online Test Papers</h1>
          <p className="mt-2 text-sm text-slate-600">Generate and take subject-level tests for Mathematics, Science, and English.</p>
        </div>
        <Link href={newHref}><Button type="button">New test paper</Button></Link>
      </header>
      <AiCautionNote />
      <div className="grid gap-3">
        {papers.length ? papers.map((paper) => (
          <Card key={paper.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{paper.title}</p>
                <p className="text-sm text-slate-600">{paper.child.name} | {paper.subject.name} | {paper.totalMarks} marks | {paper.durationMinutes} min</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={statusTone(paper.status)}>{paper.status.replaceAll("_", " ")}</Badge>
                <Link href={`${hrefBase}/${paper.id}`}><Button type="button" variant="secondary">Open</Button></Link>
              </div>
            </div>
          </Card>
        )) : (
          <Card>
            <CardTitle>No test papers yet</CardTitle>
            <p className="mt-2 text-sm text-slate-600">Create a paper from an active template.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

export function TestPaperCreateForm({ data, kidMode = false }: { data: SelectionData | { child: SelectionData["children"][number]; templates: SelectionData["templates"] }; kidMode?: boolean }) {
  const children = "children" in data ? data.children : [data.child];
  return (
    <div className="grid gap-6">
      <header>
        <p className="text-sm font-medium text-emerald-800">AI</p>
        <h1 className="text-3xl font-semibold tracking-tight">New Online Test Paper</h1>
        <p className="mt-2 text-sm text-slate-600">Select a subject, template, and topics. The existing topic AI quota is used for every selected topic.</p>
      </header>
      <AiCautionNote />
      <Card>
        <form action={generateOnlineTestPaperAction} className="grid gap-5">
          <input type="hidden" name="source" value={kidMode ? OnlineTestPaperSource.SELF_PRACTICE : OnlineTestPaperSource.ASSIGNED_BY_PARENT} />
          <div className="grid gap-4 lg:grid-cols-3">
            <Label>
              Child
              <Select name="childId" required>
                {children.map((child) => <option key={child.id} value={child.id}>{child.name} | {child.className}</option>)}
              </Select>
            </Label>
            <Label>
              Subject
              <Select name="subjectId" required>
                {children.flatMap((child) => child.subjects.map((subject) => <option key={subject.id} value={subject.id}>{child.name} | {subject.name}</option>))}
              </Select>
            </Label>
            <Label>
              Template
              <Select name="templateId" required>
                {data.templates.filter((template) => template.status === TestTemplateStatus.ACTIVE).map((template) => (
                  <option key={template.id} value={template.id}>{template.subjectName} | {template.name}</option>
                ))}
              </Select>
            </Label>
          </div>
          <div className="grid gap-3">
            <CardTitle>Select topics</CardTitle>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {children.flatMap((child) => child.subjects.flatMap((subject) => subject.chapters.map((chapter) => (
                <div key={chapter.id} className="rounded-md border border-slate-200 p-3">
                  <p className="font-semibold">{subject.name} | {chapter.name}</p>
                  <div className="mt-2 grid gap-2">
                    {chapter.topics.map((topic) => (
                      <label key={topic.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="topicIds" value={topic.id} />
                        <span>{topic.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))))}
            </div>
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
          <Button type="submit" pendingText="Generating paper...">Generate paper</Button>
        </form>
      </Card>
    </div>
  );
}

export function TestPaperDetail({ paper, hrefBase, canTake = false, parentMode = false }: { paper: OnlineTestPaperTree; hrefBase: string; canTake?: boolean; parentMode?: boolean }) {
  const attempt = paper.attempts[0];
  const earned = attempt?.finalMarks ?? attempt?.aiAwardedMarks ?? 0;
  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-slate-600">{paper.child.name} | {paper.subject.name}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{paper.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{paper.totalMarks} marks | {paper.durationMinutes} minutes | {paper.source.replaceAll("_", " ")}</p>
        </div>
        <Badge className={statusTone(paper.status)}>{paper.status.replaceAll("_", " ")}</Badge>
      </header>
      <AiCautionNote />
      {attempt?.status === OnlineTestAttemptStatus.EVALUATED || attempt?.status === OnlineTestAttemptStatus.NEEDS_REVIEW ? (
        <Card>
          <CardTitle>Result</CardTitle>
          <div className="mt-4 grid gap-3">
            <p className="text-3xl font-semibold">{earned}/{paper.totalMarks}</p>
            <Progress value={attempt.percentage ?? 0} />
            <p className="text-sm text-slate-600">{attempt.overallFeedback}</p>
            {parentMode && attempt.status === OnlineTestAttemptStatus.NEEDS_REVIEW ? (
              <form action={acceptAiOnlineTestMarksAction}>
                <input type="hidden" name="paperId" value={paper.id} />
                <Button type="submit">Accept AI marks</Button>
              </form>
            ) : null}
          </div>
        </Card>
      ) : canTake ? (
        <Card>
          <CardTitle>Ready to take</CardTitle>
          <p className="mt-2 text-sm text-slate-600">This paper is online. Start when the child is ready.</p>
          <form action={startOnlineTestAttemptAction} className="mt-4">
            <input type="hidden" name="paperId" value={paper.id} />
            <Button type="submit">Start test</Button>
          </form>
        </Card>
      ) : null}

      <Card>
        <CardTitle>Questions</CardTitle>
        <div className="mt-4 grid gap-4">
          {paper.sections.map((section) => (
            <div key={section.id} className="grid gap-3">
              <p className="font-semibold">{section.name}</p>
              {section.questions.map((question, index) => (
                <div key={question.id} className="rounded-md border border-slate-200 p-3">
                  <p className="font-medium">{index + 1}. {question.questionText}</p>
                  <p className="mt-1 text-xs text-slate-500">{question.topic.name} | {question.marks} marks</p>
                  {attempt?.answers.find((answer) => answer.questionId === question.id) ? (
                    <div className="mt-2 rounded-md bg-emerald-50 p-2 text-sm">
                      <p>{attempt.answers.find((answer) => answer.questionId === question.id)?.aiFeedback}</p>
                      <Link href={`/topics/${question.topicId}`} className="mt-1 inline-block text-emerald-800 hover:underline">Teach weak topic</Link>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function TestPaperTakeView({ paper, attemptId, hrefBase }: { paper: OnlineTestPaperTree; attemptId: string; hrefBase: string }) {
  return <OnlineTestTakeForm paper={paper} attemptId={attemptId} backHref={`${hrefBase}/${paper.id}`} />;
}
