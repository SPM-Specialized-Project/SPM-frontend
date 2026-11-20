import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIRECTORY } from './config.mjs';

const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;
const AUTH_SESSIONS_FILE = path.join(DATA_DIRECTORY, 'codepulse-auth-sessions.json');

function loadSessions() {
  try {
    if (fs.existsSync(AUTH_SESSIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(AUTH_SESSIONS_FILE, 'utf8'));
      return new Map(Object.entries(data));
    }
  } catch {
    // ignore
  }
  return new Map();
}

function saveSessions(map) {
  try {
    const obj = Object.fromEntries(map.entries());
    fs.writeFileSync(AUTH_SESSIONS_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch {
    // ignore
  }
}

const sessions = loadSessions();

export function createSession(user) {
  const token = randomBytes(32).toString('hex');
  sessions.set(token, {
    email: user.email,
    expiresAt: Date.now() + SESSION_LIFETIME_MS,
  });
  saveSessions(sessions);
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
    saveSessions(sessions);
    return null;
  }

  return users.find((user) => user.email === session.email) ?? null;
}
