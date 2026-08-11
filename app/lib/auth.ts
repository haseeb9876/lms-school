import crypto from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { roles } from './constants';

export type UserRole = (typeof roles)[number];

export type SessionUser = {
  email: string;
  name: string;
  role: UserRole;
  schoolSlug: string;
};

const PBKDF2_ITERATIONS = 200_000;
const HASH_DIGEST = 'sha256';
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET || 'dev-session-secret-change-me';
  return secret;
}

function getPasswordSalt() {
  return process.env.PASSWORD_SALT || 'greenhill-school-salt';
}

function createPasswordHash(password: string) {
  const salt = crypto.createHash(HASH_DIGEST).update(getPasswordSalt()).digest();
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, HASH_DIGEST).toString('hex');
  return `pbkdf2:${PBKDF2_ITERATIONS}:${salt.toString('hex')}:${hash}`;
}

function verifyPassword(password: string, storedHash: string) {
  const parts = storedHash.split(':');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;

  const iterations = Number(parts[1]);
  const salt = Buffer.from(parts[2], 'hex');
  const expectedHash = parts[3];

  const derivedHash = crypto.pbkdf2Sync(password, salt, iterations, 32, HASH_DIGEST).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(expectedHash, 'hex'), Buffer.from(derivedHash, 'hex'));
}

const demoUsers: Record<string, SessionUser & { passwordHash: string }> = {
  principal: {
    email: 'principal@greenhill.edu.pk',
    passwordHash: createPasswordHash('admin123'),
    name: 'Principal Ahmed',
    role: 'PRINCIPAL',
    schoolSlug: 'greenhill'
  },
  teacher: {
    email: 'teacher@greenhill.edu.pk',
    passwordHash: createPasswordHash('teacher123'),
    name: 'Ms. Sara',
    role: 'TEACHER',
    schoolSlug: 'greenhill'
  },
  student: {
    email: 'student@greenhill.edu.pk',
    passwordHash: createPasswordHash('student123'),
    name: 'Ali Khan',
    role: 'STUDENT',
    schoolSlug: 'greenhill'
  },
  parent: {
    email: 'parent@greenhill.edu.pk',
    passwordHash: createPasswordHash('parent123'),
    name: 'Mr. Khan',
    role: 'PARENT',
    schoolSlug: 'greenhill'
  }
};

export function validateCredentials(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const match = Object.values(demoUsers).find((user) => user.email === normalizedEmail);
  if (!match) return null;

  if (!verifyPassword(password, match.passwordHash)) return null;

  const { passwordHash: _passwordHash, ...safeUser } = match;
  return safeUser;
}

export function createSessionCookieValue(user: SessionUser) {
  const payload = Buffer.from(JSON.stringify(user)).toString('base64url');
  const signature = crypto.createHmac(HASH_DIGEST, getSessionSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function parseSessionCookieValue(value: string) {
  try {
    const [payload, signature] = value.split('.');
    if (!payload || !signature) return null;

    const expectedSignature = crypto.createHmac(HASH_DIGEST, getSessionSecret()).update(payload).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return null;

    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    return JSON.parse(decoded) as SessionUser;
  } catch {
    return null;
  }
}

export function getSessionUser() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('lms-session');
  if (!sessionCookie?.value) return null;
  return parseSessionCookieValue(sessionCookie.value);
}

export function requireSession() {
  const user = getSessionUser();
  if (!user) redirect('/login');
  return user;
}

export { SESSION_TTL_SECONDS };
