import { ChevronDownIcon, PlusIcon } from '@heroicons/react/24/solid';
import React, { useEffect, useRef, useState } from 'react';

import { SectionIcon } from './coordinator-icons';

export interface DropdownOption {
  id: string;
  name: string;
}

// --- CÁC COMPONENT FORM HELPER ---

// Helper: FormSection
interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}
export function FormSection({ title, children }: FormSectionProps) {
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
export function FormTextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
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
export function FormDropdown({ icon, options, selected, onSelect }: FormDropdownProps) {
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
export function AddButton({ title, onClick }: { title: string; onClick?: () => void }) {
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
