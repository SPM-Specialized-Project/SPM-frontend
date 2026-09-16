import type { SVGProps } from "react";

// --- BIẾN ĐỔI SVG THÀNH COMPONENT ---
// (Tái sử dụng các SVG bạn đã cung cấp)

// SVG cho icon đầu mỗi danh mục
export const SectionIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M15.8333 2.5H4.16667C3.24167 2.5 2.5 3.25 2.5 4.16667V15.8333C2.5 16.75 3.24167 17.5 4.16667 17.5H15.8333C16.75 17.5 17.5 16.75 17.5 15.8333V4.16667C17.5 3.25 16.75 2.5 15.8333 2.5ZM14.1667 10.8333H10.8333V14.1667H9.16667V10.8333H5.83333V9.16667H9.16667V5.83333H10.8333V9.16667H14.1667V10.8333Z" fill="#3D4863" />
  </svg>
);

// SVG cho Môn học
export const SubjectIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg width="33" height="28" viewBox="0 0 33 28" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M19.0201 19.318H5.43359V21.5907H19.0201V19.318ZM27.1721 10.2271H5.43359V12.4998H27.1721V10.2271ZM5.43359 17.0453H27.1721V14.7726H5.43359V17.0453ZM5.43359 5.68164V7.95437H27.1721V5.68164H5.43359Z" fill="#A3ACC2" />
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


