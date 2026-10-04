import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { createMatchingService } from './service.mjs';
import { calculateRankingMetrics, summarizeRankingMetrics } from './ranking-metrics.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_MODELS = ['TFIDF', 'BGE_M3'];
const FORBIDDEN_PROFILE_KEYS = new Set(['name', 'email', 'phone', 'address', 'mssv', 'studentcode', 'fullname']);

function assertAnonymized(value, location = 'record') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertAnonymized(item, `${location}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_PROFILE_KEYS.has(key.toLowerCase().replace(/[_-]/g, ''))) {
      throw new Error(`${location} contains disallowed personal field "${key}"; anonymize the benchmark first.`);
    }
    assertAnonymized(nestedValue, `${location}.${key}`);
  }
}

function validateDataset(dataset, { allowSynthetic = false } = {}) {
  if (dataset?.schemaVersion !== 1 || typeof dataset.datasetId !== 'string' || !dataset.datasetId.trim()) {
    throw new Error('Dataset must declare schemaVersion: 1 and a non-empty datasetId.');
  }
  if (!['coordinator_reviewed', 'synthetic_unit_test'].includes(dataset.labelingStatus)) {
    throw new Error('Dataset must declare labelingStatus as coordinator_reviewed or synthetic_unit_test.');
  }
  if (dataset.labelingStatus === 'synthetic_unit_test' && !allowSynthetic) {
    throw new Error('Synthetic fixtures cannot be used for quality evaluation.');
  }
  if (dataset.labelRubric?.relevantThreshold !== 2
      || !['0', '1', '2', '3'].every((grade) => typeof dataset.labelRubric.grades?.[grade] === 'string' && dataset.labelRubric.grades[grade].trim())) {
    throw new Error('Dataset must declare the agreed four-grade rubric with relevance threshold 2.');
  }
  if (!Array.isArray(dataset.queries) || dataset.queries.length === 0) {
    throw new Error('Dataset must contain at least one reviewed query group.');
  }
  const queryIds = new Set();
  for (const [index, query] of dataset.queries.entries()) {
    if (!query.queryId || queryIds.has(query.queryId)) throw new Error(`queries[${index}] needs a unique queryId.`);
    queryIds.add(query.queryId);
    if (!query.studentRecord?.id || !Array.isArray(query.tutorRecords) || !query.judgments || typeof query.judgments !== 'object') {
      throw new Error(`queries[${index}] must include studentRecord.id, tutorRecords, and judgments.`);
    }
    if (dataset.labelingStatus === 'coordinator_reviewed') {
      const labeling = query.labelingMetadata;
      if (!labeling?.rubricVersion || !['COORDINATOR', 'DOMAIN_EXPERT'].includes(labeling.reviewerRole)
          || !Number.isInteger(labeling.reviewerCount) || labeling.reviewerCount < 1 || labeling.adjudicated !== true) {
        throw new Error(`queries[${index}] needs an adjudicated Coordinator/domain-expert labeling record.`);
      }
    }
    assertAnonymized(query.studentRecord, `queries[${index}].studentRecord`);
    const tutorIds = new Set();
    for (const [tutorIndex, tutor] of query.tutorRecords.entries()) {
      if (!tutor?.id || tutorIds.has(tutor.id)) throw new Error(`queries[${index}].tutorRecords[${tutorIndex}] needs a unique tutor id.`);
      tutorIds.add(tutor.id);
      assertAnonymized(tutor, `queries[${index}].tutorRecords[${tutorIndex}]`);
    }
    for (const [tutorId, grade] of Object.entries(query.judgments)) {
      if (!tutorIds.has(tutorId) || !Number.isInteger(grade) || grade < 0 || grade > 3) {
        throw new Error(`queries[${index}].judgments must map known tutor ids to integer grades 0..3.`);
      }
    }
  }
}

function byFeature(candidates, feature) {
  return [...candidates].sort((left, right) => {
    const leftValue = left.features[feature];
    const rightValue = right.features[feature];
    return (Number.isFinite(rightValue) ? rightValue : -Infinity)
      - (Number.isFinite(leftValue) ? leftValue : -Infinity)
      || left.tutorRegistrationId.localeCompare(right.tutorRegistrationId);
  }).map((candidate) => candidate.tutorRegistrationId);
}

function metricsForMethod(queryResults, method, k) {
  const perQuery = queryResults.map(({ rankings, judgments }) => calculateRankingMetrics(rankings[method], judgments, { k }));
  return summarizeRankingMetrics(perQuery, k);
}

async function evaluateDataset(dataset, { models = ['TFIDF'], embeddingProvider, k = 5, allowSynthetic = false } = {}) {
  validateDataset(dataset, { allowSynthetic });
  if (!Number.isInteger(k) || k < 1) throw new Error('k must be a positive integer.');
  const normalizedModels = [...new Set(models.map((model) => String(model).trim().toUpperCase()))];
  if (!normalizedModels.length || normalizedModels.some((model) => !['TFIDF', 'BGE_M3'].includes(model))) {
    throw new Error('models must contain TFIDF and/or BGE_M3.');
  }
  const service = createMatchingService({ embeddingProvider });
  const methods = ['RULE_FEASIBILITY'];
  for (const model of normalizedModels) methods.push(`${model}_SEMANTIC`, `${model}_HYBRID`);

  const queryResults = [];
  const modelVersions = Object.fromEntries(normalizedModels.map((model) => [model, new Set()]));
  let noCandidateCount = 0;
  let checkedPairs = 0;
  let hardConstraintViolations = 0;
  const semanticPairCounts = Object.fromEntries(normalizedModels.map((model) => [model, 0]));
  const eligiblePairCounts = Object.fromEntries(normalizedModels.map((model) => [model, 0]));

  for (const query of dataset.queries) {
    const modelResults = new Map();
    for (const model of normalizedModels) {
      const result = await service.recommend({
        studentRecord: query.studentRecord,
        tutorRecords: query.tutorRecords,
        assignments: query.assignments ?? [],
        topK: Math.max(1, query.tutorRecords.length),
        model,
      });
      modelVersions[model].add(result.modelVersion);
      modelResults.set(model, result);
      checkedPairs += result.candidates.length;
      hardConstraintViolations += result.candidates.filter((candidate) => candidate.hardConstraints.some((item) => !item.passed)).length;
      const semanticCount = result.candidates.filter((candidate) => Number.isFinite(candidate.features.semanticSimilarity)).length;
      semanticPairCounts[model] += semanticCount;
      eligiblePairCounts[model] += result.candidates.length;
    }

    const referenceResult = modelResults.values().next().value;
    const eligibleIds = referenceResult.candidates.map((candidate) => candidate.tutorRegistrationId).sort();
    if (eligibleIds.length === 0) noCandidateCount += 1;
    for (const [model, result] of modelResults) {
      const ids = result.candidates.map((candidate) => candidate.tutorRegistrationId).sort();
      if (ids.length !== eligibleIds.length || ids.some((id, index) => id !== eligibleIds[index])) {
        throw new Error(`Hard eligibility changed across models for query ${query.queryId}.`);
      }
    }
    for (const tutorId of eligibleIds) {
      if (!Object.hasOwn(query.judgments, tutorId)) {
        throw new Error(`Query ${query.queryId} lacks a Coordinator judgment for eligible tutor ${tutorId}.`);
      }
    }
    const eligibleJudgments = Object.fromEntries(eligibleIds.map((id) => [id, query.judgments[id]]));
    const rankings = {
      RULE_FEASIBILITY: [...eligibleIds],
    };
    for (const model of normalizedModels) {
      const result = modelResults.get(model);
      rankings[`${model}_SEMANTIC`] = byFeature(result.candidates, 'semanticSimilarity');
      rankings[`${model}_HYBRID`] = result.candidates.map((candidate) => candidate.tutorRegistrationId);
    }
    queryResults.push({ rankings, judgments: eligibleJudgments });
  }

  return {
    evaluationSchemaVersion: 1,
    datasetId: dataset.datasetId,
    split: dataset.split ?? 'unspecified',
    queryCount: dataset.queries.length,
    noCandidateCount,
    noCandidateRate: noCandidateCount / dataset.queries.length,
    hardConstraintViolationRate: checkedPairs ? hardConstraintViolations / checkedPairs : 0,
    hardConstraintPairsChecked: checkedPairs,
    semanticFeatureCoverage: Object.fromEntries(normalizedModels.map((model) => [
      model,
      eligiblePairCounts[model] ? semanticPairCounts[model] / eligiblePairCounts[model] : 0,
    ])),
    settings: { k, relevanceThreshold: 2, relevanceGrades: '0=not suitable, 1=weak, 2=suitable, 3=strong', randomSeed: null },
    modelVersions: Object.fromEntries(normalizedModels.map((model) => [model, [...modelVersions[model]]])),
    methods: Object.fromEntries(methods.map((method) => [method, metricsForMethod(queryResults, method, k)])),
    note: 'Macro metrics include query groups with at least one eligible judgment grade >= 2; no model quality is implied beyond this labeled dataset.',
  };
}

function gitEvidence() {
  const git = (args) => {
    try { return execFileSync('git', args, { cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
    catch { return null; }
  };
  return {
    commit: git(['rev-parse', 'HEAD']),
    workingTreeDirty: Boolean(git(['status', '--porcelain'])),
  };
}

function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const [key, inlineValue] = args[index].split('=', 2);
    if (!key.startsWith('--')) throw new Error(`Unexpected argument: ${args[index]}`);
    const value = inlineValue ?? args[++index];
    if (!value) throw new Error(`Missing value for ${key}.`);
    options[key.slice(2)] = value;
  }
  if (!options.input || !options.output) throw new Error('Usage: node backend/matching/evaluate.mjs --input <dataset.json> --output <metrics.json> [--models TFIDF,BGE_M3] [--k 5]');
  return options;
}

async function runCli(args) {
  const options = parseArguments(args);
  const inputPath = path.resolve(options.input);
  const outputPath = path.resolve(options.output);
  if (inputPath === outputPath) throw new Error('Input dataset and output metrics paths must be different.');
  const raw = await readFile(inputPath);
  const dataset = JSON.parse(raw.toString('utf8'));
  const models = options.models ? options.models.split(',') : DEFAULT_MODELS;
  const k = Number(options.k ?? 5);
  const result = await evaluateDataset(dataset, { models, k });
  result.provenance = {
    inputSha256: createHash('sha256').update(raw).digest('hex'),
    git: gitEvidence(),
    inputFile: path.relative(REPO_ROOT, inputPath),
  };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(`Evaluation written to ${outputPath}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

export { evaluateDataset, validateDataset };
