import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';

import { courseStore } from '@/components/data/~mock-courses';
import type { PastRegistration as TutorReg } from '@/components/data/~mock-register';
import { mockLanguages, mockLocations } from '@/components/data/~mock-register';
import { tutorRegistrationStore } from '@/components/data/~mock-tutor-register';
import { api } from '@/services/api-client';
import { useDataStore } from '@/services/use-data-store';
import { getCurrentViewerContext } from '@/services/viewer-context';

import { MatchingAvailabilityFields, type AvailabilityWindow } from './matching-availability-fields';
import { TutorRegisterFields, tutorSessionTypeOptions } from './tutor-register-fields';
import type { DropdownOption } from './tutor-register-form';

export function TutorRegister() {
  const courses = useDataStore(courseStore);
  const courseOptions: DropdownOption[] = courses.map((course) => ({
    id: course.id,
    name: course.title + ' (' + course.code + ')',
  }));
  const [courseSelected, setCourseSelected] = useState<DropdownOption>(courseOptions[0]);
  const [language, setLanguage] = useState(mockLanguages[0]);
  const [sessionType, setSessionType] = useState(tutorSessionTypeOptions[0]);
  const [location, setLocation] = useState(mockLocations[0]);
  const [specialRequest, setSpecialRequest] = useState('');
  const [meetLink, setMeetLink] = useState('');
  const [achievements, setAchievements] = useState('');
  const [addedSubjects, setAddedSubjects] = useState<DropdownOption[]>([]);
  const [addedLanguages, setAddedLanguages] = useState<DropdownOption[]>([]);
  const [addedSessionTypes, setAddedSessionTypes] = useState<DropdownOption[]>([]);
  const [addedLocations, setAddedLocations] = useState<DropdownOption[]>([]);
  const [availabilityWindows, setAvailabilityWindows] = useState<AvailabilityWindow[]>([]);
  const [maxActiveStudents, setMaxActiveStudents] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSaved, setIsSaved] = useState(true);
  const [showSaveStatus, setShowSaveStatus] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  const handleChange = () => {
    setShowSaveStatus(true);
    setIsSaved(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => setIsSaved(true), 3000);
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const addIfNotExists = (
    list: DropdownOption[],
    setter: (value: DropdownOption[]) => void,
    item: DropdownOption,
  ) => {
    if (!list.some((option) => option.id === item.id && option.name === item.name)) {
      setter([item, ...list]);
    }
  };

  const removeItem = (
    list: DropdownOption[],
    setter: (value: DropdownOption[]) => void,
    id: string,
  ) => {
    setter(list.filter((item) => item.id !== id));
  };

  const handleSubmit = async () => {
    let tutorName = '';
    let tutorEmail = '';
    try {
      const rawUserStore = localStorage.getItem('userStore');
      const userStore = rawUserStore ? JSON.parse(rawUserStore) : null;
      const profile = userStore?.state?.user;
      tutorName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim();
      tutorEmail = profile?.email ?? '';
    } catch {
      // The registration requires a valid authenticated profile.
    }

    const capacity = Number(maxActiveStudents);
    if (!tutorName || !tutorEmail || addedSubjects.length === 0 || addedLanguages.length === 0
      || addedSessionTypes.length === 0 || !Number.isInteger(capacity) || capacity < 1) {
      window.alert('Vui lòng xác nhận hồ sơ tài khoản, ít nhất một môn/ngôn ngữ/hình thức, và sức chứa từ 1 học viên.');
      return;
    }

    const newRegistration: TutorReg = {
      id: 'tutor-reg-' + Date.now(),
      Name: tutorName,
      Email: tutorEmail,
      subjects: addedSubjects,
      languages: addedLanguages,
      sessionTypes: addedSessionTypes,
      locations: addedLocations,
      meetLink: meetLink || undefined,
      achievements,
      specialRequest,
      matchingProfile: {
        acceptedModes: addedSessionTypes.map((item) => item.id === 'hybrid' ? 'HYBRID' : item.id === 'offline' ? 'ONSITE' : 'ONLINE'),
        locationIds: addedLocations.map((item) => item.id),
        availability: { timezone: 'Asia/Ho_Chi_Minh', windows: availabilityWindows },
        maxActiveStudents: capacity,
      },
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    setSubmitError('');
    try {
      const response = await api.createRegistration({
        ...getCurrentViewerContext(),
        registrationType: 'tutor',
        item: { ...newRegistration, ownerRole: 'lecturer', ownerEmail: tutorEmail },
      });
      tutorRegistrationStore.upsert(response.data.item);
      navigate({ to: '/registration-history' });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Không lưu được đăng ký tutor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {showSaveStatus && (
        <div
          className={
            'rounded px-4 py-2 text-center text-white shadow-lg transition-colors ' +
            (isSaved ? 'bg-green-500' : 'bg-orange-500')
          }
        >
          {isSaved ? 'Đã lưu' : 'Chưa lưu'}
        </div>
      )}

      <main className="p-6">
        <form
          className="relative rounded-lg bg-white shadow-custom-yellow"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <TutorRegisterFields
            courseOptions={courseOptions}
            courseSelected={courseSelected}
            language={language}
            sessionType={sessionType}
            location={location}
            specialRequest={specialRequest}
            meetLink={meetLink}
            achievements={achievements}
            addedSubjects={addedSubjects}
            addedLanguages={addedLanguages}
            addedSessionTypes={addedSessionTypes}
            addedLocations={addedLocations}
            onCourseSelect={setCourseSelected}
            onLanguageSelect={setLanguage}
            onSessionTypeSelect={setSessionType}
            onLocationSelect={(option) => {
              setLocation(option);
              handleChange();
            }}
            onSpecialRequestChange={(value) => {
              setSpecialRequest(value);
              handleChange();
            }}
            onMeetLinkChange={(value) => {
              setMeetLink(value);
              handleChange();
            }}
            onAchievementsChange={(value) => {
              setAchievements(value);
              handleChange();
            }}
            onAddSubject={() => {
              addIfNotExists(addedSubjects, setAddedSubjects, courseSelected);
              handleChange();
            }}
            onAddLanguage={() => {
              addIfNotExists(addedLanguages, setAddedLanguages, language);
              handleChange();
            }}
            onAddSessionType={() => {
              addIfNotExists(addedSessionTypes, setAddedSessionTypes, sessionType);
              handleChange();
            }}
            onAddLocation={() => {
              addIfNotExists(addedLocations, setAddedLocations, location);
              handleChange();
            }}
            onRemoveSubject={(id) => removeItem(addedSubjects, setAddedSubjects, id)}
            onRemoveLanguage={(id) => removeItem(addedLanguages, setAddedLanguages, id)}
            onRemoveSessionType={(id) => removeItem(addedSessionTypes, setAddedSessionTypes, id)}
            onRemoveLocation={(id) => removeItem(addedLocations, setAddedLocations, id)}
          />

          <div className="space-y-8 px-8 pb-8">
            <MatchingAvailabilityFields windows={availabilityWindows} onChange={setAvailabilityWindows} />
            <label className="block text-sm font-medium text-gray-700">
              Sức chứa tự khai báo: số học viên tối đa đang có thể nhận
              <input
                type="number"
                min="1"
                step="1"
                required
                value={maxActiveStudents}
                onChange={(event) => {
                  setMaxActiveStudents(event.target.value);
                  handleChange();
                }}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-gray-50 p-4 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
              />
            </label>
          </div>

          <div className="flex justify-end gap-4 rounded-b-lg border-t border-gray-200 bg-gray-50 p-6">
            <button
              type="button"
              className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-blue-700 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-800"
            >
              {isSubmitting ? 'Đang lưu…' : 'Đăng ký'}
            </button>
          </div>
          {submitError && <p role="alert" className="px-6 pb-5 text-sm text-red-700">{submitError}</p>}
        </form>
      </main>
    </div>
  );
}
