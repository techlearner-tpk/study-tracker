import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AiCautionNote } from "./components";
import { aiGeneratedTestSchema, aiTeachResultSchema } from "./schema";
import type { getTopicAiHistory } from "./service";

type TopicAiHistory = Awaited<ReturnType<typeof getTopicAiHistory>>;
type TopicAiSession = TopicAiHistory["sessions"][number];

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function lessonFromMessage(message: TopicAiSession["messages"][number]) {
  if (message.role !== "ASSISTANT") return null;
  const parsed = safeJsonParse(message.content);
  return aiTeachResultSchema.safeParse(parsed).success ? aiTeachResultSchema.parse(parsed) : null;
}

function testFromSession(session: TopicAiSession) {
  if (!session.testAttempt) return null;
  const parsed = aiGeneratedTestSchema.safeParse(session.testAttempt.questionsJson);
  return parsed.success ? parsed.data : null;
}

function SessionDetails({ session, topicName }: { session: TopicAiSession; topicName: string }) {
  const openHref = session.mode === "TEACH" ? `/ai/teach/${session.topicId}/${session.id}` : `/ai/test/${session.topicId}/${session.id}`;
  const test = session.mode === "TEST" ? testFromSession(session) : null;
  const nonSystemMessages = session.messages.filter((message) => message.role !== "SYSTEM");
  const submitted = Boolean(session.testAttempt?.submittedAt);

  return (
    <details className="rounded-md border border-stone-200 bg-white shadow-sm">
      <summary
        className={cn(
          "flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3",
          "[&::-webkit-details-marker]:hidden",
        )}
      >
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{session.mode === "TEACH" ? "Teach Me" : "Test Me"}</Badge>
            <Badge className={session.status === "COMPLETED" ? "bg-emerald-100 text-emerald-900" : "bg-stone-100 text-stone-700"}>
              {session.status.toLowerCase()}
            </Badge>
            {session.mode === "TEST" && session.testAttempt ? (
              <Badge className="bg-sky-100 text-sky-900">
                {submitted ? `${session.testAttempt.scorePercentage}% score` : `${session.testAttempt.questionCount} questions`}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm font-medium text-stone-900">
            {format(session.createdAt, "PP p")} · {topicName}
          </p>
        </div>
        <span className="text-xs font-normal text-stone-500">Collapsed by default</span>
      </summary>

      <div className="grid gap-4 border-t border-stone-200 p-4">
        <p className="text-sm text-stone-600">
          <Link href={openHref} className="text-emerald-800 hover:underline">
            Open the full session
          </Link>
        </p>

        {session.mode === "TEACH" ? (
          <div className="grid gap-3">
            {nonSystemMessages.length ? (
              nonSystemMessages.map((message) => {
                if (message.role === "CHILD") {
                  return (
                    <div key={message.id} className="rounded-md border border-stone-200 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Question</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">{message.content}</p>
                    </div>
                  );
                }

                const lesson = lessonFromMessage(message);
                return (
                  <div key={message.id} className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Teacher answer</p>
                    {lesson ? (
                      <div className="mt-2 grid gap-2">
                        <p className="text-sm font-medium text-stone-900">{lesson.title}</p>
                        <p className="whitespace-pre-wrap text-sm leading-6 text-stone-700">{lesson.explanation}</p>
                        <p className="whitespace-pre-wrap text-sm leading-6 text-stone-700">{lesson.example}</p>
                        <p className="whitespace-pre-wrap text-sm leading-6 text-stone-700">{lesson.mistake}</p>
                        <p className="whitespace-pre-wrap text-sm leading-6 text-stone-700">{lesson.practice}</p>
                        <p className="text-sm text-emerald-900">
                          <span className="font-medium">Quick check:</span> {lesson.checkQuestion.question}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">{message.content}</p>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-stone-600">No messages saved for this session yet.</p>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {test ? (
              <>
                <div className="rounded-md border border-stone-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Generated test</p>
                  <p className="mt-1 text-sm text-stone-700">{test.title}</p>
                </div>
                <div className="grid gap-3">
                  {test.questions.map((question, index) => (
                    <div key={question.id} className="rounded-md border border-stone-200 p-3">
                      <p className="text-sm font-medium text-stone-900">
                        {index + 1}. {question.question}
                      </p>
                      <p className="mt-1 text-sm text-stone-600">{question.explanation}</p>
                      {submitted && session.testAttempt?.evaluationJson ? (
                        <p className="mt-2 text-xs text-stone-500">
                          Answer:{" "}
                          {String((session.testAttempt.evaluationJson as Array<{ questionId: string; submittedAnswer: string }> | null)?.find((item) => item.questionId === question.id)?.submittedAnswer ?? "No answer")}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
                {submitted && session.testAttempt ? (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                    Score {session.testAttempt.scorePercentage}% · {session.testAttempt.correctCount} of {session.testAttempt.questionCount} correct
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-stone-600">This test session could not be decoded.</p>
            )}
          </div>
        )}
      </div>
    </details>
  );
}

export function AiTopicHistoryView({ history, backHref }: { history: TopicAiHistory; backHref: string }) {
  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <p className="text-sm text-stone-600">
          {history.topic.chapter.subject.child.name} · {history.topic.chapter.subject.name} · {history.topic.chapter.name}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{history.topic.name} AI history</h1>
        <p className="text-sm text-stone-600">
          <Link href={backHref} className="text-emerald-800 hover:underline">
            Back to topic
          </Link>
        </p>
      </header>

      <Card className="grid gap-3">
        <CardTitle className="text-base">Saved AI sessions</CardTitle>
        <p className="text-sm text-stone-600">
          These are the saved Teach Me and Test Me sessions for this topic.
        </p>
        <AiCautionNote />
      </Card>

      {history.sessions.length ? (
        <div className="grid gap-4">
          {history.sessions.map((session) => (
            <SessionDetails key={session.id} session={session} topicName={history.topic.name} />
          ))}
        </div>
      ) : (
        <Card>
          <CardTitle className="text-base">No AI history yet</CardTitle>
          <p className="mt-2 text-sm text-stone-600">Start Teach Me or Test Me to save the first session here.</p>
        </Card>
      )}
    </div>
  );
}
