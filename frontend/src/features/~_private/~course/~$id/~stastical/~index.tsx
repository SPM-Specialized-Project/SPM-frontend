// import {
//   ArrowLeftIcon,
//   ClockIcon,
//   UserCircleIcon
// } from '@heroicons/react/24/solid'
import {
  createFileRoute,
  useParams,
  // Link,
  useNavigate,
  Link
} from '@tanstack/react-router'
import React from 'react'

// Giả sử đường dẫn đến file mock data
import { courseDriver, type Course } from '@/components/data/~mock-courses'
// import { mockSessions } from '@/components/data/~mock-session'
import { ArrowLeft } from '@/components/icons'
import StudyLayout from '@/components/study-layout'
import { useJsonData } from '@/services/use-json-data'

/**
 * Định nghĩa route
 * (File này nên được đặt tại: 
 * src/routes/_private/course/$id/submissions/index.tsx)
 */
export const Route = createFileRoute('/_private/course/$id/stastical/')({
  component: RouteComponent,
})

// === COMPONENT CHÍNH CỦA TRANG ===
function RouteComponent() {
  // Lấy $id (courseId) từ URL
  const { id: courseId } = useParams({ from: Route.id });
  const navigate = useNavigate();
  const courses = useJsonData(courseDriver);

  // Lấy tất cả "lượt nộp bài" (mỗi thành viên trong mỗi session)
  const allSubmissions = React.useMemo(() => {
    // 1. Lọc các session thuộc khóa học này
    // const courseSessions = mockSessions.filter(
    //   (s) => s.courseId === courseId,
    // );
    const course = courses.find((c) => c.id === courseId) as Course;



    // 2. Biến đổi thành danh sách phẳng: 
    // [memberA-session1, memberB-session1, memberA-session2, ...]
    //   const submissions = courseSessions.flatMap((session) =>
    //     session.members.map((member) => ({
    //       id: `${session.id}-${member.id}`, // Tạo key duy nhất
    //       name: member.name,
    //       // Mock-session không có email, tạo email giả
    //       email: `${member.name.toLowerCase().replace(/\s/g, `.`)}@gmail.com`,
    //       timestamp: session.start, // Dùng thời gian bắt đầu session
    //     }))
    //   );

    //   return submissions;
    // }, [courseId]);

    // return (
    //   <StudyLayout>
    //     {/* 1. Header (chứa nút Quay lại) */}
    //     <header className="sticky top-0 z-20 bg-white p-4 shadow-sm">
    //       <Link 
    //         // Link về route cha
    //         to="/course/$id" 
    //         params={{ id: courseId }}
    //         className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
    //       >
    //         <ArrowLeftIcon className="mr-2 size-4" />
    //         Quay lại
    //       </Link>
    //     </header>

    //     {/* 2. Nội dung chính */}
    //     <main className="p-4 md:p-8">
    //       <h1 className="mb-8 text-3xl font-bold text-gray-900">
    //         Danh sách bài nộp
    //       </h1>

    //       {/* 3. Danh sách các item */}
    //       <div className="space-y-6">
    //         {allSubmissions.length > 0 ? (
    //           allSubmissions.map((submission) => (
    //             <SubmissionItem key={submission.id} submission={submission} courseId={courseId} />
    //           ))
    //         ) : (
    //           <p className="text-gray-600">Không có bài nộp nào cho khóa học này.</p>
    //         )}
    //       </div>
    //     </main>
    //   </StudyLayout>
    // )
    return (
      <StudyLayout>
        <div>
          {/* Back button */}
          <button
            onClick={() => navigate({ to: `/course/${courseId}` })}
            className="mb-6 flex items-center gap-2 text-[#3D4863] transition hover:text-blue-700"
          >
            <ArrowLeft className="size-5" />
            <span className="font-medium">Quay lại</span>
          </button>

          {/* Course header with background */}
          <div
            className="relative mb-8 rounded-lg p-8 text-white shadow-lg"
            style={{
              backgroundImage: `url(${course.bgImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              minHeight: '250px',
            }}
          >
            <div className="relative z-10">
              <p className="mb-2 text-sm font-medium text-gray-200">
                {course.code}
              </p>
              <h1 className="mb-3 text-4xl font-bold">{course.title}</h1>
              <p className="text-lg text-gray-100">
                Giảng viên: {course.instructor}
              </p>

              {/* Button "tổng quan" + "Đánh giá" */}
              <div className="mt-6 flex gap-4">
                <button className="rounded-lg bg-[#0329E9] px-4 py-2 font-medium backdrop-blur-sm transition hover:bg-[#0329E9]/80">
                  Tổng quan
                </button>
                <button
                  onClick={() => {
                    navigate({ to: `/course/${courseId}/rating` });
                  }}
                  className="rounded-lg bg-white px-4 py-2 font-medium text-[#0329E9] backdrop-blur-sm transition hover:bg-white/80"
                >
                  Đánh giá
                </button>
              </div>
            </div>
          </div>

          {/* Course statistics */}
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
            <div
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
            >
              <div className="mb-2 text-3xl font-bold text-[#0329E9]">
                {course.stats.documents}
              </div>
              <div className="text-sm font-medium text-gray-600">
                Tài liệu học tập
              </div>
            </div>
            <div
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
            >
              <div className="mb-2 text-3xl font-bold text-green-600">
                {course.stats.links}
              </div>
              <div className="text-sm font-medium text-gray-600">
                Đường dẫn tham khảo
              </div>
            </div>
            <div
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
            >
              <div className="mb-2 text-3xl font-bold text-orange-600">
                {course.stats.assignments}
              </div>
              <div className="text-sm font-medium text-gray-600">
                Bài tập được giao
              </div>
            </div>
            <div
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
            >
              <div className="mb-2 text-3xl font-bold text-purple-600">
                {course.sessionsOrganized}
              </div>
              <div className="text-sm font-medium text-gray-600">
                Buổi học đã tổ chức
              </div>
            </div>
          </div>

          {/* Course content sections */}
          <div className="space-y-6">
            <div
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
            >
              <h2 className="mb-4 text-2xl font-bold text-gray-800">
                Thông tin khóa học
              </h2>
              <div className="space-y-3 text-gray-600">
                <p>
                  <span className="font-semibold">Mã khóa học:</span>{' '}
                  {course.code}
                </p>
                <p>
                  <span className="font-semibold">Tên khóa học:</span>{' '}
                  {course.title}
                </p>
                <p>
                  <span className="font-semibold">Giảng viên:</span>{' '}
                  {course.instructor}
                </p>
              </div>
            </div>

            <div
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
            >
              <h2 className="mb-4 text-2xl font-bold text-gray-800">
                Mô tả khóa học
              </h2>
              <p className="text-gray-600">
                Đây là khóa học {course.title}. Khóa học cung cấp kiến thức nền
                tảng và thực hành về lĩnh vực này. Sinh viên sẽ được học tập qua
                các tài liệu, bài giảng và bài tập thực hành.
              </p>
            </div>

            <div
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
            >
              <h2 className="mb-4 text-2xl font-bold text-gray-800">
                Tài liệu học tập
              </h2>
              <div className="text-gray-600">
                <p className="mb-2">
                  Có{' '}
                  <span className="font-semibold">
                    {course.stats.documents}
                  </span>{' '}
                  tài liệu có sẵn trong khóa học này.
                </p>
                <p className="text-sm text-gray-500">
                  Tài liệu sẽ được cập nhật trong các phiên bản tương lai.
                </p>
              </div>
            </div>

            <div
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
            >
              <h2 className="mb-4 text-2xl font-bold text-gray-800">
                Danh sách học viên
              </h2>
              <div className="text-gray-600">
                <p className="mb-4">
                  Tổng số học viên:{' '}
                  <span className="font-semibold">
                    {course.students.length}
                  </span>
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          STT
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Họ và tên
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Email
                        </th>
                        <th>
                          Số bài nộp
                        </th>
                        <th>
                          Số buổi tham gia
                        </th>
                        <th>
                          Điểm trung bình
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {course.students.map((student, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                            {index + 1}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                            <Link to={`/profile/$id` as string} className="text-sm font-medium text-gray-800">
                              {student.name}
                            </Link>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                            {student.email}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-gray-900">
                            {student.numberOfSubmissions ?? 0} / {course.stats.assignments}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-gray-900">
                            {student.numberOfJoinedSessions ?? 0} / {course.numberTotalSessions ?? 0}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-gray-900">
                            {student.averageScore ?? 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </StudyLayout>
    );
  }, [courseId, courses, navigate]);

  return allSubmissions;
}

// === COMPONENT CON: THANH NGANG (ITEM) ===

// Định nghĩa kiểu dữ liệu cho props
// interface Submission {
//   id: string;
//   name: string;
//   email: string;
//   timestamp: string;
// }

// function SubmissionItem({ submission, courseId }: { submission: Submission; courseId: string }) {
//   // Format thời gian
//   const formattedTimestamp = new Date(submission.timestamp).toLocaleString('vi-VN', {
//     hour: '2-digit',
//     minute: '2-digit',
//     day: '2-digit',
//     month: '2-digit',
//     year: 'numeric',
//   });

//   return (
//     // Card item với viền vàng
//     <div className="rounded-lg border border-gray-600 bg-white p-5 shadow-custom-yellow">
//       {/* Hàng trên: Thông tin user và (chỗ trống của điểm) */}
//       <div className="flex items-start justify-between">
//         {/* Bên trái: Avatar + Tên + Email */}
//         <div className="flex items-center">
//           <UserCircleIcon className="size-12 text-gray-400" />
//           <div className="ml-3">
//             <h2 className="text-lg font-bold text-gray-900">{submission.name}</h2>
//             <p className="text-sm text-gray-500">{submission.email}</p>
//           </div>
//         </div>

//         {/* Bên phải: Bỏ trống (theo yêu cầu "bỏ số điểm đi") */}
//         <div>
//           {/* Bỏ trống */}
//         </div>
//       </div>
//       {/* Hàng dưới: Timestamp và Nút bấm */}
//       <div className="mt-4 flex items-center justify-between">
//         {/* Bên trái: Timestamp */}
//         <div className="flex items-center text-sm text-gray-600">
//           <ClockIcon className="mr-1.5 size-5 text-gray-500" />
//           <span>{formattedTimestamp}</span>
//         </div>

//         {/* Bên phải: Nút "Xem bài nộp" */}
//         <Link
//           to="/course/$id/submissions"
//           params={{ id: courseId }}
//           className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
//         >
//           Xem bài nộp
//         </Link>
//       </div>
//     </div>
//   )
// }
