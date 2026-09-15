import {
  ChevronDownIcon,
  PlusIcon
} from '@heroicons/react/24/solid';
import { useNavigate } from '@tanstack/react-router';
import React, { useState, useRef, useEffect } from 'react';

// Import dữ liệu giả (từ file mock chúng ta đã tạo)
import { courseDriver } from '@/components/data/~mock-courses';
import {
  mockLanguages,
  mockLocations
} from '@/components/data/~mock-register';
import type { PastRegistration as TutorReg } from '@/components/data/~mock-register';
import { tutorRegistrationDriver } from '@/components/data/~mock-tutor-register';
import { useJsonData } from '@/services/use-json-data';

// --- BIẾN ĐỔI SVG THÀNH COMPONENT ---
// (Tái sử dụng các SVG bạn đã cung cấp)

// SVG cho icon đầu mỗi danh mục
const SectionIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M15.8333 2.5H4.16667C3.24167 2.5 2.5 3.25 2.5 4.16667V15.8333C2.5 16.75 3.24167 17.5 4.16667 17.5H15.8333C16.75 17.5 17.5 16.75 17.5 15.8333V4.16667C17.5 3.25 16.75 2.5 15.8333 2.5ZM14.1667 10.8333H10.8333V14.1667H9.16667V10.8333H5.83333V9.16667H9.16667V5.83333H10.8333V9.16667H14.1667V10.8333Z" fill="#3D4863" />
  </svg>
);

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

// [SỬA] SVG cho Loại hình (dùng SVG Địa điểm, khớp với hình ảnh mới)
const SessionTypeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g clipPath="url(#clip0_1075_2875_type)"><path d="M4 21V14" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 10V3" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 21V12" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 8V3" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M20 21V16" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M20 12V3" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M1 14H7" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 8H15" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M17 16H23" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></g>
    <defs><clipPath id="clip0_1075_2875_type"><rect width="24" height="24" fill="white" /></clipPath></defs>
  </svg>
);

// SVG cho Địa điểm
const LocationIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g clipPath="url(#clip0_1075_2875_loc)"><path d="M4 21V14" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 10V3" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 21V12" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 8V3" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M20 21V16" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M20 12V3" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M1 14H7" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 8H15" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M17 16H23" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></g>
    <defs><clipPath id="clip0_1075_2875_loc"><rect width="24" height="24" fill="white" /></clipPath></defs>
  </svg>
);


// --- Định nghĩa kiểu dữ liệu ---
interface DropdownOption {
  id: string;
  name: string;
}

const sessionTypeOptions: DropdownOption[] = [
  { id: 'online', name: 'Học trực tuyến' },
  { id: 'hybrid', name: 'Học trực tuyến và trực tiếp' },
];

// === COMPONENT CHÍNH ===

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

// --- CÁC COMPONENT FORM HELPER ---

// Helper: FormSection
interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}
function FormSection({ title, children }: FormSectionProps) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-base font-semibold text-gray-800">
        <SectionIcon />
        {title}
      </label>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// Helper: FormInput (Dùng cho Môn học)
// interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
//   icon: React.ReactElement<React.SVGProps<SVGSVGElement>>;
// }
// function FormInput({ icon, ...props }: FormInputProps) {
//   return (
//     <div className="relative">
//       <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
//         {React.cloneElement(icon, { className: "h-5 w-5 text-gray-400" })}
//       </div>
//       <input
//         type="text"
//         className="w-full rounded-lg border border-gray-300 bg-gray-50 py-3 pl-12 pr-4 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
//         {...props}
//       />
//     </div>
//   );
// }

// Helper: FormTextArea
function FormTextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="w-full rounded-lg border border-gray-300 bg-gray-50 p-4 text-gray-900 shadow-custom-yellow focus:border-blue-500 focus:ring-blue-500"
      {...props}
    />
  );
}

// Helper: FormDropdown (Dropdown tùy chỉnh)
interface FormDropdownProps {
  icon: React.ReactElement<React.SVGProps<SVGSVGElement>>;
  options: DropdownOption[];
  selected: DropdownOption;
  onSelect: (option: DropdownOption) => void;
}
function FormDropdown({ icon, options, selected, onSelect }: FormDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="relative w-full rounded-lg border border-gray-300 bg-gray-50 py-3 pl-12 pr-10 text-left text-gray-900 shadow-custom-yellow focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          {React.cloneElement(icon, { className: "h-5 w-5 text-gray-400" })}
        </span>
        <span className="block truncate">{selected.name}</span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
          <ChevronDownIcon className={`size-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          <ul className="py-1">
            {options.map((option) => (
              <li
                key={option.id}
                className={`cursor-pointer px-4 py-2 text-gray-900 ${option.id === selected.id
                  ? 'bg-blue-700 text-white'
                  : 'hover:bg-blue-50'
                  }`}
                onClick={() => {
                  onSelect(option);
                  setIsOpen(false);
                }}
              >
                {option.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// [MỚI] Helper: Nút "Thêm"
function AddButton({ title, onClick }: { title: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 p-1 text-sm font-medium text-blue-700 hover:text-blue-800"
    >
      <PlusIcon className="size-4" />
      {title}
    </button>
  );
}
