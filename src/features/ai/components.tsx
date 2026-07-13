import Link from "next/link";
import { randomUUID } from "node:crypto";
import { BookOpenText, Brain, CheckCircle2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/form";
import { aiGeneratedTestSchema, aiTeachResultSchema } from "./schema";
import { sendTeachMessageAction, startTeachSessionAction, startTestSessionAction, submitTopicTestAction } from "./actions";
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

function lessonFromSession(session: AiSession) {
  const assistantMessage = session.messages.find((message) => message.role === "ASSISTANT");
  if (!assistantMessage) return null;
  const parsed = safeJsonParse(assistantMessage.content);
  return aiTeachResultSchema.safeParse(parsed).success ? aiTeachResultSchema.parse(parsed) : null;
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
  assignmentId,
  assignmentType,
}: {
  access: TopicAccessState | AssignmentAccessState;
  topicId: string;
  assignmentId?: string | null;
  assignmentType?: string | null;
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
        <AiActionButtons topicId={topicId} assignmentId={assignmentId} disabled={!access.hasAccess} />
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
    </Card>
  );
}

export function AiTeachSessionView({ session, backHref }: { session: AiSession; backHref: string }) {
  const lesson = lessonFromSession(session);
  const requestId = randomUUID();
  const childMessages = session.messages.filter((message) => message.role === "CHILD");

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
        <p className="text-sm text-stone-600">
          <Link href={backHref} className="text-emerald-800 hover:underline">
            Back to topic
          </Link>
        </p>
      </header>

      {lesson ? (
        <Card className="grid gap-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{lesson.title}</CardTitle>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {lesson.sections.map((section) => (
              <div key={section.heading} className="rounded-md border border-stone-200 p-4">
                <p className="text-sm font-semibold text-stone-900">{section.heading}</p>
                <p className="mt-2 text-sm text-stone-600">{section.body}</p>
              </div>
            ))}
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
            <p className="font-medium">Check question</p>
            <p className="mt-1">{lesson.checkQuestion}</p>
          </div>
        </Card>
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

      {childMessages.length ? (
        <Card>
          <CardTitle>Conversation</CardTitle>
          <div className="mt-4 grid gap-3">
            {childMessages.map((message) => (
              <div key={message.id} className="rounded-md border border-stone-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Your question</p>
                <p className="mt-1 text-sm text-stone-700">{message.content}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function answerControlName(questionId: string) {
  return `answer_${questionId}`;
}

export function AiTestSessionView({ session, backHref }: { session: AiSession; backHref: string }) {
  const test = testFromSession(session);
  const attempt = session.testAttempt;
  const submitted = Boolean(attempt?.submittedAt);

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
