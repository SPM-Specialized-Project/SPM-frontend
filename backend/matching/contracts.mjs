const MODE_ALIASES = new Map([
  ['online', 'ONLINE'],
  ['onsite', 'ONSITE'],
  ['in_person', 'ONSITE'],
  ['offline', 'ONSITE'],
  ['hybrid', 'HYBRID'],
]);

const normalizeText = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/\p{M}/gu, '')
  .replace(/đ/giu, 'd')
  .toLocaleLowerCase('vi-VN');

function getIds(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => {
    if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
    return String(value?.id ?? '').trim();
  }).filter(Boolean))];
}

function normalizeModes(values) {
  const raw = getIds(values);
  const unknown = raw.filter((value) => !MODE_ALIASES.has(value.toLocaleLowerCase('en-US')));
  return {
    modes: [...new Set(raw.map((value) => MODE_ALIASES.get(value.toLocaleLowerCase('en-US'))).filter(Boolean))],
    unknown,
  };
}

function readAvailability(record) {
  const profile = record.matchingProfile ?? {};
  const availability = record.availability ?? profile.availability;
  if (!availability || typeof availability !== 'object') return null;
  const windows = Array.isArray(availability.windows) ? availability.windows : [];
  const validWindows = [];
  for (const window of windows) {
    const dayOfWeek = Number(window?.dayOfWeek);
    const startTime = String(window?.startTime ?? '00:00');
    const endTime = String(window?.endTime ?? '24:00');
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6
      || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)
      || !/^(24:00|([01]\d|2[0-3]):[0-5]\d)$/.test(endTime)
      || startTime >= endTime) {
      return { invalid: true, timezone: String(availability.timezone ?? ''), windows: [] };
    }
    validWindows.push({ dayOfWeek, startTime, endTime });
  }
  return {
    timezone: String(availability.timezone ?? ''),
    windows: validWindows,
    invalid: false,
  };
}

function normalizeRegistration(record, role) {
  const profile = record?.matchingProfile ?? {};
  const modeField = role === 'STUDENT'
    ? (record?.requestedModes ?? profile.requestedModes ?? record?.sessionTypes)
    : (record?.acceptedModes ?? profile.acceptedModes ?? record?.sessionTypes);
  const normalizedMode = normalizeModes(modeField);
  const subjectIds = getIds(record?.subjectIds ?? profile.subjectIds ?? record?.subjects);
  const languages = getIds(role === 'STUDENT'
    ? (record?.acceptedLanguages ?? profile.acceptedLanguages ?? record?.languages)
    : (record?.acceptedLanguages ?? profile.acceptedLanguages ?? record?.languages));
  const maxActiveStudents = profile.maxActiveStudents ?? record?.maxActiveStudents ?? null;
  const topics = Array.isArray(profile.topicCompetencies)
    ? profile.topicCompetencies.map((item) => String(item?.topicId ?? '').trim()).filter(Boolean)
    : [];

  return {
    id: String(record?.id ?? ''),
    role,
    status: String(record?.status ?? '').trim().toUpperCase(),
    subjectIds,
    languages,
    modes: normalizedMode.modes,
    unknownModes: normalizedMode.unknown,
    locationIds: getIds(record?.locationIds ?? profile.locationIds ?? record?.locations),
    specialRequest: String(record?.specialRequest ?? ''),
    availability: readAvailability(record),
    maxActiveStudents,
    topicIds: [...new Set(topics)],
    matchingProfile: profile,
  };
}

function validateNormalizedRegistration(registration) {
  const errors = [];
  if (!registration.id) errors.push('registration_id_required');
  if (registration.unknownModes.length > 0) errors.push('unknown_session_mode');
  if (registration.subjectIds.length === 0) errors.push('subject_required');
  if (registration.languages.length === 0) errors.push('language_required');
  if (registration.modes.length === 0) errors.push('session_mode_required');
  if (registration.availability?.invalid) errors.push('invalid_availability_window');
  return errors;
}

function expandMode(mode) {
  if (mode === 'HYBRID') return new Set(['ONLINE', 'ONSITE']);
  return new Set([mode]);
}

function windowsOverlap(studentWindows, tutorWindows) {
  return studentWindows.some((studentWindow) => tutorWindows.some((tutorWindow) =>
    studentWindow.dayOfWeek === tutorWindow.dayOfWeek
      && studentWindow.startTime < tutorWindow.endTime
      && tutorWindow.startTime < studentWindow.endTime));
}

export {
  expandMode,
  getIds,
  normalizeRegistration,
  normalizeText,
  readAvailability,
  validateNormalizedRegistration,
  windowsOverlap,
};
