import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';

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
  normalizeCourse13Memberships,
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
    const records = Array.isArray(parsed) ? parsed : clone(config.seed);
    return name === 'memberships' ? normalizeCourse13Memberships(records) : records;
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
    return clone(INITIAL_SUBMISSIONS);
  }
}

async function writeSubmissionsAtomically(records) {
  await ensureDataDirectory();
  const temporaryFile = `${SUBMISSIONS_FILE}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
  await rename(temporaryFile, SUBMISSIONS_FILE);
}

function saveSubmissions(records) {
  const snapshot = clone(records);
  writeQueue = writeQueue.then(() => writeSubmissionsAtomically(snapshot));
  return writeQueue;
}

function mutateSubmissions(callback) {
  const result = writeQueue.then(async () => {
    const records = await readSubmissions();
    const value = await callback(records);
    await writeSubmissionsAtomically(records);
    return value;
  });
  writeQueue = result.catch(() => {});
  return result;
}

export {
  ensureDataDirectory,
  readCollection,
  saveCollection,
  readSubmissions,
  saveSubmissions,
  mutateSubmissions,
};
