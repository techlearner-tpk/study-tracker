import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/form";
import { Notice } from "@/components/ui/notice";
import { activateFamilySubscriptionAction, deactivateFamilySubscriptionAction, resetAiUsageAction, saveAiSettingsAction } from "@/features/ai/actions";
import { getAiConfig } from "@/lib/ai/config";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AiAdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ subscription?: string; saved?: string; reset?: string }>;
}) {
  const parent = await requireAdminUser();
  const config = getAiConfig();
  const query = await searchParams;
  const [subscription, settings, children] = await Promise.all([
    prisma.subscription.findUnique({ where: { parentId: parent.id } }),
    prisma.aiSetting.findUnique({ where: { id: 1 } }),
    prisma.child.findMany({
      where: { userId: parent.id },
      include: {
        aiTopicUsages: {
          include: {
            topic: {
              include: {
                chapter: {
                  include: {
                    subject: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <AppShell>
      <div className="grid gap-6">
        <header className="grid gap-2">
          <p className="text-sm font-medium text-emerald-800">Parent</p>
          <h1 className="text-3xl font-semibold tracking-tight">Parent AI Controls</h1>
          <p className="text-sm text-stone-600">Family-level AI controls, prompt usage, and topic resets.</p>
        </header>

        {query?.subscription ? <Notice tone="success">Subscription updated.</Notice> : null}
        {query?.saved ? <Notice tone="success">Settings saved.</Notice> : null}
        {query?.reset ? <Notice tone="success">AI usage reset.</Notice> : null}

        <section className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardTitle>Provider</CardTitle>
            <div className="mt-3 grid gap-2 text-sm text-stone-600">
              <p>Enabled: {String(config.enabled)}</p>
              <p>Provider: {config.provider}</p>
              <p>Model: {config.model || "Not set"}</p>
            </div>
          </Card>

          <Card>
            <CardTitle>Family subscription</CardTitle>
            <div className="mt-3 grid gap-2 text-sm text-stone-600">
              <p>Status: <Badge>{subscription?.status ?? "NONE"}</Badge></p>
              <p>Starts: {subscription?.startsAt ? new Date(subscription.startsAt).toLocaleString() : "Not set"}</p>
              <p>Expires: {subscription?.expiresAt ? new Date(subscription.expiresAt).toLocaleString() : "Not set"}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <form action={activateFamilySubscriptionAction}>
                <Button type="submit">Activate</Button>
              </form>
              <form action={deactivateFamilySubscriptionAction}>
                <Button type="submit" variant="secondary">Deactivate</Button>
              </form>
            </div>
          </Card>

          <Card>
            <CardTitle>Shared usage limit</CardTitle>
            <form action={saveAiSettingsAction} className="mt-3 grid gap-3">
              <Label>
                Topic prompt limit
                <Input name="topicPromptLimit" type="number" min="1" defaultValue={settings?.topicPromptLimit ?? config.topicPromptLimit} />
              </Label>
              <Label>
                Test questions
                <Input name="testQuestionCount" type="number" min="1" defaultValue={settings?.testQuestionCount ?? config.testQuestionCount} />
              </Label>
              <Label>
                Max user prompt length
                <Input name="maxUserPromptLength" type="number" min="1" defaultValue={settings?.maxUserPromptLength ?? config.maxUserPromptLength} />
              </Label>
              <Button type="submit">Save settings</Button>
            </form>
          </Card>
        </section>

        <section className="grid gap-4">
          <Card>
            <CardTitle>Usage by child and topic</CardTitle>
            <div className="mt-4 grid gap-3">
              {children.length ? children.map((child) => (
                <div key={child.id} className="grid gap-3 rounded-md border border-stone-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-stone-900">{child.name}</p>
                      <p className="text-sm text-stone-600">{child.className}</p>
                    </div>
                    <Badge>{child.aiTopicUsages.length} tracked topics</Badge>
                  </div>
                  <div className="grid gap-2">
                    {child.aiTopicUsages.length ? child.aiTopicUsages.map((usage) => (
                      <div key={usage.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-stone-50 px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium text-stone-900">
                            {usage.topic.chapter.subject.name} · {usage.topic.chapter.name} · {usage.topic.name}
                          </p>
                          <p className="text-stone-600">
                            {usage.promptCount} prompts used
                          </p>
                        </div>
                        <form action={resetAiUsageAction}>
                          <input type="hidden" name="childId" value={child.id} />
                          <input type="hidden" name="topicId" value={usage.topic.id} />
                          <Button type="submit" variant="ghost">Reset</Button>
                        </form>
                      </div>
                    )) : (
                      <p className="text-sm text-stone-600">No AI usage yet.</p>
                    )}
                  </div>
                </div>
              )) : (
                <p className="text-sm text-stone-600">No children found.</p>
              )}
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
