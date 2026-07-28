import { AppShell } from "@/components/layout/app-shell";
import { TestTemplateAdminView } from "@/features/test-papers/components";
import { loadTestTemplatesForAdmin } from "@/features/test-papers/queries";
import { requireAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TestTemplatesPage({ searchParams }: { searchParams: Promise<{ templateId?: string }> }) {
  await requireAdminUser();
  const params = await searchParams;
  const templates = await loadTestTemplatesForAdmin();
  const selectedTemplate = templates.find((template) => template.id === params.templateId);

  return (
    <AppShell>
      <TestTemplateAdminView templates={templates} selectedTemplate={selectedTemplate} />
    </AppShell>
  );
}
