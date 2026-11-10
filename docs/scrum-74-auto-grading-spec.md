# SCRUM-74 — Auto Grading & Test Feedback

> Tài liệu tổng hợp đặc tả, phân tích và checklist chốt implementation cho
> `[US-008.2] Auto Grading & Test Feedback`.
>
> Nguồn đối chiếu: Jira SCRUM-74 và các work item liên kết, đọc lại ngày
> 09/11/2026. Tài liệu này phục vụ triển khai và kiểm thử local; không phải bằng
> chứng rằng trạng thái các issue trên Jira đã được cập nhật.

## 1. Thông tin work item

| Thuộc tính | Giá trị |
| --- | --- |
| Jira key | SCRUM-74 |
| Tên | `[US-008.2] Auto Grading & Test Feedback` |
| Loại | Story |
| Trạng thái | In Progress |
| Epic | SCRUM-11 — EPIC-04 Isolated Execution & Grading Engine |
| Sprint | SCRUM Sprint 4 |
| Sprint window | 06/11/2026–18/11/2026 |
| Start date | 09/11/2026 |
| Priority | Medium |
| Story point estimate | 8 |
| Original estimate | 4 ngày |
| Assignee | ANH HOÀNG ĐỨC HIẾU |
| Reporter | minhquanvoh |
| Tiến độ child work | 0% Done tại thời điểm đối chiếu |
| Jira | <https://hcmut1.atlassian.net/browse/SCRUM-74> |

## 2. User story

Với vai trò **Student** hoặc **Lecturer**, người dùng muốn hệ thống tự động đánh
giá submission bằng toàn bộ public và hidden test cases. Sau khi grading hoàn
tất, sinh viên phải nhận được ngay:

- điểm thực tế được tính từ các test đã pass và fail;
- partial credit mà không cần pass 100% test cases;
- feedback chi tiết đối với public tests;
- thống kê được phép công bố đối với hidden tests, không làm lộ dữ liệu nhạy cảm.

## 3. Bối cảnh và mục tiêu

Sau khi submission được tạo, hệ thống chấm bài bằng toàn bộ test suite thuộc
`AssignmentVersion` đã được ghim vào submission. Mỗi test case được thực thi độc
lập và điểm đạt được là tổng trọng số của các test case đã pass.

Story này thay thế mô hình all-or-nothing bằng proportional scoring:

- không cần pass 100% mới được ghi nhận tiến độ hoặc điểm;
- điểm hiển thị phải phản ánh chính xác kết quả của lần grading cụ thể;
- public tests cung cấp feedback chi tiết;
- hidden tests chỉ cung cấp số liệu tổng hợp cho student;
- lecturer được phép xem full grading breakdown, bao gồm hidden diagnostics.

Mục tiêu sản phẩm là cho feedback nhanh và minh bạch nhưng vẫn bảo vệ tính toàn
vẹn học thuật.

## 4. Phạm vi

### 4.1. Trong phạm vi

1. Pipeline grading worker tự động chạy public và hidden test cases.
2. Tính earned score động theo trọng số test case, có thể biểu diễn bằng điểm
   hoặc phần trăm.
3. Ghi nhận verdict từng test case:
   - Passed;
   - Wrong Answer;
   - Compile Error;
   - Runtime Error;
   - Time Limit Exceeded (TLE);
   - Memory Limit Exceeded (MLE).
4. Hiển thị exact earned score ngay sau khi grading hoàn tất.
5. Hỗ trợ partial credit đầy đủ.
6. Public-test feedback gồm input, expected output, actual output và status.
7. Hidden-test feedback cho student chỉ gồm:
   - số test pass;
   - tổng số hidden tests;
   - phần điểm đạt được từ hidden tests.
8. Lưu grading result bằng `Judgment` và `TestResult`.

### 4.2. Ngoài phạm vi

- Không áp dụng rào cản phải pass 100% mới hiển thị tiến độ hoặc điểm.
- Không hỗ trợ manual grading override trong story này.
- Không chấm điểm chủ quan về code style trong story này.

## 5. Vai trò và quyền xem dữ liệu

| Vai trò | Quyền và trách nhiệm |
| --- | --- |
| Student | Xem submission của chính mình, grading status, exact score, public-test feedback và pass ratio được phép công bố. |
| Lecturer | Xem full grading breakdown, bao gồm hidden-test diagnostics. |
| System | Tự động xếp hàng, thực thi grading, tính điểm, lưu Judgment/TestResult và công bố DTO đúng quyền. |

### 5.1. Student response contract

Student có thể nhận:

- trạng thái grading;
- exact earned score khi có kết quả hợp lệ;
- tổng số test pass/fail được phép công bố;
- chi tiết từng public test;
- hidden aggregate: `passedCount`, `totalCount`, `earnedWeight` và `maxWeight`.

Student tuyệt đối không được nhận:

- hidden input;
- hidden expected output;
- hidden actual output nếu có thể tiết lộ test;
- raw stdout/stderr của hidden execution;
- raw traceback hoặc stack trace;
- command, environment hoặc runner diagnostic có chứa hidden data;
- full hidden `TestResult` dưới bất kỳ field lồng nhau nào.

Việc bảo vệ phải thực hiện ở backend serialization/DTO layer. Chỉ ẩn component
trên frontend không đáp ứng AC-08d vì dữ liệu vẫn có thể bị đọc trong Network
tab.

### 5.2. Lecturer response contract

Lecturer có thể xem full test breakdown, bao gồm hidden diagnostics, nhưng API
vẫn phải áp dụng authorization theo classroom/lab thay vì chỉ dựa vào việc biết
submission ID.

## 6. Business rules bắt buộc

### BR-01 — Proportional scoring

Điểm phải được tính từ tổng trọng số test đã pass:

```text
earnedWeight = sum(weight của test đã pass)
maxWeight    = sum(weight của toàn bộ test trong pinned AssignmentVersion)
scoreRatio   = earnedWeight / maxWeight
score        = scoreRatio × maximumScore
```

Nếu thang điểm là 100 và 3/5 test có trọng số bằng nhau pass, điểm phải là 60.

### BR-02 — Attempt-specific result

Điểm và verdict phải phản ánh đúng test cases đã pass/fail trong chính grading
attempt đó. Không được trộn `TestResult` giữa nhiều attempts.

### BR-03 — Immutable version

Grading phải dùng `AssignmentVersion` đã pin trong submission. Không được lấy
test suite từ current/latest assignment version tại thời điểm worker chạy.

### BR-04 — Hidden-test secrecy

Hidden input, expected output và raw traceback không bao giờ được công bố cho
student. Quy tắc này áp dụng cả success payload, error payload, logs trả về API
và lịch sử grading.

### BR-05 — Infrastructure error

Lỗi hạ tầng phải tạo `Internal Error`, không phải lỗi bài làm:

- không gán score 0;
- score nên là `null` vì không có valid grading result;
- không xác nhận bài toán đã được giải;
- không gây student penalty;
- có thể retry theo retry policy.

### BR-06 — Independent execution

Các test case phải được đánh giá độc lập, trừ khi compilation thất bại. Một
Wrong Answer, Runtime Error, TLE hoặc MLE của một test không được ngăn các test
còn lại chạy.

### BR-07 — Compile once

Với ngôn ngữ cần compile, source nên được compile một lần cho mỗi attempt. Nếu
compile thất bại, không cần chạy test case; đây là valid student result và không
phải infrastructure retry.

## 7. Mô hình trạng thái đề xuất

```text
Submission accepted
        |
        v
     PENDING
        |
        v
     JUDGING --------------------+
        |                         |
        | valid grading           | infrastructure failure
        v                         v
    COMPLETED               INTERNAL_ERROR
                                  |
                                  | retryable và còn attempt
                                  v
                               PENDING
```

Nguyên tắc:

- `PENDING`: job đã enqueue nhưng chưa được worker claim.
- `JUDGING`: worker đã claim và đang compile/run tests.
- `COMPLETED`: có valid result, kể cả score 0 do bài làm fail toàn bộ test.
- `INTERNAL_ERROR`: không có valid score; `score = null`.
- WA, CE, RE, TLE và MLE không phải lý do tự động retry.

Tên trạng thái public API và frontend phải thống nhất. Nếu queue nội bộ dùng
`QUEUED`/`RUNNING` thì cần mapping rõ sang contract công khai.

## 8. Mô hình dữ liệu tối thiểu

### 8.1. GradingJob

```text
id
submissionId
assignmentVersionId
status
attempts
maxAttempts
currentJudgmentId
availableAt
claimedAt
leaseExpiresAt
workerId
lastError
createdAt
updatedAt
```

Queue phải idempotent theo submission hoặc một idempotency key xác định. Việc
gửi lại request không được tạo nhiều grading jobs cho cùng immutable submission.

### 8.2. Judgment

```text
id
jobId
submissionId
assignmentVersionId
attempt
status
verdict
earnedWeight
maxWeight
score
passedCount
failedCount
totalCount
hiddenSummary
internalError
createdAt
startedAt
completedAt
testResults[]
```

### 8.3. TestResult

```text
id
judgmentId
testCaseId
hidden
weight
earnedWeight
verdict
passed
input
expectedOutput
actualOutput
stdout
stderr
executionTimeMs
memoryBytes
```

Các field nhạy cảm có thể được lưu cho lecturer/audit nhưng không được serialize
vào student DTO khi `hidden = true`.

## 9. Verdict semantics

| Verdict | Ý nghĩa | Có valid score? | Retry tự động? |
| --- | --- | --- | --- |
| Passed | Output đúng và execution hợp lệ | Có | Không |
| Wrong Answer | Execution thành công nhưng output không khớp | Có | Không |
| Compile Error | Source không compile được | Có, thường 0 | Không |
| Runtime Error | Process bài làm lỗi khi chạy test | Có | Không |
| TLE | Vượt time limit của test | Có | Không |
| MLE | Vượt memory limit của test | Có | Không |
| Internal Error | Queue/worker/sandbox/runner gặp lỗi hạ tầng | Không, score `null` | Có thể |

Nếu hệ thống có `OUTPUT_LIMIT_EXCEEDED`, cần thống nhất đây là verdict được hỗ
trợ thêm và đảm bảo frontend/API cùng hiểu nó.

## 10. Acceptance Criteria

### AC-08b — Grading status và kết quả được phép công bố

Student xem được, cho từng submission:

- grading status;
- calculated score;
- số test pass/fail được phép công bố.

### AC-08c — Exact partial score

Sau khi grading hoàn tất, submission hiển thị ngay exact earned score được tính
từ các test đã pass. Không có ngưỡng 100% để được nhận điểm.

### AC-08d — Hidden-test protection

Raw input/output/log của hidden tests phải bị che khỏi student. Kiểm tra phải
thực hiện trên payload mạng thực tế, không chỉ trên màn hình.

### AC-08e — Infrastructure failure

Infrastructure error phải biểu thị không có valid grading result. Hệ thống không
được tự gán điểm 0 và không được xác nhận bài đã giải quyết thành công.

## 11. Test scenarios từ Jira

### 11.1. Score calculation và partial credit

- Pass 3/5 test có trọng số bằng nhau → 60% hoặc số điểm tương đương.
- Fail toàn bộ tests → 0 điểm, với điều kiện đây là valid student result.
- Pass toàn bộ tests → full marks 100%.
- Partial credit xuất hiện ngay khi grading hoàn tất, không cần pass toàn bộ.

### 11.2. Security và data masking

- Student API payload không chứa hidden input hoặc hidden expected output.
- Student kiểm tra network response vẫn không tìm thấy hidden secrets.

## 12. Bộ test đầy đủ cần có trước khi chốt

### 12.1. Backend unit tests

- weighted score với trọng số bằng nhau và không bằng nhau;
- all pass, all fail và partial pass;
- score rounding theo rule đã chốt;
- zero/invalid total weight được validate;
- independent execution sau WA/RE/TLE/MLE;
- compile error dừng toàn bộ tests;
- infrastructure error tạo `score = null`;
- student DTO chỉ có public details và hidden aggregate;
- lecturer DTO có full breakdown;
- retry chỉ cho retryable infrastructure errors;
- retry tạo attempt/Judgment mới nhưng không tạo duplicate ngoài ý muốn;
- duplicate enqueue/delivery có tính idempotent.

### 12.2. Backend API/E2E tests

- submission enqueue grading và chuyển trạng thái đúng;
- polling nhận kết quả cuối cùng;
- RBAC student/lecturer;
- student không đọc được submission người khác;
- payload JSON đệ quy không chứa các secret marker của hidden tests;
- error response, judgment history và retry history cũng không chứa secret;
- worker restart/crash không biến thành score 0;
- pinned AssignmentVersion vẫn được dùng sau khi lecturer publish version mới.

### 12.3. Frontend tests

- hiển thị pending/judging state;
- polling dừng khi completed hoặc terminal internal error;
- exact score và pass ratio;
- public-test input/expected/actual/verdict;
- hidden aggregate không có nút/modal làm lộ chi tiết;
- internal error hiển thị trạng thái chưa có kết quả hợp lệ, không hiển thị 0;
- retry state không làm mất hoặc trộn attempt history;
- responsive/mobile states và accessibility labels.

## 13. Subtasks của SCRUM-74

Tại thời điểm đối chiếu, 13 subtasks đều có priority `Highest`, assignee
`ANH HOÀNG ĐỨC HIẾU`, status `New`. Jira hiển thị tên work item nhưng các
subtask backend đã mở kiểm tra không có mô tả chi tiết riêng; phần “Expected
implementation” dưới đây là diễn giải kỹ thuật từ parent spec, không phải nội
dung bổ sung đã được ghi trên Jira.

| Jira | Subtask | Expected implementation / Definition of Done |
| --- | --- | --- |
| SCRUM-170 | `[BE] Grading queue` | Persistent/idempotent enqueue; job state; duplicate protection; claim/lease semantics nếu có concurrency. |
| SCRUM-171 | `[BE] Grading worker` | Claim job, load immutable source/version, compile, chạy từng test độc lập, persist result và recover crash. |
| SCRUM-172 | `[BE] Judgment` | Judgment/TestResult schema, attempt history, timestamps, score và hidden summary. |
| SCRUM-173 | `[BE] Verdict` | Mapping runner outcomes sang verdict chuẩn và aggregate final verdict nhất quán. |
| SCRUM-174 | `[BE] Retry` | Retry có giới hạn/backoff cho infrastructure error; không retry student failures; không duplicate result. |
| SCRUM-175 | `[FE] Grading status` | Polling/realtime status; pending/judging/completed/internal-error UI; dừng polling đúng lúc. |
| SCRUM-176 | `[FE] Result display` | Exact score, public details, hidden aggregate và lecturer breakdown theo quyền. |
| SCRUM-177 | `[TEST] Accepted` | All tests pass, full score, counts và verdict chính xác. |
| SCRUM-178 | `[TEST] Wrong Answer` | Partial/all WA, weighted partial score, tiếp tục chạy test khác, không retry. |
| SCRUM-179 | `[TEST] Compile Error` | Compile failure dừng test execution, valid zero result, không infrastructure retry. |
| SCRUM-180 | `[TEST] Internal Error` | Score null, không student penalty, terminal/retry behavior đúng. |
| SCRUM-181 | `[TEST] Retry` | Bounded retry, backoff, attempt history và idempotency. |
| SCRUM-182 | `[TEST] Hidden test security` | Quét actual API/network payload, error/log/history để bảo đảm zero hidden secrets. |

## 14. Work item liên kết

| Jira | Tên | Quan hệ | Trạng thái | Priority | Assignee |
| --- | --- | --- | --- | --- | --- |
| SCRUM-322 | Test Auto Grading and Hidden-Test Data Protection | relates to | New | Medium | Nguyễn Minh Khôi |

SCRUM-322 nên được dùng như lớp kiểm thử chấp nhận/E2E độc lập, tập trung vào:

- proportional score;
- full-score/all-fail cases;
- public feedback;
- hidden-test data protection trên actual HTTP payload;
- network inspection;
- internal error không bị tính 0;
- RBAC giữa student và lecturer.

## 15. Dependencies

1. **US-08.1 — Immutable Submission**
   - source và `AssignmentVersion` phải được cố định tại lúc submit;
   - retry grading không được thay đổi input của attempt.
2. **US-03.2 — Test Case & Version Control**
   - grading cần đọc test suite đúng version;
   - test weight và visibility phải ổn định trong version.
3. **Judgment và TestResult persistence**
   - phải lưu đủ dữ liệu cho score, feedback, history và audit.
4. **Isolated execution/sandbox**
   - runner cần trả status, output, time/memory và phân biệt student failure với
     infrastructure failure.

## 16. Kiến trúc implementation đề xuất

```text
Immutable Submission
        |
        v
Idempotent Grading Queue
        |
        v
Worker claim + lease
        |
        v
Load pinned AssignmentVersion
        |
        v
Compile once (nếu cần)
        |
        v
Run public + hidden tests independently
        |
        v
Persist TestResults
        |
        v
Compute weighted Judgment
        |
        +--------------------+
        |                    |
        v                    v
Student DTO             Lecturer DTO
public details          full breakdown
hidden aggregate        hidden diagnostics
```

## 17. API contract đề xuất

### 17.1. Submission/grading status

```json
{
  "submissionId": "submission-id",
  "status": "PENDING | JUDGING | COMPLETED | INTERNAL_ERROR",
  "latestJudgmentId": "judgment-id-or-null"
}
```

### 17.2. Student judgment

```json
{
  "id": "judgment-id",
  "status": "COMPLETED",
  "verdict": "PARTIAL",
  "score": 60,
  "earnedWeight": 3,
  "maxWeight": 5,
  "passedCount": 3,
  "failedCount": 2,
  "totalCount": 5,
  "publicTests": [
    {
      "testCaseId": "public-1",
      "verdict": "PASSED",
      "input": "...",
      "expectedOutput": "...",
      "actualOutput": "..."
    }
  ],
  "hiddenTests": {
    "passedCount": 1,
    "totalCount": 2,
    "earnedWeight": 1,
    "maxWeight": 2
  }
}
```

Student contract không được thêm hidden test IDs nếu ID có thể mang thông tin
nhạy cảm, và không được có `testResults` chứa hidden records.

### 17.3. Internal error judgment/status

```json
{
  "status": "INTERNAL_ERROR",
  "score": null,
  "message": "Grading infrastructure is temporarily unavailable."
}
```

Thông báo cho student phải được sanitize; chi tiết kỹ thuật chỉ nên xuất hiện
trong server logs hoặc lecturer/admin diagnostic phù hợp quyền.

## 18. Các quyết định còn phải chốt

Những điểm dưới đây không được Jira quy định đủ chi tiết và cần thống nhất trước
khi coi implementation là hoàn tất:

1. Thang điểm: 0–100, 0–10 hay `maximumScore` của assignment.
2. Quy tắc làm tròn và số chữ số thập phân.
3. Hành vi khi tổng weight bằng 0 hoặc có weight âm/không hợp lệ.
4. Final aggregate verdict khi chỉ một phần tests pass.
5. Có công bố tổng số hidden tests hay chỉ tổng số tests được phép công bố.
6. Student có được xem runtime/memory của public tests hay không.
7. Số lần retry tối đa, backoff và lỗi nào được xem là retryable.
8. Job lease/timeout và crash recovery khi worker chết giữa attempt.
9. Queue local JSON chỉ là prototype hay phải đạt multi-process durability.
10. Retention policy cho source, logs, Judgment và TestResult.
11. Lecturer có được xem raw hidden traceback hay cần sanitize một phần.
12. Polling interval, timeout và UX khi grading kéo dài.
13. Quy tắc chọn latest judgment khi retry attempt đang chạy hoặc thất bại.
14. Có hỗ trợ manual retry endpoint hay chỉ automatic retry.

## 19. Rủi ro implementation

### 19.1. Queue durability và concurrency

Queue dạng JSON/in-process phù hợp demo local nhưng có thể mất job hoặc xử lý
trùng khi process restart/nhiều worker cùng chạy. Nếu phạm vi chỉ local prototype
thì cần ghi rõ giới hạn này; nếu production-like thì cần atomic claim và lease.

### 19.2. Hidden-data leakage

Rủi ro lớn nhất không chỉ nằm ở `input` và `expectedOutput`. Secret còn có thể
lọt qua:

- stdout/stderr;
- exception message;
- raw traceback;
- runner command;
- debug metadata;
- cached frontend state;
- grading history hoặc retry response.

### 19.3. Incorrect retry classification

Retry WA/CE/RE/TLE/MLE làm tốn tài nguyên và có thể tạo điểm không nhất quán.
Ngược lại, biến runner crash thành student failure sẽ vi phạm AC-08e.

### 19.4. Version drift

Nếu worker đọc latest assignment thay vì pinned version, cùng một immutable
submission có thể nhận điểm khác nhau giữa các lần retry.

### 19.5. Score inconsistency

Backend, frontend và report có thể hiển thị khác nhau nếu mỗi nơi tự làm tròn
hoặc tự tính lại score. Backend nên là nguồn sự thật và trả exact calculated
score.

## 20. Definition of Done tổng thể

SCRUM-74 chỉ nên được xem là hoàn tất khi:

- [ ] Submission tự động được enqueue sau khi được chấp nhận.
- [ ] Queue không tạo duplicate grading cho cùng immutable submission.
- [ ] Worker dùng đúng pinned AssignmentVersion.
- [ ] Public và hidden tests được chạy theo đúng rule độc lập.
- [ ] Compile error được xử lý đúng và không retry.
- [ ] Judgment/TestResult được lưu đầy đủ theo từng attempt.
- [ ] Weighted partial score chính xác cho all-pass, all-fail và partial-pass.
- [ ] Student UI hiển thị status, exact score và public feedback.
- [ ] Student chỉ nhận hidden aggregate.
- [ ] Lecturer nhận full breakdown theo authorization.
- [ ] Actual student HTTP payload không chứa hidden secrets.
- [ ] Infrastructure error có `score = null`, không phải 0.
- [ ] Retry chỉ chạy cho retryable infrastructure errors.
- [ ] Polling/UI dừng đúng tại terminal state.
- [ ] Backend unit/API/E2E tests pass local.
- [ ] Frontend unit/component tests, type-check, lint và build pass local.
- [ ] Các quyết định còn mở ở Mục 18 đã được ghi nhận hoặc chốt rõ.

## 21. Traceability matrix

| Requirement | Backend | Frontend | Test |
| --- | --- | --- | --- |
| Automated grading pipeline | SCRUM-170, 171 | SCRUM-175 | SCRUM-177–181 |
| Weighted partial score | SCRUM-172, 173 | SCRUM-176 | SCRUM-177, 178 |
| Compile Error | SCRUM-171, 173 | SCRUM-176 | SCRUM-179 |
| Infrastructure error không tính 0 | SCRUM-173, 174 | SCRUM-175, 176 | SCRUM-180, 181 |
| Public feedback | SCRUM-172 | SCRUM-176 | SCRUM-177, 178 |
| Hidden aggregate | SCRUM-172 | SCRUM-176 | SCRUM-182, SCRUM-322 |
| Hidden secrecy | DTO/RBAC layer | Không lưu/render secrets | SCRUM-182, SCRUM-322 |
| Retry | SCRUM-174 | Status refresh | SCRUM-181 |
| Immutable AssignmentVersion | SCRUM-171, 172 | N/A | API/E2E regression |

## 22. Ghi chú nguồn và ranh giới diễn giải

Các phần User Story, Context, Scope, Roles, Business Rules, Dependencies,
Acceptance Criteria, Jira test scenarios, metadata, danh sách subtasks và linked
work item được tổng hợp trực tiếp từ Jira SCRUM-74.

Các phần state machine, data model chi tiết, API contract, Definition of Done,
traceability matrix, rủi ro và “Expected implementation” của subtasks là định
hướng kỹ thuật được suy ra từ spec để hỗ trợ chốt implementation. Chúng cần được
đội dự án xác nhận nếu được dùng như contract chính thức.

