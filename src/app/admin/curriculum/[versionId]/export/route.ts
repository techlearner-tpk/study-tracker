import { NextResponse } from "next/server";
import { loadCurriculumVersionTree } from "@/features/curriculum/service";
import { requireParentUser } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ versionId: string }> }) {
  await requireParentUser();
  const { versionId } = await params;
  const version = await loadCurriculumVersionTree(versionId);
  if (!version) {
    return NextResponse.json({ error: "Curriculum version not found" }, { status: 404 });
  }
  return NextResponse.json(version);
}

