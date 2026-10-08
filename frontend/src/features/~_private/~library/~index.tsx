import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import StudyLayout from '@/components/study-layout'

export const Route = createFileRoute('/_private/library/')({
  beforeLoad: async () => {
    document.title = 'Library - Code Pulse';
  },
  component: RouteComponent,
})

// SVG cho các góc
function CornerWave({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 954 226"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none" 
    >
      <mask
        id="mask0_1081_580"
        style={{ maskType: 'alpha' }}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="954"
        height="226"
      >
        <rect width="954" height="225.581" rx="8" fill="#0329E9" />
      </mask>
      <g mask="url(#mask0_1081_580)">
        <g filter="url(#filter0_i_1081_580)">
          <path
            d="M0 22.5586V225.582H874.5C874.5 225.582 546.562 216.028 437.25 124.07C327.938 32.1126 0 22.5586 0 22.5586Z"
            fill="#F9BA08" // Màu vàng
          />
        </g>
        <g filter="url(#filter1_i_1081_580)">
          <path
            d="M0 22.5586V225.582H636C636 225.582 397.5 216.028 318 124.07C238.5 32.1126 0 22.5586 0 22.5586Z"
            fill="#0329E9" // Màu xanh
          />
        </g>
      </g>
      <defs>
        <filter
          id="filter0_i_1081_580"
          x="0"
          y="22.5586"
          width="874.5"
          height="207.023"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="4" />
          <feGaussianBlur stdDeviation="2" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow_1081_580" />
        </filter>
        <filter
          id="filter1_i_1081_580"
          x="0"
          y="22.5586"
          width="636"
          height="207.023"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="4" />
          <feGaussianBlur stdDeviation="2" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow_1081_580" />
        </filter>
      </defs>
    </svg>
  )
}

function RouteComponent() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!searchQuery.trim()) {
      return
    }

    navigate({
      to: '/library/$query',
      params: { query: searchQuery.trim() },
    })
  }

  return (
    <StudyLayout>
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
        {/* Góc trên bên phải */}
        <CornerWave
          className="absolute right-0 top-0 h-auto w-96 -scale-100 md:w-[900px] lg:w-[1100px]"
        />
        {/* Góc dưới bên trái */}
        <CornerWave
          className="absolute bottom-0 left-0 h-auto w-96 md:w-[900px] lg:w-[1100px]"
        />
        
        <div className="relative z-10 mt-48 flex grow flex-col">
          {/* Header Logo
          <header className="p-6 md:p-8">
            <div className="flex items-center space-x-3">
              <img src="bachkhoa.png" alt="Logo BK" className="h-10" />
              <span className="text-xl font-bold text-[#0329E9]">
                Code Pulse
              </span>
            </div>
          </header> */}

          {/* Phần tìm kiếm */}
          <main className="flex grow flex-col items-center px-4">
            <div className="mt-8 w-full max-w-4xl">
              <h1 className="mb-8 text-center text-4xl font-bold text-black md:text-5xl">
                HCMUT LIBRARY
              </h1>
              
              <form onSubmit={handleSearch} className="relative mb-8">
                <input
                  type="text"
                  placeholder="Nhập tên sách để tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-5 py-4 pr-12 text-base shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button aria-label='submission' type="submit" className="absolute right-5 top-1/2 -translate-y-1/2">
                  <svg
                    className="size-6 text-gray-400 hover:text-blue-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                    />
                  </svg>
                </button>
              </form>

              {/* Empty state */}
              <div className="py-12 text-center text-gray-500">
                <svg
                  className="mx-auto mb-4 size-16 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                <p className="text-lg">Nhập từ khóa để bắt đầu tìm kiếm sách trong thư viện</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </StudyLayout>
  )
}