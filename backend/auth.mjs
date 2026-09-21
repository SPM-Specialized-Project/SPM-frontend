import { randomBytes } from 'node:crypto';

const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;
const sessions = new Map();

export function createSession(user) {
  const token = randomBytes(32).toString('hex');
  sessions.set(token, {
    email: user.email,
    expiresAt: Date.now() + SESSION_LIFETIME_MS,
  });
  return token;
}

export function getSessionUser(request, users) {
  const authorization = request.headers.authorization ?? '';
  const match = /^Bearer ([a-f0-9]{64})$/.exec(authorization);
  if (!match) return null;

  const session = sessions.get(match[1]);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(match[1]);
    return null;
  }

  return users.find((user) => user.email === session.email) ?? null;
}
