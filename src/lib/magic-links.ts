import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type MagicLinkKind = "SIGNUP" | "SIGNIN" | "INVITE";

export function createPlainToken() {
  return randomBytes(32).toString("hex");
}

export function hashPlainToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function appUrl() {
  return process.env.APP_URL || `http://localhost:${process.env.PORT || "3000"}`;
}

export async function createMagicLinkToken(params: {
  email: string;
  kind: MagicLinkKind;
  childId?: string | null;
}) {
  const token = createPlainToken();
  const tokenHash = hashPlainToken(token);
  const record = await prisma.magicLinkToken.create({
    data: {
      email: params.email.toLowerCase(),
      type: params.kind,
      tokenHash,
      childId: params.childId ?? null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 30),
    },
  });

  return { token, record };
}

export async function sendMagicLinkEmail(params: {
  email: string;
  subject: string;
  body: string;
  link: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Study Tracker <onboarding@studytracker.local>";

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[email:${params.email}] ${params.subject}\n${params.link}`);
    }
    return { sent: false, previewUrl: params.link };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: params.email,
      subject: params.subject,
      html: `<p>${params.body}</p><p><a href="${params.link}">Open Study Tracker</a></p>`,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to send email: ${text}`);
  }

  return { sent: true };
}

export async function verifyMagicLinkToken(token: string) {
  const tokenHash = hashPlainToken(token);
  const record = await prisma.magicLinkToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { email: record.email } });
  if (!user) {
    return null;
  }

  if (record.type === "INVITE" && record.childId && user.childId !== record.childId) {
    return null;
  }

  await prisma.$transaction([
    prisma.magicLinkToken.update({
      where: { tokenHash },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { verifiedAt: user.verifiedAt ?? new Date() },
    }),
  ]);

  return user;
}
