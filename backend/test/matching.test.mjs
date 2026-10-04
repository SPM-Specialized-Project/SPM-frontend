import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { evaluateHardConstraints } from '../matching/hard-constraints.mjs';
import { normalizeRegistration, validateNormalizedRegistration } from '../matching/contracts.mjs';
import { extractProfile } from '../matching/profile-extractor.mjs';
import { createMatchingService } from '../matching/service.mjs';
import { scoreTfidf } from '../matching/tfidf.mjs';
import { evaluateDataset, validateDataset } from '../matching/evaluate.mjs';
import { calculateRankingMetrics } from '../matching/ranking-metrics.mjs';

const baseRecord = (id, role, extra = {}) => ({
  id,
  status: role === 'TUTOR' ? 'Approved' : 'Pending',
  subjects: [{ id: 'os' }],
  languages: [{ id: 'vi' }],
  sessionTypes: [{ id: 'online' }],
  locations: [],
  matchingProfile: role === 'TUTOR'
    ? { acceptedModes: ['ONLINE'], maxActiveStudents: 2 }
    : { requestedModes: ['ONLINE'] },
  ...extra,
});

test('matching hard constraints reject missing or incompatible required fields', () => {
  const student = baseRecord('s1', 'STUDENT', {
    subjects: [{ id: 'os' }],
    matchingProfile: {
      requestedModes: ['ONSITE'],
      locationIds: ['p1'],
      availability: { timezone: 'Asia/Ho_Chi_Minh', windows: [{ dayOfWeek: 6, startTime: '08:00', endTime: '12:00' }] },
    },
  });
  const tutor = baseRecord('t1', 'TUTOR', {
    matchingProfile: {
      acceptedModes: ['ONSITE'],
      locationIds: ['p2'],
      maxActiveStudents: 1,
      availability: { timezone: 'Asia/Ho_Chi_Minh', windows: [{ dayOfWeek: 6, startTime: '13:00', endTime: '17:00' }] },
    },
  });
  const result = evaluateHardConstraints(
    normalizeRegistration(student, 'STUDENT'),
    normalizeRegistration(tutor, 'TUTOR'),
    1,
  );
  assert.equal(result.eligible, false);
  assert.equal(result.constraints.locationMatch.reason, 'onsite_location_unavailable_or_mismatch');
  assert.equal(result.constraints.availabilityMatch.reason, 'no_availability_overlap');
  assert.equal(result.constraints.capacityAvailable.reason, 'capacity_exhausted');
});

test('HYBRID may match through online without requiring a shared physical location', () => {
  const student = normalizeRegistration(baseRecord('s1', 'STUDENT', {
    matchingProfile: { requestedModes: ['HYBRID'], locationIds: ['p1'] },
  }), 'STUDENT');
  const tutor = normalizeRegistration(baseRecord('t1', 'TUTOR', {
    matchingProfile: { acceptedModes: ['ONLINE'], maxActiveStudents: 1 },
  }), 'TUTOR');
  const result = evaluateHardConstraints(student, tutor, 0);
  assert.equal(result.eligible, true);
  assert.equal(result.constraints.locationMatch.reason, 'shared_online_mode');
});

test('ONLINE ignores differing physical locations and legacy mode aliases are normalized', () => {
  const student = normalizeRegistration(baseRecord('s1', 'STUDENT', {
    sessionTypes: [{ id: 'online' }], matchingProfile: { requestedModes: ['online'], locationIds: ['campus-a'] },
  }), 'STUDENT');
  const tutor = normalizeRegistration(baseRecord('t1', 'TUTOR', {
    matchingProfile: { acceptedModes: ['ONLINE'], locationIds: ['campus-b'], maxActiveStudents: 1 },
  }), 'TUTOR');
  const result = evaluateHardConstraints(student, tutor, 0);
  assert.equal(result.eligible, true);
  assert.equal(result.constraints.locationMatch.reason, 'shared_online_mode');
  const legacyOffline = normalizeRegistration(baseRecord('t-legacy', 'TUTOR', {
    sessionTypes: [{ id: 'offline' }], matchingProfile: { maxActiveStudents: 1 },
  }), 'TUTOR');
  assert.deepEqual(legacyOffline.modes, ['ONSITE']);
  const unknown = normalizeRegistration(baseRecord('t2', 'TUTOR', {
    matchingProfile: { acceptedModes: ['remote-ish'], maxActiveStudents: 1 },
  }), 'TUTOR');
  assert.ok(validateNormalizedRegistration(unknown).includes('unknown_session_mode'));
});

test('matching rejects language/mode mismatches and missing capacity', () => {
  const student = baseRecord('s1', 'STUDENT', {
    matchingProfile: { requestedModes: ['ONLINE'] },
  });
  const tutor = baseRecord('t1', 'TUTOR', {
    languages: [{ id: 'en' }],
    matchingProfile: { acceptedModes: ['ONSITE'] },
  });
  const result = evaluateHardConstraints(
    normalizeRegistration(student, 'STUDENT'),
    normalizeRegistration(tutor, 'TUTOR'),
    0,
  );
  assert.equal(result.eligible, false);
  assert.equal(result.constraints.languageMatch.reason, 'language_mismatch');
  assert.equal(result.constraints.modeMatch.reason, 'mode_mismatch');
  assert.equal(result.constraints.capacityAvailable.reason, 'capacity_not_configured');
});

test('required availability cannot match across unknown or different timezones', () => {
  const student = baseRecord('s1', 'STUDENT', {
    matchingProfile: {
      requestedModes: ['ONLINE'],
      availability: { timezone: 'Asia/Ho_Chi_Minh', windows: [{ dayOfWeek: 6, startTime: '08:00', endTime: '12:00' }] },
    },
  });
  const tutor = baseRecord('t1', 'TUTOR', {
    matchingProfile: {
      acceptedModes: ['ONLINE'], maxActiveStudents: 1,
      availability: { timezone: 'UTC', windows: [{ dayOfWeek: 6, startTime: '09:00', endTime: '10:00' }] },
    },
  });
  const result = evaluateHardConstraints(
    normalizeRegistration(student, 'STUDENT'),
    normalizeRegistration(tutor, 'TUTOR'),
    0,
  );
  assert.equal(result.eligible, false);
  assert.equal(result.constraints.availabilityMatch.reason, 'availability_timezone_unverified_or_mismatch');
});

test('text extraction is evidence-bearing and TF-IDF stays a lexical baseline', () => {
  const extracted = extractProfile('Em cần ôn Big-O và sắp xếp vào thứ 7 từ 08:00 đến 10:00.');
  assert.ok(extracted.topics.some((item) => item.value === 'algorithm.big_o' && item.evidence === 'Big-O'));
  assert.deepEqual(extracted.availability.windows, [{ dayOfWeek: 6, startTime: '08:00', endTime: '10:00' }]);
  assert.deepEqual(extractProfile('Em chỉ rảnh vào cuối tuần.').unresolved, ['availability_requires_explicit_time_range']);
  const scores = scoreTfidf('Big O sorting', ['Big O and sorting', 'database joins']);
  assert.ok(scores[0] > scores[1]);
  assert.ok(scores.every((value) => value >= 0 && value <= 1));
});

test('teaching-style fit requires explicit extracted evidence from both profiles', async () => {
  const service = createMatchingService();
  const result = await service.recommend({
    studentRecord: baseRecord('s1', 'STUDENT', { specialRequest: 'Please explain step by step.' }),
    tutorRecords: [baseRecord('t1', 'TUTOR', { specialRequest: 'I teach step by step.' })],
    assignments: [],
  });
  assert.equal(result.candidates[0].features.teachingStyleFit, 1);
  assert.deepEqual(
    result.candidates[0].reasons.find((reason) => reason.code === 'SHARED_EXTRACTED_TEACHING_STYLE').evidence,
    { student: ['step by step'], tutor: ['step by step'] },
  );
  const unavailable = await service.recommend({
    studentRecord: baseRecord('s2', 'STUDENT', { specialRequest: 'I want help.' }),
    tutorRecords: [baseRecord('t2', 'TUTOR', { specialRequest: 'I can teach algorithms.' })],
    assignments: [],
  });
  assert.equal('teachingStyleFit' in unavailable.candidates[0].features, false);
});

test('BGE provider is never called for a hard-ineligible pair', async () => {
  let callCount = 0;
  const service = createMatchingService({ embeddingProvider: { embed: async () => { callCount += 1; throw new Error('must not be called'); } } });
  const result = await service.recommend({
    studentRecord: baseRecord('s1', 'STUDENT', { subjects: [{ id: 'os' }], specialRequest: 'Big O' }),
    tutorRecords: [baseRecord('t1', 'TUTOR', { subjects: [{ id: 'database' }], specialRequest: 'Big O' })],
    assignments: [],
    model: 'BGE_M3',
  });
  assert.equal(callCount, 0);
  assert.equal(result.candidates.length, 0);
  assert.equal(result.excluded[0].reasons.find((item) => item.constraint === 'subjectMatch').reason, 'subject_mismatch');
});

test('BGE provider receives only the hard-eligible set and produces a non-probability rank score', async () => {
  const calls = [];
  const service = createMatchingService({ embeddingProvider: {
    modelVersion: 'BAAI/bge-m3@test-revision',
    embed: async (texts) => {
      calls.push(texts);
      return texts.map(() => [1, 0]);
    },
  } });
  const result = await service.recommend({
    studentRecord: baseRecord('s1', 'STUDENT', { specialRequest: 'Big O sorting' }),
    tutorRecords: [
      baseRecord('eligible', 'TUTOR', { specialRequest: 'I teach Big O sorting' }),
      baseRecord('ineligible', 'TUTOR', { subjects: [{ id: 'database' }], specialRequest: 'I teach Big O sorting' }),
    ],
    assignments: [],
    model: 'BGE_M3',
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].length, 2);
  assert.equal(result.candidates[0].tutorRegistrationId, 'eligible');
  assert.equal(result.candidates[0].rankingScore, 1);
  assert.equal(result.scoreSemantics, 'ranking_score_not_probability');
  assert.equal(result.modelVersion, 'BAAI/bge-m3@test-revision');
});

test('BGE requests are chunked to the local adapter limit without admitting rejected tutors', async () => {
  const calls = [];
  const service = createMatchingService({ embeddingProvider: {
    embed: async (texts) => {
      calls.push(texts);
      return texts.map(() => [1, 0]);
    },
  } });
  const tutors = Array.from({ length: 51 }, (_, index) => baseRecord(`eligible-${String(index).padStart(2, '0')}`, 'TUTOR', {
    specialRequest: 'I teach Big O sorting.',
  }));
  tutors.push(baseRecord('rejected-subject', 'TUTOR', {
    subjects: [{ id: 'database' }], specialRequest: 'REJECTED_PROFILE_SENTINEL',
  }));
  const result = await service.recommend({
    studentRecord: baseRecord('s1', 'STUDENT', { specialRequest: 'Need help with Big O sorting.' }),
    tutorRecords: tutors,
    assignments: [],
    model: 'BGE_M3',
    topK: tutors.length,
  });
  assert.equal(result.candidates.length, 51);
  assert.deepEqual(calls.map((batch) => batch.length), [51, 2]);
  assert.ok(calls.every((batch) => !batch.some((text) => text.includes('REJECTED_PROFILE_SENTINEL'))));
});

test('TF-IDF uses its native nonnegative cosine scale in the ranker', async () => {
  const service = createMatchingService();
  const result = await service.recommend({
    studentRecord: baseRecord('s1', 'STUDENT', { specialRequest: 'Operating system memory management' }),
    tutorRecords: [baseRecord('t1', 'TUTOR', { specialRequest: 'Operating system memory management virtual memory' })],
    assignments: [],
    model: 'TFIDF',
  });
  const features = result.candidates[0].features;
  assert.ok(features.semanticSimilarity >= 0 && features.semanticSimilarity <= 1);
  assert.equal(features.semanticRankingScore, features.semanticSimilarity);
});

test('offline evaluation computes rank metrics and separates feasibility from relevance ranking', async () => {
  const dataset = {
    schemaVersion: 1,
    datasetId: 'synthetic-unit-fixture',
    labelingStatus: 'synthetic_unit_test',
    split: 'development',
    labelRubric: {
      relevantThreshold: 2,
      grades: { 0: 'not suitable', 1: 'weak', 2: 'suitable', 3: 'strong' },
    },
    queries: [{
      queryId: 'q-pseudonym-1',
      studentRecord: baseRecord('s-pseudonym-1', 'STUDENT', { specialRequest: 'binary trees recursion' }),
      tutorRecords: [
        baseRecord('a-weak-tutor', 'TUTOR', { specialRequest: 'database systems' }),
        baseRecord('z-suitable-tutor', 'TUTOR', { specialRequest: 'binary trees recursion algorithms' }),
      ],
      judgments: { 'a-weak-tutor': 0, 'z-suitable-tutor': 3 },
    }],
  };
  const metrics = calculateRankingMetrics(['z-suitable-tutor', 'a-weak-tutor'], dataset.queries[0].judgments, { k: 1 });
  assert.equal(metrics.precisionAtK, 1);
  assert.equal(metrics.recallAtK, 1);
  assert.equal(metrics.ndcgAtK, 1);
  const result = await evaluateDataset(dataset, { models: ['TFIDF'], k: 1, allowSynthetic: true });
  assert.equal(result.hardConstraintViolationRate, 0);
  assert.equal(result.methods.RULE_FEASIBILITY.metrics.recallAtK, 0);
  assert.equal(result.methods.TFIDF_SEMANTIC.metrics.recallAtK, 1);
  assert.equal(result.methods.TFIDF_HYBRID.metrics.recallAtK, 1);
});

test('offline evaluation rejects identifiable benchmark records', () => {
  assert.throws(() => validateDataset({
    schemaVersion: 1,
    datasetId: 'synthetic-fixture',
    labelingStatus: 'synthetic_unit_test',
    labelRubric: { relevantThreshold: 2, grades: { 0: 'no', 1: 'weak', 2: 'suitable', 3: 'strong' } },
    queries: [],
  }), /Synthetic fixtures cannot be used/);
  assert.throws(() => validateDataset({
    schemaVersion: 1,
    datasetId: 'unsafe-fixture',
    labelingStatus: 'synthetic_unit_test',
    labelRubric: {
      relevantThreshold: 2,
      grades: { 0: 'not suitable', 1: 'weak', 2: 'suitable', 3: 'strong' },
    },
    queries: [{
      queryId: 'q1',
      studentRecord: { ...baseRecord('s1', 'STUDENT'), Email: 'person@example.edu' },
      tutorRecords: [],
      judgments: {},
    }],
  }, { allowSynthetic: true }), /disallowed personal field/);
});

test('API persists recommendations and coordinator decisions; capacity is rechecked', async (t) => {
  const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'spm-matching-test-'));
  const serverFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'server.mjs');
  const server = spawn(process.execPath, [serverFile], {
    env: { ...process.env, BACKEND_PORT: '0', BACKEND_DATA_DIRECTORY: dataDirectory },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    server.kill();
    await rm(dataDirectory, { recursive: true, force: true });
  });

  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server startup timed out')), 5000);
    server.once('error', reject);
    server.once('exit', (code) => reject(new Error(`Server exited: ${code}`)));
    server.stdout.on('data', (chunk) => {
      const match = chunk.toString().match(/localhost:(\d+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(Number(match[1]));
      }
    });
  });
  const request = async (url, token, method = 'GET', body) => {
    const response = await fetch(`http://127.0.0.1:${port}${url}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json() };
  };
  const login = async (email, password) => {
    const response = await request('/api/auth/login', null, 'POST', { email, password });
    assert.equal(response.status, 200);
    return response.data.accessToken;
  };

  const coordinator = await login('coordinator@gmail.com', 'coordinator123');
  const student = await login('student@gmail.com', 'student123');
  const lecturer = await login('lecturer@gmail.com', 'lecturer123');
  const studentTwoResponse = await request('/api/registrations', coordinator, 'POST', {
    registrationType: 'student',
    item: {
      id: 'student-two', Name: 'Student Two', Email: 'student-two@example.edu',
      subjects: [{ id: '3', name: 'Operating System' }], languages: [{ id: 'vi', name: 'Vietnamese' }],
      sessionTypes: [{ id: 'online', name: 'Online' }], locations: [], specialRequest: 'Need help with virtual memory.', status: 'Pending',
      matchingProfile: { requestedModes: ['ONLINE'], availability: { timezone: 'Asia/Ho_Chi_Minh', windows: [] } },
    },
  });
  assert.equal(studentTwoResponse.status, 201);
  const tutorResponse = await request('/api/registrations', coordinator, 'POST', {
    registrationType: 'tutor',
    item: {
      id: 'approved-tutor', Name: 'Tutor Fixture', Email: 'tutor-fixture@example.edu',
      subjects: [{ id: '3', name: 'Operating System' }], languages: [{ id: 'vi', name: 'Vietnamese' }],
      sessionTypes: [{ id: 'online', name: 'Online' }], locations: [], specialRequest: 'I teach virtual memory and memory management.',
      status: 'Approved', matchingProfile: { acceptedModes: ['ONLINE'], maxActiveStudents: 1, availability: { timezone: 'Asia/Ho_Chi_Minh', windows: [] } },
    },
  });
  assert.equal(tutorResponse.status, 201);

  const forbidden = await request('/api/matching/recommendations', lecturer, 'POST', { studentRegistrationId: 'reg-1' });
  assert.equal(forbidden.status, 403);
  const first = await request('/api/matching/recommendations', coordinator, 'POST', { studentRegistrationId: 'reg-1', model: 'TFIDF' });
  const second = await request('/api/matching/recommendations', coordinator, 'POST', { studentRegistrationId: 'student-two', model: 'TFIDF' });
  assert.equal(first.status, 201);
  assert.equal(first.data.item.candidates[0].tutorRegistrationId, 'approved-tutor');
  assert.equal(Number.isFinite(first.data.item.candidates[0].rankingScore), true);
  assert.equal('score' in first.data.item.candidates[0], false);
  assert.equal('specialRequest' in first.data.item, false);
  assert.equal(second.status, 201);
  assert.equal(second.data.item.candidates[0].tutorRegistrationId, 'approved-tutor');

  const accepted = await request(`/api/matching/recommendations/${first.data.item.id}/decision`, coordinator, 'POST', {
    tutorRegistrationId: 'approved-tutor', decision: 'ACCEPT',
  });
  assert.equal(accepted.status, 201);
  assert.ok(accepted.data.decision.assignmentId);
  const feedback = await request('/api/matching/feedback', student, 'POST', {
    assignmentId: accepted.data.decision.assignmentId,
    outcome: 'PARTIAL',
    comment: 'Topic coverage was partial after the first session.',
  });
  assert.equal(feedback.status, 201);
  const nowInfeasible = await request(`/api/matching/recommendations/${second.data.item.id}/decision`, coordinator, 'POST', {
    tutorRegistrationId: 'approved-tutor', decision: 'ACCEPT',
  });
  assert.equal(nowInfeasible.status, 409);
  assert.equal(nowInfeasible.data.code, 'MATCH_NO_LONGER_FEASIBLE');

  const assignments = JSON.parse(await readFile(path.join(dataDirectory, 'matching-assignments.json'), 'utf8'));
  const decisions = JSON.parse(await readFile(path.join(dataDirectory, 'matching-decisions.json'), 'utf8'));
  const recommendations = JSON.parse(await readFile(path.join(dataDirectory, 'matching-recommendations.json'), 'utf8'));
  const feedbackEvents = JSON.parse(await readFile(path.join(dataDirectory, 'matching-feedback.json'), 'utf8'));
  assert.equal(assignments.length, 1);
  assert.equal(decisions[0].decision, 'ACCEPT');
  assert.equal(feedbackEvents[0].outcome, 'PARTIAL');
  assert.equal(recommendations.find((item) => item.id === first.data.item.id).status, 'ACCEPTED');
});
