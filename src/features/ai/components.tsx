import Link from "next/link";
import { randomUUID } from "node:crypto";
import { BookOpenText, Brain, CheckCircle2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/form";
import { buildGenerateTestPrompt } from "@/lib/ai/prompts/generate-test";
import { buildTeachTopicPrompt } from "@/lib/ai/prompts/teach-topic";
import { cn } from "@/lib/utils";
import { aiGeneratedTestSchema, aiTeachResultSchema } from "./schema";
import { deleteTopicAiHistoryAction, sendTeachMessageAction, startTeachSessionAction, startTestSessionAction, submitTopicTestAction } from "./actions";
import type { getAiSession, getTopicAiAccessState, getAssignmentAiAccessState } from "./service";

type TopicAccessState = Awaited<ReturnType<typeof getTopicAiAccessState>>;
type AssignmentAccessState = Awaited<ReturnType<typeof getAssignmentAiAccessState>>;
type AiSession = NonNullable<Awaited<ReturnType<typeof getAiSession>>>;

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function AiCautionNote() {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
      AI can make mistakes, so please double-check important answers with a parent, teacher, or the textbook.
    </div>
  );
}

function prettyJson(value: string) {
  const parsed = safeJsonParse(value);
  if (parsed === null) return value;
  return JSON.stringify(parsed, null, 2);
}

function storedPrompt(session: AiSession) {
  const message = session.messages.find((item) => item.role === "SYSTEM");
  if (!message) return null;
  const parsed = safeJsonParse(message.content);
  if (!parsed || typeof parsed !== "object") return null;
  const systemPrompt = "systemPrompt" in parsed ? String((parsed as { systemPrompt?: unknown }).systemPrompt ?? "") : "";
  const userPrompt = "userPrompt" in parsed ? String((parsed as { userPrompt?: unknown }).userPrompt ?? "") : "";
  if (!systemPrompt || !userPrompt) return null;
  return { system: systemPrompt, user: userPrompt };
}

function lessonFromSession(session: AiSession) {
  const assistantMessage = session.messages.find((message) => message.role === "ASSISTANT");
  if (!assistantMessage) return null;
  const parsed = safeJsonParse(assistantMessage.content);
  return aiTeachResultSchema.safeParse(parsed).success ? aiTeachResultSchema.parse(parsed) : null;
}

function lessonFromMessage(message: AiSession["messages"][number]) {
  if (message.role !== "ASSISTANT") return null;
  const parsed = safeJsonParse(message.content);
  return aiTeachResultSchema.safeParse(parsed).success ? aiTeachResultSchema.parse(parsed) : null;
}

function promptPreviewBlock({ title, system, user }: { title: string; system: string; user: string }) {
  return (
    <details className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center justify-between gap-3 text-base font-semibold text-stone-900",
          "[&::-webkit-details-marker]:hidden",
        )}
      >
        <span>{title}</span>
        <span className="text-xs font-normal text-stone-500">Collapsed by default</span>
      </summary>
      <div className="mt-4 grid gap-3">
        <div className="rounded-md border border-stone-200 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">System prompt</p>
          <pre className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-stone-700">{system}</pre>
        </div>
        <div className="rounded-md border border-stone-200 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">User prompt</p>
          <pre className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-stone-700">{user}</pre>
        </div>
      </div>
    </details>
  );
}

function AdminTopicTools({ topicId, topicName }: { topicId: string; topicName: string }) {
  return (
    <Card className="grid gap-3 border-amber-200 bg-amber-50/60">
      <CardTitle className="text-base">Admin tools</CardTitle>
      <p className="text-sm text-stone-700">Clear the AI history for this topic and start fresh.</p>
      <p className="text-xs text-stone-600">Type the topic name to confirm: {topicName}</p>
      <form action={deleteTopicAiHistoryAction}>
        <input type="hidden" name="topicId" value={topicId} />
        <Label>
          Confirm topic
          <Input name="confirmTopicName" placeholder={topicName} />
        </Label>
        <Button type="submit" variant="secondary" className="border-amber-300 bg-white text-stone-900 hover:bg-amber-100">
          Delete topic AI history
        </Button>
      </form>
    </Card>
  );
}

function RawAiResponseCard({ title, content }: { title: string; content: string }) {
  return (
    <details className="rounded-md border border-slate-200 bg-slate-50 p-4 shadow-sm">
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center justify-between gap-3 text-base font-semibold text-stone-900",
          "[&::-webkit-details-marker]:hidden",
        )}
      >
        <span>{title}</span>
        <span className="text-xs font-normal text-stone-500">Collapsed by default</span>
      </summary>
      <pre className="mt-4 whitespace-pre-wrap break-words rounded-md border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-700">
        {prettyJson(content)}
      </pre>
    </details>
  );
}

function testFromSession(session: AiSession) {
  if (!session.testAttempt) return null;
  const parsed = aiGeneratedTestSchema.safeParse(session.testAttempt.questionsJson);
  return parsed.success ? parsed.data : null;
}

function AiActionButtons({ topicId, assignmentId, disabled }: { topicId: string; assignmentId?: string | null; disabled: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={startTeachSessionAction}>
        <input type="hidden" name="topicId" value={topicId} />
        {assignmentId ? <input type="hidden" name="assignmentId" value={assignmentId} /> : null}
        <Button type="submit" variant="secondary" disabled={disabled}>
          <BookOpenText size={16} />
          Teach Me
        </Button>
      </form>
      <form action={startTestSessionAction}>
        <input type="hidden" name="topicId" value={topicId} />
        {assignmentId ? <input type="hidden" name="assignmentId" value={assignmentId} /> : null}
        <Button type="submit" disabled={disabled}>
          <Brain size={16} />
          Test Me
        </Button>
      </form>
    </div>
  );
}

export function AiLearningPanel({
  access,
  topicId,
  topicName,
  assignmentId,
  assignmentType,
  historyHref,
  deleteError,
  isAdmin = false,
}: {
  access: TopicAccessState | AssignmentAccessState;
  topicId: string;
  topicName: string;
  assignmentId?: string | null;
  assignmentType?: string | null;
  historyHref?: string;
  deleteError?: string | null;
  isAdmin?: boolean;
}) {
  return (
    <Card className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles size={16} />
            AI Learning
          </CardTitle>
          <Badge className={access.hasAccess ? "bg-emerald-100 text-emerald-900" : "bg-stone-100 text-stone-700"}>
            {access.hasAccess ? "Premium" : "Locked"}
          </Badge>
        </div>
        <p className="text-sm text-stone-600">
          {access.hasAccess
            ? `${access.remainingUsage} of ${access.limit} prompts left for this topic.`
            : access.message || "Activate the family subscription to use Teach Me and Test Me."}
        </p>
        <AiCautionNote />
        <AiActionButtons topicId={topicId} assignmentId={assignmentId} disabled={!access.hasAccess} />
        {historyHref ? (
          <Link
            href={historyHref}
            className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-medium text-stone-800 transition hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-700"
          >
            View AI history
          </Link>
        ) : null}
        <p className="text-xs text-stone-500">
          {assignmentType === "STUDY" || assignmentType === "REVISION"
            ? "Teach Me fits study and revision work."
            : assignmentType === "TEST"
              ? "Test Me fits test preparation."
              : "Teach Me and Test Me stay focused on this topic only."}
        </p>
      </div>
      <div className="grid gap-2 rounded-md border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
        <p className="font-medium text-stone-900">Prompt limit</p>
        <p>{access.limit} prompts shared across Teach Me and Test Me.</p>
        <p>Subscription status: {access.subscriptionStatus}</p>
        {access.hasAccess ? <p>Ask only about the current topic. No general chat memory.</p> : null}
      </div>
      {deleteError ? <p className="lg:col-span-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{deleteError}</p> : null}
      {isAdmin ? (
        <div className="lg:col-span-2">
          <AdminTopicTools topicId={topicId} topicName={topicName} />
        </div>
      ) : null}
    </Card>
  );
}

export function AiTeachSessionView({ session, backHref, isAdmin }: { session: AiSession; backHref: string; isAdmin: boolean }) {
  const lesson = lessonFromSession(session);
  const requestId = randomUUID();
  const conversationMessages = session.messages.filter((message) => message.role !== "SYSTEM");
  const boardName = session.topic.chapter.subject.child.curriculumAssignments[0]?.curriculumVersion.board.name ?? null;
  const assistantMessage = session.messages.find((message) => message.role === "ASSISTANT");
  const teachPrompt =
    storedPrompt(session) ??
    buildTeachTopicPrompt({
      className: session.topic.chapter.subject.child.className,
      boardName,
      subjectName: session.topic.chapter.subject.name,
      chapterName: session.topic.chapter.name,
      topicName: session.topic.name,
      topicDescription: session.topic.description ?? null,
    });

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
          <Badge>Teach Me</Badge>
          <span>{session.topic.chapter.subject.child.name}</span>
          <span>·</span>
          <span>{session.topic.chapter.subject.name}</span>
          <span>·</span>
          <span>{session.topic.chapter.name}</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{session.topic.name}</h1>
        <p className="text-sm text-stone-600">This page explains the topic first, then asks a quick check question at the end.</p>
        <p className="text-sm text-stone-600">
          <Link href={backHref} className="text-emerald-800 hover:underline">
            Back to topic
          </Link>
        </p>
      </header>

      <AiCautionNote />

      {lesson ? (
        <Card className="grid gap-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{lesson.title}</CardTitle>
          </div>
          <div className="grid gap-2 rounded-md border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
            <p>
              <span className="font-semibold text-stone-900">Learning goal:</span> {lesson.learningGoal}
            </p>
            <p>
              <span className="font-semibold text-stone-900">Prerequisite:</span> {lesson.prerequisite}
            </p>
          </div>
          <div className="grid gap-3 rounded-md border border-stone-200 p-4 text-sm text-stone-700">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Explanation</p>
              <p className="mt-1 whitespace-pre-wrap leading-6 text-stone-700">{lesson.explanation}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Example</p>
              <p className="mt-1 whitespace-pre-wrap leading-6 text-stone-700">{lesson.example}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Common mistake</p>
              <p className="mt-1 whitespace-pre-wrap leading-6 text-stone-700">{lesson.mistake}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Try this</p>
              <p className="mt-1 whitespace-pre-wrap leading-6 text-stone-700">{lesson.practice}</p>
            </div>
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-stone-900">Suggested actions</p>
            <ul className="grid gap-1 text-sm text-stone-600">
              {lesson.suggestedActions.map((action) => (
                <li key={action} className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="mt-0.5 text-emerald-700" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-md bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-medium">Quick check</p>
            <p className="mt-1">{lesson.checkQuestion.question}</p>
            <p className="mt-2 text-xs text-emerald-800">Expected answer: {lesson.checkQuestion.expectedAnswer}</p>
            <p className="mt-1 text-xs text-emerald-800">Hint: {lesson.checkQuestion.hint}</p>
          </div>
        </Card>
      ) : (
        <Card className="grid gap-2">
          <CardTitle className="text-base">Lesson unavailable</CardTitle>
          <p className="text-sm text-stone-600">This lesson was saved in an older format. Delete the topic AI history and start a new lesson.</p>
        </Card>
      )}

      {isAdmin ? (
        <>
          {promptPreviewBlock({
            title: "Teach Me prompt preview",
            system: teachPrompt.system,
            user: teachPrompt.user,
          })}
          {assistantMessage ? <RawAiResponseCard title="Raw AI response" content={assistantMessage.content} /> : null}
          <AdminTopicTools topicId={session.topicId} topicName={session.topic.name} />
        </>
      ) : null}

      <Card>
        <CardTitle>Ask a follow-up</CardTitle>
        <form action={sendTeachMessageAction} className="mt-4 grid gap-4">
          <input type="hidden" name="sessionId" value={session.id} />
          <input type="hidden" name="requestId" value={requestId} />
          <Label>
            Question
            <Textarea name="message" placeholder="Ask a question about this topic" />
          </Label>
          <div>
            <Button type="submit">Send</Button>
          </div>
        </form>
      </Card>

      {conversationMessages.length ? (
        <Card>
          <CardTitle>Conversation</CardTitle>
          <div className="mt-4 grid gap-3">
            {conversationMessages.map((message) => {
              if (message.role === "CHILD") {
                return (
                  <div key={message.id} className="rounded-md border border-stone-200 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Your question</p>
                    <p className="mt-1 text-sm text-stone-700">{message.content}</p>
                  </div>
                );
              }

                const reply = lessonFromMessage(message);
                return (
                  <div key={message.id} className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Teacher answer</p>
                    {reply ? (
                    <div className="mt-2 grid gap-2">
                      <p className="text-sm font-medium text-stone-900">{reply.title}</p>
                      <div className="rounded-md border border-emerald-100 bg-white p-3 text-sm text-stone-700">
                        <p>
                          <span className="font-semibold text-stone-900">Learning goal:</span> {reply.learningGoal}
                        </p>
                        <p className="mt-1">
                          <span className="font-semibold text-stone-900">Prerequisite:</span> {reply.prerequisite}
                        </p>
                      </div>
                      <div className="grid gap-3 rounded-md border border-emerald-100 bg-white p-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Explanation</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-700">{reply.explanation}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Example</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-700">{reply.example}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Common mistake</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-700">{reply.mistake}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Try this</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-700">{reply.practice}</p>
                        </div>
                      </div>
                      <p className="text-sm text-emerald-900">
                        <span className="font-medium">Quick check:</span> {reply.checkQuestion.question}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-stone-700">
                      This lesson uses an older format. Delete the topic AI history to create a fresh lesson.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function answerControlName(questionId: string) {
  return `answer_${questionId}`;
}

export function AiTestSessionView({ session, backHref, isAdmin }: { session: AiSession; backHref: string; isAdmin: boolean }) {
  const test = testFromSession(session);
  const attempt = session.testAttempt;
  const submitted = Boolean(attempt?.submittedAt);
  const boardName = session.topic.chapter.subject.child.curriculumAssignments[0]?.curriculumVersion.board.name ?? null;
  const testAttemptContent = session.testAttempt ? JSON.stringify(session.testAttempt.questionsJson) : "";
  const testPrompt =
    storedPrompt(session) ??
    buildGenerateTestPrompt({
      className: session.topic.chapter.subject.child.className,
      boardName,
      subjectName: session.topic.chapter.subject.name,
      chapterName: session.topic.chapter.name,
      topicName: session.topic.name,
      topicDescription: session.topic.description ?? null,
      questionCount: attempt?.questionCount ?? test?.questions.length ?? 5,
    });

  if (!test || !attempt) {
    return (
      <Card>
        <CardTitle>Test not available</CardTitle>
        <p className="mt-2 text-sm text-stone-600">This test session could not be loaded.</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
          <Badge>Test Me</Badge>
          <span>{session.topic.chapter.subject.child.name}</span>
          <span>·</span>
          <span>{session.topic.chapter.subject.name}</span>
          <span>·</span>
          <span>{session.topic.chapter.name}</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{session.topic.name}</h1>
        <p className="text-sm text-stone-600">
          <Link href={backHref} className="text-emerald-800 hover:underline">
            Back to topic
          </Link>
        </p>
      </header>

      <AiCautionNote />

      {submitted ? (
        <Card>
          <CardTitle>Result</CardTitle>
          <p className="mt-2 text-sm text-stone-600">
            Score {attempt.scorePercentage}% · {attempt.correctCount} of {attempt.questionCount} correct
          </p>
          <div className="mt-4 grid gap-3">
            {(attempt.evaluationJson as Array<{ questionId: string; submittedAnswer: string; isCorrect: boolean; explanation: string }> | null)?.map((item) => (
              <div key={item.questionId} className="rounded-md border border-stone-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-stone-900">{item.questionId}</p>
                  <Badge className={item.isCorrect ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}>
                    {item.isCorrect ? "Correct" : "Review"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-stone-600">{item.explanation}</p>
                <p className="mt-2 text-xs text-stone-500">Your answer: {item.submittedAnswer || "No answer"}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {isAdmin ? (
        <>
          {promptPreviewBlock({
            title: "Test Me prompt preview",
            system: testPrompt.system,
            user: testPrompt.user,
          })}
          {testAttemptContent ? <RawAiResponseCard title="Raw AI test payload" content={testAttemptContent} /> : null}
          <AdminTopicTools topicId={session.topicId} topicName={session.topic.name} />
        </>
      ) : null}

      {!submitted ? (
        <Card>
          <CardTitle>{test.title}</CardTitle>
          <form action={submitTopicTestAction} className="mt-4 grid gap-5">
            <input type="hidden" name="attemptId" value={attempt.id} />
            <input type="hidden" name="sessionId" value={session.id} />
            <input type="hidden" name="requestId" value={randomUUID()} />
            {test.questions.map((question, index) => (
              <fieldset key={question.id} className="grid gap-3 rounded-md border border-stone-200 p-4">
                <legend className="px-2 text-sm font-semibold text-stone-900">
                  {index + 1}. {question.question}
                </legend>
                {question.type === "MULTIPLE_CHOICE" && question.options?.length ? (
                  <div className="grid gap-2">
                    {question.options.map((option) => (
                      <label key={option} className="flex items-center gap-2 text-sm text-stone-700">
                        <input type="radio" name={answerControlName(question.id)} value={option} className="h-4 w-4" />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                ) : question.type === "TRUE_FALSE" ? (
                  <div className="flex flex-wrap gap-4">
                    {["True", "False"].map((option) => (
                      <label key={option} className="flex items-center gap-2 text-sm text-stone-700">
                        <input type="radio" name={answerControlName(question.id)} value={option} className="h-4 w-4" />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <Label>
                    Answer
                    <Input name={answerControlName(question.id)} placeholder="Type your answer" />
                  </Label>
                )}
              </fieldset>
            ))}
            <div>
              <Button type="submit">Submit test</Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card>
        <CardTitle>Questions</CardTitle>
        <div className="mt-4 grid gap-3">
          {test.questions.map((question, index) => (
            <div key={question.id} className="rounded-md border border-stone-200 p-3">
              <p className="text-sm font-medium text-stone-900">
                {index + 1}. {question.question}
              </p>
              <p className="mt-1 text-sm text-stone-600">{question.explanation}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
