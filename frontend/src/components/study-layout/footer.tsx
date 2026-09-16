import React from 'react';

// SỬA: Import logo giống như cách bạn làm trong SidebarDesktop.tsx
import BachKhoaLogo from '../../assets/bachkhoa.png'; 

const Footer: React.FC = () => {
  return (
    // Container chính với màu nền xanh tùy chỉnh khớp với hình ảnh
    <footer className="bg-[#0033cc] text-white">
      {/* Container bên trong để căn giữa nội dung và thêm padding */}
      <div className="container mx-auto flex items-center px-6 py-8">
        
        {/* Phần Logo */}
        <div className="shrink-0">
          {/* SỬA: Sử dụng biến logo đã import */}
          <img 
            src={BachKhoaLogo} 
            alt="BK TPHCM Logo" 
            className="h-16 w-auto" // Điều chỉnh chiều cao (h-16 = 64px) nếu cần
          />
        </div>

        {/* Phần Thông tin liên hệ */}
        <div className="ml-6 md:ml-8">
          {/* Tiêu đề màu vàng/cam */}
          <h3 className="text-lg font-bold text-amber-500">
            Thông tin liên hệ
          </h3>
          
          {/* Các dòng thông tin */}
          <p className="mt-2 text-sm md:text-base">
            SĐT: 0123456789
          </p>
          <p className="mt-1 text-sm md:text-base">
            Email: john.doe@hcmut.edu.vn
          </p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;