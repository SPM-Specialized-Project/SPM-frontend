import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { courseDriver } from "@/components/data/~mock-courses";
import { mockLanguages, mockLocations } from "@/components/data/~mock-register";
import type { PastRegistration as TutorReg } from "@/components/data/~mock-register";
import { tutorRegistrationDriver } from "@/components/data/~mock-tutor-register";
import { useJsonData } from "@/services/use-json-data";

import { LanguageIcon, LocationIcon, SessionTypeIcon, SubjectIcon } from "./tutor-register-icons";
import { AddButton, FormDropdown, FormSection, FormTextArea, type DropdownOption } from "./tutor-register-form";

const sessionTypeOptions: DropdownOption[] = [
  { id: "online", name: "Học trực tuyến" },
  { id: "hybrid", name: "Học trực tuyến và trực tiếp" },
];

export function TutorRegister() {
  const courses = useJsonData(courseDriver);
  // State cho form
  // Build course options from mockCourses
  const courseOptions: DropdownOption[] = courses.map(course => ({ id: course.id, name: `${course.title} (${course.code})` }));
  const [courseSelected, setCourseSelected] = useState<DropdownOption>(courseOptions[0]);
  const [language, setLanguage] = useState(mockLanguages[0]);
  const [sessionType, setSessionType] = useState(sessionTypeOptions[0]);
  const [location, setLocation] = useState(mockLocations[0]); // Mặc định Phường 1
  const [specialRequest, setSpecialRequest] = useState(
    ``
  );

  const navigate = useNavigate();

  const [isSaved, setIsSaved] = useState(true);
  const [showSaveStatus, setShowSaveStatus] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = () => {
    setShowSaveStatus(true);
    setIsSaved(false);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      setIsSaved(true);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Local arrays for items the tutor adds
  const [addedSubjects, setAddedSubjects] = useState<DropdownOption[]>([]);
  const [addedLanguages, setAddedLanguages] = useState<DropdownOption[]>([]);
  const [addedSessionTypes, setAddedSessionTypes] = useState<DropdownOption[]>([]);
  const [addedLocations, setAddedLocations] = useState<DropdownOption[]>([]);
  const [meetLink, setMeetLink] = useState<string>("");
  const [achievements, setAchievements] = useState<string>("");
  // const [submitted, setSubmitted] = useState(false);

  // Helpers for adding/removing items (avoid duplicates)
  const addIfNotExists = (list: DropdownOption[], setter: (v: DropdownOption[]) => void, item: DropdownOption) => {
    if (!list.find(l => l.id === item.id && l.name === item.name)) {
      setter([item, ...list]);
    }
  };

  const removeItem = (list: DropdownOption[], setter: (v: DropdownOption[]) => void, id: string) => {
    setter(list.filter(i => i.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-100">

      {showSaveStatus && (
        <div className={`rounded px-4 py-2 text-center text-white shadow-lg transition-colors ${
          isSaved ? 'bg-green-500' : 'bg-orange-500'
          }`}>
          {isSaved ? 'Đã lưu' : 'Chưa lưu'}
        </div>
      )}

      {/* Form Content */}
      <main className="p-6">
        <form
          className="relative rounded-lg bg-white shadow-custom-yellow"
          onSubmit={(e) => e.preventDefault()}
        >
          {/* Container cho các trường */}
          <div className="space-y-8 p-8">

            <FormSection title="Môn học giảng viên muốn dạy">
              <FormDropdown
                icon={<SubjectIcon className="size-5" />}
                options={courseOptions}
                selected={courseSelected}
                onSelect={setCourseSelected}
              />
              <AddButton
                title="Thêm môn học"
                onClick={() => {
                  // add the selected course (avoid duplicates)
                  addIfNotExists(addedSubjects, setAddedSubjects, courseSelected);
                  handleChange();
                }}
              />

              {addedSubjects.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {addedSubjects.map(s => (
                    <span key={s.id} className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm">
                      {s.name}
                      <button type="button" onClick={() => removeItem(addedSubjects, setAddedSubjects, s.id)} className="text-gray-500">✕</button>
                    </span>
                  ))}
                </div>
              )}
            </FormSection>

            {/* [SỬA] Ngôn ngữ (Dropdown + Nút Thêm) */}
            <FormSection title="Ngôn ngữ">
              <FormDropdown
                icon={<LanguageIcon className="size-5" />}
                options={mockLanguages}
                selected={language}
                onSelect={setLanguage}
              />
              <AddButton title="Thêm ngôn ngữ" onClick={() => {
                 addIfNotExists(addedLanguages, setAddedLanguages, language);
                 handleChange();
                }
              } />

              {addedLanguages.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {addedLanguages.map(l => (
                    <span key={l.id} className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm">
                      {l.name}
                      <button type="button" onClick={() => removeItem(addedLanguages, setAddedLanguages, l.id)} className="text-gray-500">✕</button>
                    </span>
                  ))}
                </div>
              )}
            </FormSection>

            {/* [SỬA] Loại hình (Dropdown + Nút Thêm, icon mới) */}
            <FormSection title="Loại hình">
              <FormDropdown
                icon={<SessionTypeIcon className="size-5" />}
                options={sessionTypeOptions}
                selected={sessionType}
                onSelect={setSessionType}
              />
              <AddButton title="Thêm loại hình" onClick={() => {
                addIfNotExists(addedSessionTypes, setAddedSessionTypes, sessionType);
                handleChange();
              }} />

              {addedSessionTypes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {addedSessionTypes.map(t => (
                    <span key={t.id} className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm">
                      {t.name}
                      <button type="button" onClick={() => removeItem(addedSessionTypes, setAddedSessionTypes, t.id)} className="text-gray-500">✕</button>
                    </span>
                  ))}
                </div>
              )}
            </FormSection>

            {addedSessionTypes.some(t => t.id === 'hybrid') && (
              <FormSection title="Địa điểm">
                <FormDropdown
                  icon={<LocationIcon className="size-5" />}
                  options={mockLocations}
                  selected={location}
                  onSelect={(option) => {
                    setLocation(option);
                    handleChange();
                  }}
                />
                <div className="mt-2">
                  <AddButton title="Thêm địa điểm" onClick={() => {
                    addIfNotExists(addedLocations, setAddedLocations, location);
                    handleChange();
                  }} />
                  {addedLocations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {addedLocations.map(l => (
                        <span key={l.id} className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm">
                          {l.name}
                          <button type="button" onClick={() => removeItem(addedLocations, setAddedLocations, l.id)} className="text-gray-500">✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </FormSection>
            )}

            <FormSection title="Link buổi học">
              <input
                type="text"
                value={meetLink}
                onChange={(e) => {
                  setMeetLink(e.target.value);
                  handleChange();
                }}
                placeholder="https://meet.example.com/abc-123"
                className="w-full rounded-lg border border-gray-300 bg-gray-50 p-4 text-gray-900 shadow-custom-yellow focus:border-blue-500 focus:ring-blue-500"
              />
            </FormSection>

            {/* Yêu cầu đặc biệt (Giữ nguyên) */}
            <FormSection title="Yêu cầu đặc biệt">
              <FormTextArea
                value={specialRequest}
                onChange={(e) => {
                  setSpecialRequest(e.target.value);
                  handleChange();
                }}
                rows={8}
              />
            </FormSection>

            {/* Thành tự từng có trong quá khứ */}
            <div className="text-sm text-gray-500">
              <FormSection title="Thành tựu">
                <FormTextArea
                  value={achievements}
                  onChange={(e) => {
                    setAchievements(e.target.value);
                    handleChange();
                  }}
                  rows={8}
                  placeholder="Nhập thành tựu của bạn ở đây..."
                />
              </FormSection>
            </div>
          </div>

          {/* Footer Nút bấm (Giữ nguyên) */}
          <div className="flex justify-end gap-4 rounded-b-lg border-t border-gray-200 bg-gray-50 p-6">
            <button
              type="button"
              className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              className="rounded-lg bg-blue-700 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-800"
              onClick={() => {
                // Build tutor registration object and persist it through the JSON driver
                // Get tutor name from localStorage if available
                let tutorName = 'Anonymous Tutor';
                try {
                  const rawUserStore = localStorage.getItem('userStore');
                  const userStore = rawUserStore ? JSON.parse(rawUserStore as string) : null;
                  const State = userStore?.state ?? null;
                  const userLocalStore = State?.user ?? null;
                  tutorName = userLocalStore?.firstName ?? tutorName;
                } catch {
                  // ignore
                }

                const tutorEmail = tutorName.toLowerCase().replace(/\s+/g, '.') + '@tutor.example.com';

                const newReg: TutorReg = {
                  id: `tutor-reg-${Date.now()}`,
                  Name: tutorName,
                  Email: tutorEmail,
                  subjects: addedSubjects.length ? addedSubjects : [],
                  languages: addedLanguages.length ? addedLanguages : [],
                  sessionTypes: addedSessionTypes.length ? addedSessionTypes : [],
                  locations: addedLocations.length ? addedLocations : [],
                  meetLink: meetLink || undefined,
                  specialRequest,
                  status: 'Pending',
                  createdAt: new Date().toISOString(),
                };

                tutorRegistrationDriver.create(newReg);
                // setSubmitted(true);
                setTimeout(() => navigate({ to: '/registration-history' }), 1500);
              }}
            >
              Đăng ký
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
