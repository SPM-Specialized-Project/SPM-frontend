import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PORT = Number(process.env.BACKEND_PORT ?? 4000);
export const CORS_ORIGIN =
  process.env.BACKEND_CORS_ORIGIN?.trim() || 'http://localhost:3000';
const dirname = path.dirname(fileURLToPath(import.meta.url));

export const DATA_DIRECTORY = process.env.BACKEND_DATA_DIRECTORY
  ? path.resolve(process.env.BACKEND_DATA_DIRECTORY)
  : path.join(dirname, 'data');
export const SUBMISSIONS_FILE = path.join(DATA_DIRECTORY, 'submissions.json');
export const SESSIONS_FILE = path.join(DATA_DIRECTORY, 'sessions.json');
export const REGISTRATIONS_FILE = path.join(DATA_DIRECTORY, 'registrations.json');
export const COURSE_REQUESTS_FILE = path.join(DATA_DIRECTORY, 'course-requests.json');
export const MEMBERSHIPS_FILE = path.join(DATA_DIRECTORY, 'codepulse-memberships.json');
export const WORKSPACES_FILE = path.join(DATA_DIRECTORY, 'codepulse-workspaces.json');
export const CLASSROOMS_FILE = path.join(DATA_DIRECTORY, 'codepulse-classrooms.json');
export const TERMS_FILE = path.join(DATA_DIRECTORY, 'codepulse-terms.json');