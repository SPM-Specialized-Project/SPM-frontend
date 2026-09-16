import { useNavigate } from '@tanstack/react-router';
import React, { useEffect, useRef, useState } from 'react';

// Import dữ liệu giả (điều chỉnh đường dẫn nếu cần)
import { courseDriver } from '@/components/data/~mock-courses';
import {
  mockLanguages,
  mockLocations,
  createPastRegistration,
} from '@/components/data/~mock-register';
import { useJsonData } from '@/services/use-json-data';

import { FormDropdown, FormSection, FormTextArea, type DropdownOption } from './tutor-register-form';

// SVG cho Môn học
const SubjectIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="33" height="28" viewBox="0 0 33 28" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M19.0201 19.318H5.43359V21.5907H19.0201V19.318ZM27.1721 10.2271H5.43359V12.4998H27.1721V10.2271ZM5.43359 17.0453H27.1721V14.7726H5.43359V17.0453ZM5.43359 5.68164V7.95437H27.1721V5.68164H5.43359Z" fill="#A3ACC2" />
  </svg>
);

// SVG cho Ngôn ngữ
const LanguageIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g clipPath="url(#clip0_1075_2849_lang)"><path d="M4 5H11" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 3V5C9 9.418 6.761 13 4 13" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 9C4.997 11.144 7.952 12.908 11.7 13" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 20L16 11L20 20" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M19.0984 18H12.8984" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></g>
    <defs><clipPath id="clip0_1075_2849_lang"><rect width="24" height="24" fill="white" /></clipPath></defs>
  </svg>
);

// SVG cho Loại hình
const SessionTypeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g clipPath="url(#clip0_1075_2849_type)"><path d="M4 5H11" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 3V5C9 9.418 6.761 13 4 13" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 9C4.997 11.144 7.952 12.908 11.7 13" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 20L16 11L20 20" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M19.0984 18H12.8984" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></g>
    <defs><clipPath id="clip0_1075_2849_type"><rect width="24" height="24" fill="white" /></clipPath></defs>
  </svg>
);

// SVG cho Địa điểm
const LocationIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g clipPath="url(#clip0_1075_2875_loc)"><path d="M4 21V14" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 10V3" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 21V12" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 8V3" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M20 21V16" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M20 12V3" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M1 14H7" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 8H15" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M17 16H23" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></g>
    <defs><clipPath id="clip0_1075_2875_loc"><rect width="24" height="24" fill="white" /></clipPath></defs>
  </svg>
);

// === COMPONENT CHÍNH ===

export function StudentRegister() {
  const courses = useJsonData(courseDriver);
  // State cho form
  // Dropdown option arrays for subject and session type (from mock data)
  const subjectOptions: DropdownOption[] = courses.map((c) => ({ id: c.id, name: `${c.title} (${c.code})` }));
  const [isSaved, setIsSaved] = useState(true);
  const [showSaveStatus, setShowSaveStatus] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTypeOptions: DropdownOption[] = [
    { id: 'online', name: 'Học trực tuyến' },
    { id: 'hybrid', name: 'Học trực tuyến và trực tiếp' },
  ];

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

  const [subject, setSubject] = useState<DropdownOption>(subjectOptions[0]);
  const [language, setLanguage] = useState(mockLanguages[0]); // Mặc định là Vietnamese
  const [sessionType, setSessionType] = useState<DropdownOption>(sessionTypeOptions[0]);
  const [location, setLocation] = useState<DropdownOption | undefined>(mockLocations[1]);
  const [specialRequest, setSpecialRequest] = useState(
    ``
  );
  const [desiredScore, setDesiredScore] = useState<number | null>(4.0);

  const navigate = useNavigate();

  useEffect(() => {
    if (sessionType.id === 'online') {
      setLocation(undefined);
    } else {
      if (!location) setLocation(mockLocations[1]);
    }
  }, [sessionType, location]);



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
            {/* Môn học */}
            <FormSection title="Môn học">
              <FormDropdown
                icon={<SubjectIcon className="size-5" />}
                options={subjectOptions}
                selected={subject}
                onSelect={(option) => {
                  setSubject(option);
                  handleChange();
                }}
              />
            </FormSection>

            {/* Ngôn ngữ */}
            <FormSection title="Ngôn ngữ">
              <FormDropdown
                icon={<LanguageIcon className="size-5" />}
                options={mockLanguages}
                selected={language}
                onSelect={(option) => {
                  setLanguage(option);
                  handleChange();
                }}
              />
            </FormSection>

            {/* Loại hình */}
            <FormSection title="Loại hình">
              <FormDropdown
                icon={<SessionTypeIcon className="size-5" />}
                options={sessionTypeOptions}
                selected={sessionType}
                onSelect={(option) => {
                  setSessionType(option);
                  handleChange();
                }}
              />
            </FormSection>

            {/* Địa điểm (ẩn khi chọn hybrid/online) */}
            {sessionType.id !== 'online' && location && (
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
              </FormSection>
            )}


            {/* Yêu cầu đặc biệt */}
            <FormSection title="Yêu cầu đặc biệt">
              <FormTextArea
                value={specialRequest}
                onChange={(e) => {
                  setSpecialRequest(e.target.value);
                  handleChange();
                }}
                rows={8}
                placeholder={
                  `In MiniGo, an identifier is the name used to identify variables, constants, types, functions, or other user-defined elements within a program. Identifiers must adhere to the following rules:\n\n• Composition: An identifier must start with a letter (A-Z or a-z) or an underscore (_). Subsequent characters can include letters, digits (0-9), or underscores.\n• Case Sensitivity: Identifiers are case-sensitive, meaning myVariable and MyVariable are treated as distinct identifiers.\n• Length: There is no explicit limit on the length of an identifier, but it is recommended to use concise yet descriptive names for clarity.\n• Keywords Restriction: Identifiers cannot be the same as any reserved keyword in MiniGo.`
                }
              />
            </FormSection>
            {/* Điểm mong muốn */}
            <FormSection title="Điểm mong muốn">
              <FormTextArea
                value={desiredScore === null ? '' : String(desiredScore)}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v || v.trim() === '') {
                    setDesiredScore(null);
                    return;
                  }
                  const n = parseFloat(v);
                  if (Number.isFinite(n)) setDesiredScore(n);
                  handleChange();
                }}
                rows={1}
                placeholder="4.0"
              />
            </FormSection>

          </div>

          {/* Footer Nút bấm */}
          <div className="flex justify-end gap-4 rounded-b-lg border-t border-gray-200 bg-gray-50 p-6">
            <button
              onClick={() => {
                navigate({ to: '/dashboard' })
              }}
              type="button"
              className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              className="rounded-lg bg-blue-700 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-800"
              onClick={() => {
                // Create and save registration
                try {
                  const rawUserStore = localStorage.getItem('userStore');
                  const userStore = rawUserStore ? JSON.parse(rawUserStore as string) : null;
                  const State = userStore?.state ?? null;
                  const userLocalStore = State?.user ?? null;
                  const stuName = userLocalStore?.firstName ?? '';
                  const stuEmail = userLocalStore?.email ?? '';
                  createPastRegistration({
                    // course: subject,
                    // language,
                    // sessionType,
                    // location: sessionType.id === 'online' ? undefined : location,
                    // specialRequest,
                    id: `reg-${Date.now()}`,
                    Name: `${stuName}`,
                    Email: `${stuEmail}`,
                    course: subject,
                    language,
                    sessionType,
                    specialRequest,
                    status: 'Pending',
                    createdAt: `${new Date().toISOString()}`,
                  });
                } catch (err) {
                  console.error(err);
                }

                // Navigate to registration history
                navigate({ to: '/registration-history' });
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
