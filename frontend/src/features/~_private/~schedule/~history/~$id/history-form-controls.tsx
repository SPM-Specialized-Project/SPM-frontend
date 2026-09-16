import { ChevronDownIcon } from '@heroicons/react/24/outline';
import type { SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

type FormSelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; id: string };
type FormTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; id: string; labelClassName?: string };

export function FormSelect({ label, id, children, ...props }: FormSelectProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <select id={id} {...props} className="w-full cursor-not-allowed appearance-none rounded-md border border-gray-300 bg-gray-100 px-3 py-2 pr-10 text-gray-500 shadow-sm">
          {children}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-2.5 size-5 text-gray-400" />
      </div>
    </div>
  );
}

export function FormTextarea({ label, id, labelClassName = 'text-gray-700', ...props }: FormTextareaProps) {
  return (
    <div>
      <label htmlFor={id} className={`mb-2 block text-sm font-medium ${labelClassName}`}>{label}</label>
      <textarea id={id} {...props} className="w-full cursor-not-allowed rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-500 shadow-sm" />
    </div>
  );
}
