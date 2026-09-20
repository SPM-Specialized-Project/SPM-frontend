import { mkdir, readFile, writeFile } from 'node:fs/promises';

import {
  COURSE_REQUESTS_FILE,
  MEMBERSHIPS_FILE,
  DATA_DIRECTORY,
  REGISTRATIONS_FILE,
  SESSIONS_FILE,
  SUBMISSIONS_FILE,
} from '../config.mjs';
import {
  INITIAL_COURSE_REQUESTS,
  INITIAL_MEMBERSHIPS,
  INITIAL_REGISTRATIONS,
  INITIAL_SESSIONS,
  INITIAL_SUBMISSIONS,
} from './seeds.mjs';

const clone = (value) => JSON.parse(JSON.stringify(value));
let writeQueue = Promise.resolve();

const ensureDataDirectory = () => mkdir(DATA_DIRECTORY, { recursive: true });

const collectionConfig = {
  sessions: { file: SESSIONS_FILE, seed: INITIAL_SESSIONS },
  registrations: { file: REGISTRATIONS_FILE, seed: INITIAL_REGISTRATIONS },
  courseRequests: { file: COURSE_REQUESTS_FILE, seed: INITIAL_COURSE_REQUESTS },
  memberships: { file: MEMBERSHIPS_FILE, seed: INITIAL_MEMBERSHIPS },
};

async function readCollection(name) {
  const config = collectionConfig[name];
  if (!config) throw new Error(`Unknown backend collection: ${name}`);
  await ensureDataDirectory();

  try {
    const raw = await readFile(config.file, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : clone(config.seed);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    await saveCollection(name, config.seed);
    return clone(config.seed);
  }
}

function saveCollection(name, records) {
  const config = collectionConfig[name];
  if (!config) throw new Error(`Unknown backend collection: ${name}`);
  writeQueue = writeQueue.then(async () => {
    await ensureDataDirectory();
    await writeFile(config.file, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
  });
  return writeQueue;
}

async function readSubmissions() {
  await ensureDataDirectory();

  try {
    const raw = await readFile(SUBMISSIONS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : clone(INITIAL_SUBMISSIONS);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    await saveSubmissions(INITIAL_SUBMISSIONS);
    return clone(INITIAL_SUBMISSIONS);
  }
}

function saveSubmissions(records) {
  writeQueue = writeQueue.then(async () => {
    await ensureDataDirectory();
    await writeFile(SUBMISSIONS_FILE, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
  });
  return writeQueue;
}

export { ensureDataDirectory, readCollection, saveCollection, readSubmissions, saveSubmissions };
