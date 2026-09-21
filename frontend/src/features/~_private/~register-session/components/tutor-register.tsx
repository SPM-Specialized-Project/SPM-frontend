import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';

import { courseStore } from '@/components/data/~mock-courses';
import type { PastRegistration as TutorReg } from '@/components/data/~mock-register';
import { mockLanguages, mockLocations } from '@/components/data/~mock-register';
import { tutorRegistrationStore } from '@/components/data/~mock-tutor-register';
import { useDataStore } from '@/services/use-data-store';

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

  const handleSubmit = () => {
    let tutorName = 'Anonymous Tutor';
    try {
      const rawUserStore = localStorage.getItem('userStore');
      const userStore = rawUserStore ? JSON.parse(rawUserStore) : null;
      tutorName = userStore?.state?.user?.firstName ?? tutorName;
    } catch {
      // Keep the fallback tutor name for malformed local storage.
    }

    const newRegistration: TutorReg = {
      id: 'tutor-reg-' + Date.now(),
      Name: tutorName,
      Email: tutorName.toLowerCase().replace(/\s+/g, '.') + '@tutor.example.com',
      subjects: addedSubjects,
      languages: addedLanguages,
      sessionTypes: addedSessionTypes,
      locations: addedLocations,
      meetLink: meetLink || undefined,
      specialRequest,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };

    tutorRegistrationStore.create(newRegistration);
    setTimeout(() => navigate({ to: '/registration-history' }), 1500);
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
            handleSubmit();
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

          <div className="flex justify-end gap-4 rounded-b-lg border-t border-gray-200 bg-gray-50 p-6">
            <button
              type="button"
              className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-800"
            >
              Đăng ký
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
