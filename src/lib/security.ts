import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export type SessionClaims = {
  userId: string;
  email: string;
  role: "PARENT";
  expiresAt: number;
};

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: "PARENT";
};

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function getAuthSecret() {
  return process.env.AUTH_SECRET ?? "study-tracker-dev-secret";
}

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", getAuthSecret()).update(value).digest("base64url");
}

export function createSessionToken(user: CurrentUser) {
  const session: SessionClaims = {
    userId: user.id,
    email: user.email,
    role: user.role,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  const payload = base64UrlEncode(JSON.stringify(session));
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined) {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length) return null;
  if (!timingSafeEqual(actualBytes, expectedBytes)) return null;

  try {
    const session = JSON.parse(base64UrlDecode(payload)) as SessionClaims;
    if (session.expiresAt < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, hash: string) {
  const [algorithm, salt, stored] = hash.split("$");
  if (algorithm !== "scrypt" || !salt || !stored) return false;
  const derived = scryptSync(password, salt, 64).toString("hex");
  const derivedBytes = Buffer.from(derived, "hex");
  const storedBytes = Buffer.from(stored, "hex");
  if (derivedBytes.length !== storedBytes.length) return false;
  return timingSafeEqual(derivedBytes, storedBytes);
}

