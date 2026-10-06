import {
  expandMode,
  validateNormalizedRegistration,
  windowsOverlap,
} from './contracts.mjs';

const passed = (reason = 'satisfied') => ({ passed: true, reason });
const failed = (reason) => ({ passed: false, reason });

function evaluateHardConstraints(student, tutor, activeTutorAssignments = 0) {
  const studentErrors = validateNormalizedRegistration(student);
  const tutorErrors = validateNormalizedRegistration(tutor);
  const subjectMatch = student.subjectIds.some((id) => tutor.subjectIds.includes(id));
  const languageMatch = student.languages.some((id) => tutor.languages.includes(id));
  const studentModes = new Set(student.modes.flatMap((mode) => [...expandMode(mode)]));
  const tutorModes = new Set(tutor.modes.flatMap((mode) => [...expandMode(mode)]));
  const modeMatch = [...studentModes].some((mode) => tutorModes.has(mode));
  const onlineModeMatch = studentModes.has('ONLINE') && tutorModes.has('ONLINE');
  const onsiteModeMatch = studentModes.has('ONSITE') && tutorModes.has('ONSITE');
  const sharedOnsiteLocation = student.locationIds.length > 0
    && tutor.locationIds.length > 0
    && student.locationIds.some((id) => tutor.locationIds.includes(id));
  // A shared online option satisfies HYBRID without imposing a physical location.
  const locationMatch = onlineModeMatch || (onsiteModeMatch && sharedOnsiteLocation);

  const studentAvailability = student.availability?.windows?.length > 0
    ? { required: true, windows: student.availability.windows, invalid: student.availability.invalid }
    : student.extractedAvailability;
  const tutorAvailability = tutor.availability?.windows?.length > 0
    ? { required: true, windows: tutor.availability.windows, invalid: tutor.availability.invalid }
    : tutor.extractedAvailability;
  const availabilityRequired = Boolean(studentAvailability?.required);
  const studentTimezone = student.availability?.timezone || studentAvailability?.timezone || '';
  const tutorTimezone = tutor.availability?.timezone || tutorAvailability?.timezone || '';
  const timezoneCompatible = !availabilityRequired || Boolean(studentTimezone && tutorTimezone && studentTimezone === tutorTimezone);
  const availabilityMatch = !availabilityRequired
    || (studentAvailability?.invalid !== true
      && tutorAvailability?.invalid !== true
      && timezoneCompatible
      && Array.isArray(tutorAvailability?.windows)
      && tutorAvailability.windows.length > 0
      && windowsOverlap(studentAvailability.windows ?? [], tutorAvailability.windows));

  const capacity = tutor.maxActiveStudents;
  const capacityConfigured = Number.isInteger(capacity) && capacity >= 0;
  const capacityAvailable = capacityConfigured && activeTutorAssignments < capacity;

  const constraints = {
    subjectMatch: subjectMatch ? passed() : failed(studentErrors.includes('subject_required') || tutorErrors.includes('subject_required') ? 'subject_unavailable' : 'subject_mismatch'),
    languageMatch: languageMatch ? passed() : failed(studentErrors.includes('language_required') || tutorErrors.includes('language_required') ? 'language_unavailable' : 'language_mismatch'),
    modeMatch: modeMatch ? passed() : failed(studentErrors.includes('session_mode_required') || tutorErrors.includes('session_mode_required') ? 'mode_unavailable' : 'mode_mismatch'),
    locationMatch: locationMatch ? passed(onlineModeMatch ? 'shared_online_mode' : 'shared_onsite_location') : failed(onsiteModeMatch ? 'onsite_location_unavailable_or_mismatch' : 'no_shared_delivery_mode'),
    availabilityMatch: availabilityMatch ? passed(availabilityRequired ? 'overlapping_availability' : 'not_required_by_student') : failed(!timezoneCompatible ? 'availability_timezone_unverified_or_mismatch' : tutorAvailability?.windows?.length ? 'no_availability_overlap' : 'availability_unverified'),
    capacityAvailable: capacityAvailable ? passed() : failed(capacityConfigured ? 'capacity_exhausted' : 'capacity_not_configured'),
  };
  if (studentErrors.includes('unknown_session_mode') || tutorErrors.includes('unknown_session_mode')) {
    constraints.modeMatch = failed('unknown_session_mode');
  }
  if (studentErrors.includes('invalid_availability_window') || tutorErrors.includes('invalid_availability_window')) {
    constraints.availabilityMatch = failed('invalid_availability_window');
  }

  return {
    eligible: Object.values(constraints).every((constraint) => constraint.passed),
    constraints,
  };
}

export { evaluateHardConstraints };
