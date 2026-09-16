import type { SVGProps } from 'react';

export const SectionIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M15.8333 2.5H4.16667C3.24167 2.5 2.5 3.25 2.5 4.16667V15.8333C2.5 16.75 3.24167 17.5 4.16667 17.5H15.8333C16.75 17.5 17.5 16.75 17.5 15.8333V4.16667C17.5 3.25 16.75 2.5 15.8333 2.5ZM14.1667 10.8333H10.8333V14.1667H9.16667V10.8333H5.83333V9.16667H9.16667V5.83333H10.8333V9.16667H14.1667V10.8333Z" fill="#3D4863" />
  </svg>
);

// SVG cho Ngôn ngữ
export const LanguageIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g clipPath="url(#clip0_1075_2849_lang)"><path d="M4 5H11" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 3V5C9 9.418 6.761 13 4 13" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 9C4.997 11.144 7.952 12.908 11.7 13" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 20L16 11L20 20" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M19.0984 18H12.8984" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></g>
    <defs><clipPath id="clip0_1075_2849_lang"><rect width="24" height="24" fill="white" /></clipPath></defs>
  </svg>
);

// [SỬA] SVG cho Loại hình (dùng SVG Địa điểm, khớp với hình ảnh mới)
export const SessionTypeIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g clipPath="url(#clip0_1075_2875_type)"><path d="M4 21V14" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 10V3" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 21V12" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 8V3" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M20 21V16" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M20 12V3" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M1 14H7" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 8H15" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M17 16H23" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></g>
    <defs><clipPath id="clip0_1075_2875_type"><rect width="24" height="24" fill="white" /></clipPath></defs>
  </svg>
);

// SVG cho Địa điểm
export const LocationIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g clipPath="url(#clip0_1075_2875_loc)"><path d="M4 21V14" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 10V3" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 21V12" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 8V3" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M20 21V16" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M20 12V3" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M1 14H7" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 8H15" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M17 16H23" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></g>
    <defs><clipPath id="clip0_1075_2875_loc"><rect width="24" height="24" fill="white" /></clipPath></defs>
  </svg>
);

// SVG cho nút Hẹn giờ (màu trắng)
export const ClockIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M13.9987 25.6663C20.442 25.6663 25.6654 20.443 25.6654 13.9997C25.6654 7.55635 20.442 2.33301 13.9987 2.33301C7.55538 2.33301 2.33203 7.55635 2.33203 13.9997C2.33203 20.443 7.55538 25.6663 13.9987 25.6663Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 7V14L18.6667 16.3333" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// SVG cho nút History (màu trắng)
export const HistoryIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M14 23.3333C19.155 23.3333 23.3333 19.155 23.3333 14C23.3333 8.845 19.155 4.66667 14 4.66667C8.845 4.66667 4.66667 8.845 4.66667 14C4.66667 19.155 8.845 23.3333 14 23.3333Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 9.33334V14H18.6667" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2.33333 14H4.66667" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 7L8.86667 8.86667" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);




