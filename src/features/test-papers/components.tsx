import Link from "next/link";
import {
  OnlineTestAttemptStatus,
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
import { TestPaperCreatePicker } from "./create-picker";
import {
  acceptAiOnlineTestMarksAction,
  activateTestTemplateAction,
  addTestTemplateRuleAction,
  addTestTemplateSectionAction,
  archiveTestTemplateAction,
  cloneTestTemplateAction,
  createTestTemplateAction,
  deleteFailedOnlineTestPapersAction,
  deleteOnlineTestPaperAction,
  deleteTestTemplateRuleAction,
  deleteTestTemplateSectionAction,
  startOnlineTestAttemptAction,
  updateTestTemplateAction,
  updateTestTemplateRuleAction,
  updateTestTemplateSectionAction,
} from "./actions";
import { allowedQuestionTypesForSubject, supportedTestPaperSubjects, type OnlineTestPaperTree } from "./service";
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

function templateValidationMessages(template: Template | null) {
  if (!template) return ["Create a template first."];

  const messages: string[] = [];
  const allowedTypes = allowedQuestionTypesForSubject(template.subjectName);
  const ruleTotal = template.sections.reduce((sum, section) => sum + section.rules.reduce((ruleSum, rule) => ruleSum + rule.questionCount * rule.marksPerQuestion, 0), 0);
  const ruleCount = template.sections.reduce((sum, section) => sum + section.rules.length, 0);

  if (!template.sections.length) messages.push("Add at least one section.");
  if (!ruleCount) messages.push("Add at least one question rule.");
  if (ruleTotal !== template.totalMarks) messages.push(`Rules total must equal ${template.totalMarks} marks. Current total is ${ruleTotal}.`);

  for (const section of template.sections) {
    for (const rule of section.rules) {
      if (!allowedTypes.has(rule.questionType)) {
        messages.push(`${questionTypeLabel(rule.questionType)} is not valid for ${template.subjectName}.`);
      }
      if (rule.questionCount <= 0 || rule.marksPerQuestion <= 0) {
        messages.push("Every rule needs positive question count and marks.");
      }
    }
  }

  return [...new Set(messages)];
}

export function TestTemplateAdminView({ templates, selectedTemplate }: { templates: Template[]; selectedTemplate?: Template | null }) {
  const active = selectedTemplate ?? templates[0] ?? null;
  const ruleTotal = active?.sections.reduce((sum, section) => sum + section.rules.reduce((ruleSum, rule) => ruleSum + rule.questionCount * rule.marksPerQuestion, 0), 0) ?? 0;
  const validationMessages = templateValidationMessages(active);
  const canActivate = active ? validationMessages.length === 0 && active.status !== TestTemplateStatus.ACTIVE : false;

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
              {validationMessages.length ? (
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <p className="font-semibold">Complete these before activation</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {validationMessages.map((message) => <li key={message}>{message}</li>)}
                  </ul>
                </div>
              ) : (
                <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                  Template is ready to activate.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <form action={activateTestTemplateAction}>
                <input type="hidden" name="templateId" value={active.id} />
                <Button type="submit" pendingText="Activating..." disabled={!canActivate}>Activate</Button>
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

          <form action={updateTestTemplateAction} className="mt-5 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(180px,1fr)_160px_130px_150px_auto] lg:items-end">
            <input type="hidden" name="templateId" value={active.id} />
            <Label>
              Template name
              <Input name="name" defaultValue={active.name} required />
            </Label>
            <Label>
              Subject
              <Select name="subjectName" defaultValue={active.subjectName} required>
                {supportedTestPaperSubjects.map((subject) => <option key={subject}>{subject}</option>)}
              </Select>
            </Label>
            <Label>
              Total marks
              <Input name="totalMarks" type="number" min="1" defaultValue={active.totalMarks} required />
            </Label>
            <Label>
              Duration
              <Input name="durationMinutes" type="number" min="1" defaultValue={active.durationMinutes} required />
            </Label>
            <input type="hidden" name="difficulty" value={active.difficulty} />
            <Button type="submit" variant="secondary" pendingText="Saving...">Save basics</Button>
          </form>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-3">
              {active.sections.map((section) => (
                <div key={section.id} className="rounded-md border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{section.name}</p>
                      {section.instructions ? <p className="mt-1 text-sm text-slate-600">{section.instructions}</p> : null}
                    </div>
                    <form action={deleteTestTemplateSectionAction}>
                      <input type="hidden" name="sectionId" value={section.id} />
                      <Button type="submit" variant="ghost" className="text-red-700 hover:bg-red-50 hover:text-red-800" pendingText="Deleting...">Delete section</Button>
                    </form>
                  </div>
                  <form action={updateTestTemplateSectionAction} className="mt-3 grid gap-2 rounded-md bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                    <input type="hidden" name="templateId" value={active.id} />
                    <input type="hidden" name="sectionId" value={section.id} />
                    <Label>
                      Section name
                      <Input name="name" defaultValue={section.name} required />
                    </Label>
                    <Label>
                      Instructions
                      <Input name="instructions" defaultValue={section.instructions ?? ""} />
                    </Label>
                    <Button type="submit" variant="secondary" pendingText="Saving...">Save section</Button>
                  </form>
                  <div className="mt-3 grid gap-2">
                    {section.rules.map((rule) => (
                      <form key={rule.id} action={updateTestTemplateRuleAction} className="grid gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm md:grid-cols-[minmax(150px,1fr)_100px_100px_130px_auto_auto] md:items-center">
                        <input type="hidden" name="sectionId" value={section.id} />
                        <input type="hidden" name="ruleId" value={rule.id} />
                        <Select name="questionType" defaultValue={rule.questionType} aria-label="Question type" required>
                          {Object.values(OnlineTestQuestionType)
                            .filter((type) => allowedQuestionTypesForSubject(active.subjectName).has(type))
                            .map((type) => <option key={type}>{type}</option>)}
                        </Select>
                        <Input name="questionCount" type="number" min="1" defaultValue={rule.questionCount} aria-label="Question count" required />
                        <Input name="marksPerQuestion" type="number" min="1" defaultValue={rule.marksPerQuestion} aria-label="Marks per question" required />
                        <Select name="difficulty" defaultValue={rule.difficulty} aria-label="Difficulty">
                          {["EASY", "MEDIUM", "HARD", "MIXED"].map((value) => <option key={value}>{value}</option>)}
                        </Select>
                        <Button type="submit" variant="secondary" pendingText="Saving...">Save</Button>
                        <Button formAction={deleteTestTemplateRuleAction} type="submit" variant="ghost" className="text-red-700 hover:bg-red-50 hover:text-red-800" pendingText="Deleting...">Delete</Button>
                      </form>
                    ))}
                  </div>
                  <form action={addTestTemplateRuleAction} className="mt-3 grid gap-2 sm:grid-cols-4">
                    <input type="hidden" name="sectionId" value={section.id} />
                    <Select name="questionType" required>
                      {Object.values(OnlineTestQuestionType)
                        .filter((type) => allowedQuestionTypesForSubject(active.subjectName).has(type))
                        .map((type) => <option key={type}>{type}</option>)}
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

export function TestPaperList({ papers, hrefBase, newHref, canDelete = false }: { papers: any[]; hrefBase: string; newHref: string; canDelete?: boolean }) {
  const hasFailedPapers = papers.some((paper) => paper.status === OnlineTestPaperStatus.FAILED);

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-800">AI</p>
          <h1 className="text-3xl font-semibold tracking-tight">Online Test Papers</h1>
          <p className="mt-2 text-sm text-slate-600">Generate and take subject-level tests for Mathematics, Science, and English.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canDelete && hasFailedPapers ? (
            <form action={deleteFailedOnlineTestPapersAction}>
              <Button type="submit" variant="danger" pendingText="Deleting...">Delete failed</Button>
            </form>
          ) : null}
          <Link href={newHref}><Button type="button">New test paper</Button></Link>
        </div>
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
                {canDelete ? (
                  <form action={deleteOnlineTestPaperAction}>
                    <input type="hidden" name="paperId" value={paper.id} />
                    <Button type="submit" variant="ghost" className="text-red-700 hover:bg-red-50 hover:text-red-800" pendingText="Deleting...">Delete</Button>
                  </form>
                ) : null}
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
        <TestPaperCreatePicker childOptions={children} templates={data.templates} kidMode={kidMode} />
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
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={statusTone(paper.status)}>{paper.status.replaceAll("_", " ")}</Badge>
          {parentMode ? (
            <form action={deleteOnlineTestPaperAction}>
              <input type="hidden" name="paperId" value={paper.id} />
              <Button type="submit" variant="danger" pendingText="Deleting...">Delete paper</Button>
            </form>
          ) : null}
        </div>
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
          <CardTitle>{parentMode ? "Open test player" : "Ready to take"}</CardTitle>
          <p className="mt-2 text-sm text-slate-600">
            {parentMode
              ? "Open the answer screen for this paper. The kid can also solve it after signing in from Online Test Papers."
              : "This paper is online. Start when you are ready."}
          </p>
          <form action={startOnlineTestAttemptAction} className="mt-4">
            <input type="hidden" name="paperId" value={paper.id} />
            <Button type="submit">{parentMode ? "Open answer screen" : "Start test"}</Button>
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
