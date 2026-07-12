import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { CurriculumImportPanel, CurriculumVersionForm, CurriculumActions } from "@/features/curriculum/components";
import { loadCurriculumList } from "@/features/curriculum/service";
import { requireParentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CurriculumAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireParentUser();
  const { q = "" } = await searchParams;
  const versions = await loadCurriculumList();
  const query = q.trim().toLowerCase();
  const filtered = query
    ? versions.filter((version) =>
        [version.board.code, version.board.name, version.academicYear, version.version, version.name]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : versions;

  return (
    <AppShell>
      <div className="grid gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-800">Admin</p>
            <h1 className="text-3xl font-semibold tracking-tight">Curriculum</h1>
          </div>
          <form className="flex items-center gap-2">
            <Input name="q" defaultValue={q} placeholder="Search board, year, version" className="w-72" />
            <Button type="submit" variant="secondary">Search</Button>
          </form>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <Card>
            <CardTitle>Create draft</CardTitle>
            <div className="mt-4">
              <CurriculumVersionForm />
            </div>
          </Card>
          <CurriculumImportPanel />
        </section>

        <section className="grid gap-4">
          {filtered.map((version) => (
            <Card key={version.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="grid gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg">{version.board.code}</CardTitle>
                    <Badge>{version.status}</Badge>
                    <Badge>{version.verificationStatus}</Badge>
                  </div>
                  <p className="text-sm text-stone-600">
                    {version.board.name} · {version.academicYear} · {version.version} · {version.name}
                  </p>
                  <p className="text-sm text-stone-600">
                    {version.counts.classes} classes · {version.counts.subjects} subjects · {version.counts.chapters} chapters · {version.counts.topics} topics
                  </p>
                  <p className="text-xs text-amber-700">
                    {version.verificationStatus === "REVIEW_REQUIRED" ? "Review required before publish" : "Imported curriculum metadata preserved"}
                  </p>
                  <p className="text-xs text-stone-500">Updated {new Date(version.updatedAt).toLocaleString()}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/curriculum/${version.id}`} className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-medium text-stone-800 hover:bg-stone-100">
                    Open
                  </Link>
                  <Link href={`/admin/curriculum/${version.id}?preview=1`} className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-medium text-stone-800 hover:bg-stone-100">
                    Preview
                  </Link>
                  <CurriculumActions version={version} />
                </div>
              </div>
            </Card>
          ))}
          {filtered.length === 0 ? <Card><CardTitle>No curricula found</CardTitle></Card> : null}
        </section>
      </div>
    </AppShell>
  );
}
