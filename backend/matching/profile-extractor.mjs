import { normalizeText } from './contracts.mjs';

const TOPIC_PATTERNS = [
  { id: 'algorithm.big_o', patterns: [/\bbig\s*[- ]?\s*o\b/giu, /\bbig\s+oh\b/giu, /do phuc tap/giu] },
  { id: 'algorithm.sorting', patterns: [/\bsort(?:ing)?\b/giu, /sap xep/giu] },
  { id: 'algorithm.recursion', patterns: [/\brecursion\b/giu, /de quy/giu] },
  { id: 'algorithm.graphs', patterns: [/\bgraphs?\b/giu, /do thi/giu] },
  { id: 'oop', patterns: [/\boop\b/giu, /object[- ]oriented/giu, /lap trinh huong doi tuong/giu] },
  { id: 'database.sql', patterns: [/\bsql\b/giu, /query optimization/giu, /toi uu hoa truy van/giu] },
  { id: 'network.tcp_ip', patterns: [/\btcp\s*[/ ]?\s*ip\b/giu, /routing protocols?/giu, /subnetting/giu, /dinh tuyen/giu] },
  { id: 'operating_system.memory_management', patterns: [/memory management/giu, /quan ly bo nho/giu, /virtual memory/giu] },
  { id: 'operating_system.process_scheduling', patterns: [/process scheduling/giu, /lap lich tien trinh/giu] },
];

const INTENT_PATTERNS = [
  { id: 'EXAM_PREP', pattern: /\b(exam|exams|test|review for exam|practice exam)\b|on thi|luyen de|ky thi/giu },
  { id: 'FOUNDATIONAL', pattern: /\b(start from scratch|beginner|foundations?)\b|mat goc|hoc lai tu dau/giu },
  { id: 'TOPIC_LEARNING', pattern: /\b(learn|study|review|understand|topic)\b|hoc sau|on tap|hoc ve/giu },
  { id: 'ASSIGNMENT_SUPPORT', pattern: /\b(homework|assignment|coursework)\b|bai tap|do an/giu },
  { id: 'SCHEDULING', pattern: /\b(available|availability|weekend|weekday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|ranh|lich hoc|cuoi tuan|thu [2-7]|chu nhat/giu },
  { id: 'TEACHING_PREFERENCE', pattern: /\b(slowly|examples|teaching style|step by step)\b|day cham|nhieu vi du|tung buoc/giu },
];

function normalizeWithSpans(source) {
  let text = '';
  const spans = [];
  let offset = 0;
  for (const character of source) {
    const start = offset;
    offset += character.length;
    let normalized = normalizeText(character);
    for (let index = 0; index < normalized.length; index += 1) {
      text += normalized[index];
      spans.push({ start, end: offset });
    }
  }
  return { text, spans };
}

function sourceEvidence(source, spans, start, end) {
  const selected = spans.slice(start, end);
  if (selected.length === 0) return '';
  return source.slice(selected[0].start, selected.at(-1).end);
}

function collectMatches(source, descriptor) {
  const { text, spans } = normalizeWithSpans(source);
  const evidence = [];
  for (const pattern of descriptor.patterns ?? [descriptor.pattern]) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      evidence.push({ value: descriptor.id, evidence: sourceEvidence(source, spans, match.index, match.index + match[0].length) });
    }
  }
  return evidence;
}

function extractAvailability(source) {
  const normalized = normalizeText(source);
  const days = new Set();
  if (/weekend|cuoi tuan/u.test(normalized)) {
    days.add(6);
    days.add(0);
  }
  if (/weekday|ngay trong tuan/u.test(normalized)) {
    [1, 2, 3, 4, 5].forEach((day) => days.add(day));
  }
  const dayPatterns = [
    { day: 1, pattern: /\bmonday\b|\bthu 2\b/u },
    { day: 2, pattern: /\btuesday\b|\bthu 3\b/u },
    { day: 3, pattern: /\bwednesday\b|\bthu 4\b/u },
    { day: 4, pattern: /\bthursday\b|\bthu 5\b/u },
    { day: 5, pattern: /\bfriday\b|\bthu 6\b/u },
    { day: 6, pattern: /\bsaturday\b|\bsat\b|\bthu 7\b/u },
    { day: 0, pattern: /\bsunday\b|\bsun\b|\bchu nhat\b/u },
  ];
  for (const entry of dayPatterns) if (entry.pattern.test(normalized)) days.add(entry.day);
  const hasAvailabilityCue = /available|availability|free|only|weekend|weekday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|ranh|lich hoc|cuoi tuan|ngay trong tuan|thu [2-7]|chu nhat/u.test(normalized);
  if (!hasAvailabilityCue || days.size === 0) return { required: false, windows: [], evidence: [] };

  const { text, spans } = normalizeWithSpans(source);
  const evidence = [];
  const rangePattern = /\b([01]?\d|2[0-3]):([0-5]\d)\s*(?:-|to|den|toi|–)\s*([01]?\d|2[0-3]):([0-5]\d)\b/u;
  const range = text.match(rangePattern);
  let startTime;
  let endTime;
  if (range) {
    startTime = `${range[1].padStart(2, '0')}:${range[2]}`;
    endTime = `${range[3].padStart(2, '0')}:${range[4]}`;
    if (startTime >= endTime) return { required: true, windows: [], invalid: true, evidence: [] };
    evidence.push({ value: `${startTime}-${endTime}`, evidence: sourceEvidence(source, spans, range.index, range.index + range[0].length) });
  } else if (days.size > 0) {
    const dayCue = /weekend|weekends|weekday|weekdays|monday|tuesday|wednesday|thursday|friday|saturday|sunday|ranh|lich hoc|cuoi tuan|ngay trong tuan|thu [2-7]|chu nhat/u;
    const match = text.match(dayCue);
    if (match) evidence.push({ value: [...days].sort().join(','), evidence: sourceEvidence(source, spans, match.index, match.index + match[0].length) });
    return {
      required: false,
      invalid: false,
      windows: [],
      evidence,
      unresolved: ['availability_requires_explicit_time_range'],
    };
  }
  return {
    required: true,
    invalid: false,
    windows: [...days].sort().map((dayOfWeek) => ({ dayOfWeek, startTime, endTime })),
    evidence,
  };
}

function extractProfile(text) {
  const source = String(text ?? '');
  const intents = INTENT_PATTERNS.flatMap((descriptor) => collectMatches(source, descriptor))
    .filter((item, index, all) => all.findIndex((candidate) => candidate.value === item.value) === index);
  const topics = TOPIC_PATTERNS.flatMap((descriptor) => collectMatches(source, descriptor))
    .filter((item, index, all) => all.findIndex((candidate) => candidate.value === item.value) === index);
  const teachingPreferences = [];
  for (const [pattern, value] of [
    [/day cham|slowly/giu, 'SLOW_PACED'],
    [/nhieu vi du|examples/giu, 'MANY_EXAMPLES'],
    [/tung buoc|step by step/giu, 'STEP_BY_STEP'],
  ]) {
    const match = collectMatches(source, { id: value, pattern })[0];
    if (match) teachingPreferences.push(match);
  }
  const availability = extractAvailability(source);
  return {
    schemaVersion: 1,
    intents,
    topics,
    learnerLevel: null,
    targetLevel: null,
    teachingPreferences,
    availabilityConstraints: availability.evidence,
    availability,
    unresolved: availability.unresolved ?? [],
  };
}

export { extractAvailability, extractProfile };
