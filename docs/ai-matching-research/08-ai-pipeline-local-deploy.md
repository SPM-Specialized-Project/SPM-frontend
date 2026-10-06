# Hướng dẫn vận hành pipeline AI matching

Tài liệu này mô tả **source hiện tại** của HCMUT Tutor Support System, cách chạy local trên Windows và đường deploy của app. AI ở đây là hệ thống gợi ý Student–Tutor để Coordinator xem xét; nó không phải chatbot, không tự train model và không tự ghép lớp.

> **Ranh giới bằng chứng:** dữ liệu và email ví dụ dưới đây là giả lập, không phải hồ sơ HCMUT thật. Điểm số ví dụ được tính từ implementation hiện tại trên bộ giả lập này để giải thích phép toán; không phải kết quả benchmark hay chất lượng ghép. Repository hiện chưa có benchmark relevance do Coordinator gán nhãn, nên Precision@K, nDCG@K, tỷ lệ thành công và so sánh chất lượng model đều chưa đo. Xem [kế hoạch đánh giá](06-evaluation-plan.md).

## 1. Pipeline đang chạy

~~~text
Coordinator chọn Student + model + topK
                │
                ▼
POST /api/matching/recommendations
                │
                ├─ kiểm tra session/quyền và request còn mở
                ├─ chỉ lấy Tutor đã APPROVED
                ▼
Chuẩn hóa profile + trích cụm theo taxonomy cố định
                │
                ▼
Backend tính H(s,t) cho từng Tutor
        ├─ H=0 → loại, lưu reason; không chấm text
        └─ H=1 → tạo feature, tính TF-IDF hoặc gọi BGE adapter local
                │
                ▼
rankingScore = trung bình feature có sẵn
                │
                ▼
Sắp xếp + giải thích bằng evidence → Coordinator duyệt
        ├─ Reject: lưu quyết định/lý do
        └─ Accept: tính lại điều kiện → lưu assignment
~~~

Các điểm vào source: [routes.mjs](../../backend/routes.mjs), [contracts.mjs](../../backend/matching/contracts.mjs), [hard-constraints.mjs](../../backend/matching/hard-constraints.mjs), [profile-extractor.mjs](../../backend/matching/profile-extractor.mjs), [features.mjs](../../backend/matching/features.mjs), [tfidf.mjs](../../backend/matching/tfidf.mjs), [embedding-provider.mjs](../../backend/matching/embedding-provider.mjs), và [service.mjs](../../backend/matching/service.mjs).

### 1.1 Quyền và trạng thái

API yêu cầu phiên Coordinator/Chairman. Student phải có request còn mở; route chỉ chuyển Tutor ở trạng thái APPROVED vào matching service. Tutor khác trạng thái được trả về trong nhóm loại với lý do tutor_not_approved. Đây là kiểm tra nghiệp vụ, không phải AI score.

### 1.2 Chuẩn hóa hồ sơ

Backend ưu tiên các trường trong matchingProfile nhưng vẫn nhận một số tên cũ để chuẩn hóa:

| Thuộc tính | Trường thường dùng | Luật hiện hành |
|---|---|---|
| Môn | subjectIds | Hai bên cần có ít nhất một ID chung |
| Ngôn ngữ | acceptedLanguages | Hai bên cần có ít nhất một giá trị chung |
| Mode | Student requestedModes; Tutor acceptedModes | ONLINE, ONSITE, HYBRID; offline/in_person được chuẩn hóa thành ONSITE |
| Địa điểm | locationIds | Phải giao nhau khi ghép onsite; online không cần location |
| Lịch | availability.timezone và availability.windows | Ngày 0=Chủ nhật, 1=Thứ hai, …, 6=Thứ bảy; giờ dạng 24h |
| Sức chứa | Tutor matchingProfile.maxActiveStudents | Số nguyên không âm; thiếu capacity thì fail closed |
| Mô tả | specialRequest | Dùng để trích taxonomy và so text; không chứng minh năng lực |

HYBRID được mở rộng thành khả năng ONLINE hoặc ONSITE. Nếu dùng nhánh onsite thì cần location trùng; nếu hai bên có ONLINE thì location vật lý không cản trở. Mode lạ bị loại, không đoán. Subject/language phải dùng ID thật của registration; ví dụ subject ID "3" chỉ hợp lệ nếu chính app đang dùng ID đó cho môn tương ứng.

### 1.3 Trích xuất văn bản

Extractor hiện tại là bộ quy tắc cụm tiếng Việt/Anh, không dùng LLM. Nó chuẩn hóa dấu/hoa thường, so khớp taxonomy đã khai báo và lưu lại evidence gốc. Một số topic ID:

- algorithm.big_o, algorithm.sorting, algorithm.recursion
- database.sql, network.tcp_ip
- operating_system.memory_management

Teaching style hiện có: SLOW_PACED, MANY_EXAMPLES, STEP_BY_STEP. Intent hiện có: EXAM_PREP, FOUNDATIONAL, TOPIC_LEARNING, ASSIGNMENT_SUPPORT, SCHEDULING, TEACHING_PREFERENCE.

Câu “Em bị mất gốc phần virtual memory, muốn được giải thích step by step và nhiều ví dụ” có thể tạo các dấu vết FOUNDATIONAL, operating_system.memory_management, STEP_BY_STEP, MANY_EXAMPLES. Đó chỉ là match cụm từ đã lập trình, không phải đánh giá thực lực hay mức độ của Student. learnerLevel và targetLevel còn null; code không suy diễn hai field này.

Nếu văn bản chỉ nói “cuối tuần”, extractor không tự biến thành một khoảng giờ cả ngày. Availability từ text chỉ là hard constraint khi đọc được ngày và giờ bắt đầu/kết thúc. Dùng cửa sổ lịch có cấu trúc và timezone trong form nếu muốn kiểm tra lịch chính xác.

Taxonomy chạy cục bộ trên profile. Text ranking/inference sau đó mới dùng candidate đã qua hard constraints. BGE adapter cũng chỉ nhận text cho candidate khả thi và chạy local.

## 2. Từng bước và phép tính

### Bước 1 — hard feasibility

Với Student s và Tutor t:

~~~text
H(s,t) = subjectMatch
       × languageMatch
       × modeMatch
       × locationMatch
       × availabilityMatch
       × capacityAvailable

C_s = { t ∈ T | H(s,t) = 1 }
~~~

Mỗi hạng tử bằng 0 hoặc 1. Chỉ cặp trong C_s mới được xếp hạng. Các điều kiện:

1. subjectMatch: có môn ID chung.
2. languageMatch: có ngôn ngữ chung.
3. modeMatch: mode tương thích sau chuẩn hóa HYBRID.
4. locationMatch: online chung, hoặc onsite chung kèm location chung.
5. availabilityMatch: nếu Student yêu cầu lịch thì cần ít nhất một window chồng lấp, cùng timezone, dữ liệu hợp lệ. Nếu Student không đặt lịch thì kết quả là not_required_by_student; nó không chứng minh Tutor thực sự rảnh.
6. capacityAvailable: maxActiveStudents hợp lệ và số assignment ACTIVE hiện tại nhỏ hơn capacity.

Ví dụ Tutor có maxActiveStudents=2 và chưa có assignment thì 0<2, còn chỗ. Khi đã có 2 assignment thì 2<2 sai, loại. Capacity bị thiếu cũng bị loại; không bịa workload từ các trường không tồn tại.

Hard feasibility là mask, không đưa vào ranking score. Code không gọi TF-IDF/BGE để rank một cặp đã bị loại. Taxonomy extractor là xử lý từ vựng local; nó không chuyển candidate bị loại vào model scorer/inference.

### Bước 2 — feature cấu trúc

Các feature scoring hiện tại:

- semanticSimilarity: cosine TF-IDF hoặc cosine embedding.
- topicFit: Jaccard giữa các topic IDs được phát hiện ở hai profile.
- teachingStyleFit: Jaccard giữa style IDs được phát hiện ở hai profile.

~~~text
J(A,B) = |A ∩ B| / |A ∪ B|
~~~

Nếu A={virtual_memory}, B={virtual_memory}, giao và hợp đều có 1 phần tử, J=1/1=1. Nếu A={virtual_memory,paging}, B={virtual_memory,segmentation}, giao có 1, hợp có 3, J=1/3≈0.3333. Nếu một bên không có nhãn thì feature bị bỏ khỏi score, không gán 0.

Experience, DifficultyFit, Rating, WorkloadFit, competencyFit và availabilityFit chưa là feature ranking. Lịch, mode, môn, ngôn ngữ, location và capacity là feasibility/evidence riêng, không phải trọng số mềm.

### Bước 3 — baseline TF-IDF

TF-IDF là model mặc định, chạy trong Node, không cần Python. Code làm các bước:

1. Chuyển chữ thường, bỏ dấu tiếng Việt; đ thành d.
2. Tách token chữ/số và bỏ danh sách stopword cố định.
3. Dùng unigram và thêm bigram từ hai từ kề nhau.
4. Tính sublinear term frequency.
5. Tính inverse document frequency trên một request: text Student cộng text các Tutor đủ điều kiện có text.

~~~text
tf(t,d) = 1 + ln(count(t,d))

idf(t) = ln(1 + (N + 1)/(df(t) + 1)) + 1

weight(t,d) = tf(t,d) × idf(t)

cos(x,y) = Σ_i(x_i y_i) /
           (sqrt(Σ_i x_i²) × sqrt(Σ_i y_i²))
~~~

N là số document được vector hóa; df(t) là số document chứa term t ít nhất một lần. Công thức IDF có smoothing nên term chung vẫn có trọng số dương. Lặp lại một từ tăng TF theo logarit.

Ví dụ tính một unigram trong corpus giả lập gồm hai document:

- Doc1 có “memory” hai lần; Doc2 có “memory” một lần và “tutor” một lần.
- N=2; df(memory)=2; df(tutor)=1.
- tf(memory,Doc1)=1+ln(2)≈1.6931.
- idf(memory)=ln(1+(2+1)/(2+1))+1=ln(2)+1≈1.6931.
- weight(memory,Doc1)≈1.6931×1.6931≈2.8667.
- idf(tutor)=ln(1+3/2)+1=ln(2.5)+1≈1.9163; vì xuất hiện một lần nên tf=1 và weight(tutor,Doc2)≈1.9163.

Ví dụ trên tính riêng unigram; code thật còn thêm bigram như memory_memory và memory_tutor. Cosine của vectors TF-IDF không âm, nằm trong [0,1]. Hai câu dùng từ không giao nhau thường nhận score thấp dù ý nghĩa gần nhau; đây là hạn chế lexical baseline.

IDF được tính lại theo pool Tutor trong mỗi request. Cùng một cặp có thể đổi score nếu pool candidate khác; so sánh model cần dùng cùng query và cùng feasible candidate set. Đây không phải model đã học trên kết quả tutoring.

### Bước 4 — baseline BGE-M3 tùy chọn

Khi Coordinator chọn BGE_M3, Node gọi EmbeddingProvider và local FastAPI adapter. Adapter đọc snapshot BAAI/bge-m3 đã pin ở commit 5617a9f61b028005a4858fdac845db406aefb181, tạo vector chuẩn hóa, rồi Node tính:

~~~text
semanticSimilarity = (e_student · e_tutor) /
                     (||e_student|| × ||e_tutor||)
~~~

Adapter nạp weights từ cache hoặc MATCHING_BGE_M3_PATH; startup không tự tải model. Mỗi batch gồm một text Student và tối đa 50 text Tutor đủ điều kiện. Nó không đọc registrations và không tạo assignment.

Paper M3-Embedding mô tả dense, sparse và multi-vector retrieval đa ngôn ngữ; repository này dùng dense vector với cosine. Paper không cho biết độ chính xác của matching Tutor HCMUT. Xem [paper M3 trên ACL Anthology](https://aclanthology.org/2024.findings-acl.137/) và [model artifact tại revision pin](https://huggingface.co/BAAI/bge-m3/tree/5617a9f61b028005a4858fdac845db406aefb181).

Cosine embedding có thể từ -1 đến 1; code đổi sang feature ranking bằng:

~~~text
semanticRankingScore = clamp((semanticSimilarity + 1)/2, 0, 1)
~~~

TF-IDF cosine vốn thuộc [0,1], nên semanticRankingScore TF-IDF giữ nguyên cosine.

### Bước 5 — ranking score

Score hiện tại là equal-weight heuristic trên feature có sẵn:

~~~text
rankingScore = tổng feature khả dụng / số feature khả dụng
~~~

Không có feature nào thì score là null. Feature thiếu bị bỏ khỏi mẫu số. HardMatch không được cộng vào score vì tất cả candidate đã đạt H=1. Ví dụ:

~~~text
topicFit = 1
teachingStyleFit = 1
semanticRankingScore = 0.3837994475

rankingScore = (1 + 1 + 0.3837994475) / 3
             = 0.7945998158
~~~

0.7946 không phải 79.46% xác suất ghép thành công, không phải confidence và không phải xác suất thành công buổi học. Đây chỉ là giá trị để sắp thứ tự theo heuristic chưa được train. Khi bằng score, code sort theo tutorRegistrationId để kết quả ổn định.

### Bước 6 — giải thích và quyết định

Reason được tạo từ field và evidence cụ thể: subject/language/mode chung, location onsite, topic/style trùng và khoảng lịch giao nhau. LLM không viết lý do. Coordinator có thể Reject kèm lý do hoặc Accept. Khi Accept, backend đọc lại registrations và assignment, tính hard constraints/capacity lần nữa rồi mới ghi assignment.

Recommendations, assignments, decisions và feedback hiện được lưu thành JSON files. Feedback là event, chưa phải nhãn train. Lưu file hiện tại không cung cấp giao dịch đa instance như DB transactional.

## 3. Bộ ví dụ giả lập chạy qua logic hiện tại

Tất cả IDs, hồ sơ, email và free text dưới đây là hư cấu. ID môn "3" phải được thay bằng đúng ID trong dữ liệu thật.

### Student

~~~json
{
  "id": "demo-student-os-01",
  "registrationType": "student",
  "status": "PENDING",
  "subjectIds": ["3"],
  "acceptedLanguages": ["vi"],
  "requestedModes": ["ONLINE"],
  "locationIds": [],
  "specialRequest": "Em bị mất gốc phần virtual memory, muốn được giải thích step by step và nhiều ví dụ. Em chỉ rảnh thứ 3 từ 19:00 đến 21:00.",
  "matchingProfile": {
    "availability": {
      "timezone": "Asia/Ho_Chi_Minh",
      "windows": [
        { "dayOfWeek": 2, "startTime": "19:00", "endTime": "21:00" }
      ]
    }
  }
}
~~~

Trong app, dayOfWeek=2 là thứ Ba (0 là Chủ nhật). Request matching thật chỉ gửi studentRegistrationId, model, topK; không gửi profile JSON thay cho registration backend.

### Tutor A — đủ điều kiện

~~~json
{
  "id": "demo-tutor-os-eligible",
  "registrationType": "tutor",
  "status": "APPROVED",
  "subjectIds": ["3"],
  "acceptedLanguages": ["vi", "en"],
  "acceptedModes": ["ONLINE"],
  "locationIds": [],
  "specialRequest": "I tutor virtual memory and memory management. I explain step by step and use examples.",
  "matchingProfile": {
    "maxActiveStudents": 2,
    "availability": {
      "timezone": "Asia/Ho_Chi_Minh",
      "windows": [
        { "dayOfWeek": 2, "startTime": "18:00", "endTime": "22:00" }
      ]
    }
  }
}
~~~

Subject/language/mode khớp; online không cần location; lịch Student [19:00,21:00) nằm trong lịch Tutor [18:00,22:00) cùng thứ và timezone; Tutor có 2 chỗ và chưa có assignment. Vì vậy:

~~~text
H = 1 × 1 × 1 × 1 × 1 × 1 = 1
~~~

### Tutor B — bị loại trước semantic ranking

~~~json
{
  "id": "demo-tutor-os-language-mismatch",
  "registrationType": "tutor",
  "status": "APPROVED",
  "subjectIds": ["3"],
  "acceptedLanguages": ["en"],
  "acceptedModes": ["ONLINE"],
  "locationIds": [],
  "specialRequest": "I tutor virtual memory and explain step by step.",
  "matchingProfile": {
    "maxActiveStudents": 2,
    "availability": {
      "timezone": "Asia/Ho_Chi_Minh",
      "windows": [
        { "dayOfWeek": 2, "startTime": "18:00", "endTime": "22:00" }
      ]
    }
  }
}
~~~

Tutor B trượt language, các điều kiện kia đạt:

~~~text
H = 1 × 0 × 1 × 1 × 1 × 1 = 0
reason = language_mismatch
~~~

Text của Tutor B không đi tới bước TF-IDF/BGE. Kết quả tính bởi current TF-IDF code cho Tutor A trên bộ dữ liệu giả lập này:

| Feature/output | Giá trị |
|---|---:|
| topicFit | 1 |
| teachingStyleFit | 1 |
| semanticSimilarity | 0.3837994475 |
| semanticRankingScore | 0.3837994475 |
| rankingScore | 0.7945998158 |

Topic evidence là taxonomy operating_system.memory_management: phía Student có span “virtual memory”, phía Tutor có span “memory management”. Style evidence là STEP_BY_STEP và MANY_EXAMPLES. Lịch chung là Tue 19:00-21:00. Đây là evidence của profile khai báo, không xác minh trình độ/bằng cấp Tutor.

Tính ranking: (1 + 1 + 0.3837994475)/3 = 0.7945998158. Đây là điểm minh họa của một cặp trên một synthetic example, không phải đánh giá chất lượng hệ thống.

## 4. Chạy local trên Windows: TF-IDF

Cần Node.js >=20 cho backend; workflow CI hiện dùng Node 22. Lệnh dưới đây chạy backend bằng một thư mục temp riêng thay vì ghi vào backend/data trong checkout.

### Terminal 1 — backend

~~~powershell
Set-Location 'C:\disk D\SPM-frontend'
node --version
npm ci --prefix frontend
npm run backend:test

$env:BACKEND_PORT = '4000'
$env:BACKEND_CORS_ORIGIN = 'http://localhost:3000'
$env:BACKEND_DATA_DIRECTORY = Join-Path $env:TEMP ("spm-ai-matching-local-" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
npm run backend:watch
~~~

Giữ terminal mở. Backend tạo collection JSON ở BACKEND_DATA_DIRECTORY khi nhận request; các JSON trong backend/data hiện hữu không bị dùng cho phiên này.

### Terminal 2 — frontend

~~~powershell
Set-Location 'C:\disk D\SPM-frontend'
$env:VITE_BACKEND_PROXY_TARGET = 'http://127.0.0.1:4000'
npm --prefix frontend run dev -- --host 127.0.0.1
~~~

Mở http://localhost:3000. Frontend mặc định gọi /api; Vite proxy đến Node tại port 4000.

### Đăng nhập và tạo candidate

Seed local có account demo Coordinator coordinator@gmail.com / coordinator123. Chỉ dùng credential fixture này trên local, không dùng trên staging/production.

1. Đăng nhập và mở /overview.
2. Các registration seed cũ có thể thiếu availability/capacity nên không đủ điều kiện matching.
3. Tạo/cập nhật Student có subject ID, ngôn ngữ, mode, specialRequest và availability với timezone/window rõ ràng.
4. Tutor phải khai báo giá trị tương thích, capacity dương và mô tả năng lực; Coordinator duyệt Tutor thành APPROVED.
5. Chọn Student, chọn TFIDF, chọn topK 1–50, chạy gợi ý; đọc constraint/evidence/features rồi Coordinator mới Accept/Reject.

API nhận body tương tự sau, với registration ID thực lấy từ local app:

~~~json
{
  "studentRegistrationId": "<registration-id>",
  "model": "TFIDF",
  "topK": 5
}
~~~

Sau khi UI gọi API, recommendation được lưu tại thư mục BACKEND_DATA_DIRECTORY trong matching-recommendations.json. Assignment/decision/feedback được lưu ở các JSON collection cùng thư mục. Có thể đọc kết quả:

~~~powershell
Get-ChildItem -LiteralPath $env:BACKEND_DATA_DIRECTORY
Get-Content -LiteralPath (Join-Path $env:BACKEND_DATA_DIRECTORY 'matching-recommendations.json')
~~~

JSON minh họa ở mục 3 là record dùng giải thích tính toán, không phải payload để gửi thẳng vào endpoint; API dùng registrations đã persist.

## 5. Chạy BGE-M3 local (không bắt buộc)

BGE cần cài Python dependencies và tải model lần đầu; inference sau đó dùng local snapshot. Nó nặng/chậm hơn TF-IDF. Adapter source: [backend/ai-service/README.md](../../backend/ai-service/README.md).

### Terminal adapter — cài dependencies và đúng revision

~~~powershell
Set-Location 'C:\disk D\SPM-frontend'
py -3.12 -m venv .venv-matching
& .\.venv-matching\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r backend/ai-service/requirements.txt
python -m pip install --upgrade huggingface_hub

$env:HF_HOME = Join-Path $env:USERPROFILE '.cache\huggingface'
hf download BAAI/bge-m3 --revision 5617a9f61b028005a4858fdac845db406aefb181
~~~

CLI chính thức hỗ trợ hf download và tải theo commit bằng --revision: [Hugging Face CLI docs](https://huggingface.co/docs/huggingface_hub/guides/cli). Revision này cũng được pin trong [model artifact](https://huggingface.co/BAAI/bge-m3/tree/5617a9f61b028005a4858fdac845db406aefb181).

Khởi động adapter trong terminal đó:

~~~powershell
$env:MATCHING_BGE_M3_DEVICE = 'cpu'
python -m uvicorn app:app --app-dir backend/ai-service --host 127.0.0.1 --port 8101
~~~

Adapter chỉ bind loopback. Kiểm tra ở terminal khác; health phải có ok=true, revision đúng và weightsSource=local-only:

~~~powershell
Invoke-RestMethod http://127.0.0.1:8101/health
~~~

### Cấu hình Node backend

Trong terminal backend, dừng process bằng Ctrl+C rồi bật cấu hình và chạy lại:

~~~powershell
$env:MATCHING_EMBEDDING_URL = 'http://127.0.0.1:8101'
$env:MATCHING_BGE_M3_REVISION = '5617a9f61b028005a4858fdac845db406aefb181'
npm run backend:watch
~~~

Coordinator có thể chọn BGE_M3 trên UI. Nếu service tắt, weights thiếu hoặc revision không khớp, API trả lỗi rõ; backend không đổi ngầm sang TF-IDF. Bỏ hai biến môi trường trên để chạy TF-IDF.

Bài M3-Embedding nói về model embeddings đa ngôn ngữ với dense/sparse/multi-vector modes; app này chỉ dùng dense vectors + cosine. Paper không đo matching tutor HCMUT: [ACL Anthology paper](https://aclanthology.org/2024.findings-acl.137/).

## 6. CI/CD và deploy

### Thay đổi workflow/deploy trong checkout

- .github/workflows/pr-quality.yml: thêm Matching AI Quality cho PR vào main/staging. Dùng Python 3.12 để py_compile adapter và parse evaluation dataset schema JSON.
- .github/workflows/main-ci.yml: thêm gate tương tự; deploy-local cần frontend-quality, backend-quality và matching-ai-quality đều thành công.
- .github/workflows/staging-deploy.yml: gate kiểm tra revision cần deploy, gồm app_ref nếu được gọi từ workflow E2E; staging deploy đợi gate. Staging vẫn chạy frontend lint/type/build và backend tests.
- deploy/bin/spm-deploy và deploy/bin/spm-staging-deploy: preflight đòi frontend dist, backend server, matching service và adapter source. Deploy copy source backend vào release.

Workflow dùng action chính thức [actions/setup-python releases](https://github.com/actions/setup-python/releases) với major @v7 và Python 3.12. Gate AI hiện kiểm tra cú pháp Python và JSON schema; nó chưa đánh giá chất lượng model, không cài Torch và không tải weights.

### Luồng push

1. PR vào main/staging chạy quality checks, không deploy.
2. Push/merge lên staging chạy staging workflow; push/merge lên main chạy main workflow.
3. Ubuntu runner chạy quality jobs. Khi chúng xanh, Debian self-hosted runner build/deploy release.
4. Node systemd service khởi động backend và cung cấp matching API với TF-IDF mặc định.
5. Health check hiện kiểm tra app/API; không kiểm tra BGE inference.

### BGE chưa được cài tự động trên Debian

Deploy đóng gói source Python adapter nhưng không cài requirements, tạo venv, tải model snapshot, hoặc cài/start systemd unit cho FastAPI. Do đó Node API TF-IDF vẫn chạy sau deploy; nếu chọn BGE trên host chưa cấu hình MATCHING_EMBEDDING_URL đến adapter đang chạy thì nhận lỗi inference, không fallback.

Không expose adapter ra public network: adapter hiện không có auth. Để chạy BGE lâu dài trên Debian cần tác vụ ops/deployment riêng: cài Python environment, đưa pinned weights vào cache/path, systemd/supervisor bind loopback, cấu hình MATCHING_EMBEDDING_URL trong backend env, phân quyền, healthcheck và resource limits. Các thay đổi này chưa nằm trong workflow source hiện tại vì repo không xác nhận đủ tài nguyên/lifecycle của host.

Installer local/staging hiện có cài Nginx/rsync/Node systemd/tunnel prerequisites, không cài Python model. Production backend chạy port 4000 sau Nginx 80; staging backend chạy 4011 sau Nginx 8080. Debian runner phải có self-hosted labels, sudoers và deploy scripts được cài như workflow hiện yêu cầu.

Các thay đổi workflow/deploy mới chỉ deploy sau khi được commit/push tới branch được workflow theo dõi và job runner chạy thành công. Checkout local chưa được deploy trong tác vụ này.

## 7. Đánh giá offline khi có nhãn được duyệt

Evaluator và schema ở [evaluation-dataset.schema.json](../../backend/matching/evaluation-dataset.schema.json), [evaluate.mjs](../../backend/matching/evaluate.mjs), và [evaluation plan](06-evaluation-plan.md). Dataset cần được ẩn danh, gán nhãn Coordinator/domain expert, có rubric/adjudication và judgments cho toàn bộ candidate khả thi.

~~~powershell
node backend/matching/evaluate.mjs --input C:\private\matching-dev.json --output C:\private\matching-metrics.json --models TFIDF,BGE_M3 --k 5
~~~

CLI từ chối synthetic fixtures để tránh biến ví dụ thành kết quả thực nghiệm. So sánh model phải dùng cùng query, candidate khả thi, split và relevance labels. Khi chưa có nhãn thật, không báo cáo P@K, Recall@K, MRR, MAP@K, nDCG@K, HitRate@K như kết quả HCMUT.

## 8. Đề xuất nghiên cứu và phần chưa triển khai

Các bài tutor recommender, peer tutor, mentor–mentee, reciprocal recommendation, sentence embeddings, learning-to-rank và evaluation được dẫn cùng phân biệt **SOURCE SAYS** / **OUR DESIGN DECISION** trong [literature review](01-literature-review.md). Paper của trường/corpus khác chỉ giúp chọn hướng nghiên cứu; không phải bằng chứng app này đạt hiệu năng tương tự.

Hiện chưa có supervised/fine-tuned model theo tutoring outcomes; không có LLM chọn Tutor; chưa học weights; không có Tutor-side preference cho reciprocal score; không có global batch assignment; chưa có UI feedback form; JSON file persistence chưa phải transactional DB. Feedback API lưu event nhưng không tự biến thành nhãn. Đây là heuristic baseline có giải thích; Coordinator giữ quyết định cuối.

### Tài liệu nguồn trực tiếp

- [M3-Embedding paper, ACL Anthology 2024](https://aclanthology.org/2024.findings-acl.137/).
- [BAAI/bge-m3 artifact, pinned revision](https://huggingface.co/BAAI/bge-m3/tree/5617a9f61b028005a4858fdac845db406aefb181).
- [Hugging Face Hub CLI documentation](https://huggingface.co/docs/huggingface_hub/guides/cli).
- [actions/setup-python releases](https://github.com/actions/setup-python/releases).
- Các bài gốc tutor/peer tutoring/mentor matching cùng DOI/ACL links nằm trong [01-literature-review.md](01-literature-review.md).
