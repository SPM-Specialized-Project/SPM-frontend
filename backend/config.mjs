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
export const MATCHING_RECOMMENDATIONS_FILE = path.join(DATA_DIRECTORY, 'matching-recommendations.json');
export const MATCHING_ASSIGNMENTS_FILE = path.join(DATA_DIRECTORY, 'matching-assignments.json');
export const MATCHING_DECISIONS_FILE = path.join(DATA_DIRECTORY, 'matching-decisions.json');
export const MATCHING_FEEDBACK_FILE = path.join(DATA_DIRECTORY, 'matching-feedback.json');
export const WORKSPACES_FILE = path.join(DATA_DIRECTORY, 'codepulse-workspaces.json');
export const CLASSROOMS_FILE = path.join(DATA_DIRECTORY, 'codepulse-classrooms.json');
export const TERMS_FILE = path.join(DATA_DIRECTORY, 'codepulse-terms.json');
export const ASSIGNMENTS_FILE = path.join(DATA_DIRECTORY, 'codepulse-assignments.json');
export const LABS_FILE = path.join(DATA_DIRECTORY, 'codepulse-labs.json');
export const ASSIGNMENT_VERSIONS_FILE = path.join(DATA_DIRECTORY, 'codepulse-assignment-versions.json');
export const CODEPULSE_SUBMISSIONS_FILE = path.join(DATA_DIRECTORY, 'codepulse-submissions.json');
export const CODEPULSE_ACTIVITIES_FILE = path.join(DATA_DIRECTORY, 'codepulse-activities.json');
export const PRACTICE_WINDOW_AUDIT_FILE = path.join(DATA_DIRECTORY, 'codepulse-practice-window-audit.json');
