# Flutter Mobile Migration Plan

Tài liệu này xác lập hướng chuyển trải nghiệm Tutor Support System từ web React/Vite sang ứng dụng Flutter đa nền tảng. Đây là **đặc tả và kế hoạch**, không phải triển khai. Tài liệu phân biệt rõ hiện trạng có bằng chứng trong repository với đề xuất mobile và các giả định cần product/backend xác nhận.

## Existing system

Web hiện là React/TypeScript/Vite + TanStack Router; server là Node.js ESM HTTP API, dữ liệu chính được lưu trong JSON files. Flutter nằm ở repository riêng `SPM-mobile` và hiện là scaffold counter. Auth là bearer session trong bộ nhớ server, chưa thấy refresh/revoke API. Năm role chuẩn trong source: student, lecturer, coordinator, chairman, admin (legacy `tutor` được normalize thành lecturer).

## Target

Ứng dụng Flutter native-first, tái sử dụng backend qua API HTTPS, điều hướng role-aware, bố cục mobile-specific và không giả vờ local/mock data là dữ liệu đã lưu. Đây là kiến trúc đề xuất; chưa có feature code nào được viết.

## Architecture overview

```text
React/Vite Web ─────┐
                    ├── Existing Backend/API (Node HTTP + JSON files)
Flutter Mobile ─────┘
```

## Phạm vi và căn cứ

- Web/backend source of truth được khảo sát: repository `SPM-frontend` tại `C:\disk D\SPM-frontend`.
- Flutter app hiện có là repository riêng `SPM-mobile` tại `C:\disk D\SPM-mobile`; thư mục tài liệu này nằm trong `SPM-frontend` theo yêu cầu. Chưa có quyết định hợp nhất hai repository.
- Snapshot được khảo sát ngày 2026-10-01. Sau khi phát hiện checkout ban đầu chậm upstream một commit, branch được fast-forward an toàn lên `73bd83d` và phần CodePulse mới được rà lại trước khi chốt tài liệu. Thay đổi local có sẵn tại `frontend/tsconfig.tsbuildinfo` được giữ nguyên.
- App Flutter đang là scaffold counter mặc định; `pubspec.yaml` chưa có thư viện kiến trúc/network/state ngoài Flutter và `cupertino_icons`.
- README gốc mô tả một số công nghệ/backend không khớp source hiện chạy được. Khi có mâu thuẫn, bộ tài liệu này dùng route/component/service/backend handler thực tế làm bằng chứng.

## Documentation map

1. [Khảo sát repository và độ tin cậy của bằng chứng](00-system-discovery/repository-overview.md), [source traceability](00-system-discovery/source-traceability.md)
2. [Danh mục màn hình web](00-system-discovery/web-screen-inventory.md), [API backend hiện có](00-system-discovery/backend-api-inventory.md), [vai trò và quyền](00-system-discovery/roles-and-permissions.md), [design system web](00-system-discovery/current-design-system.md)
3. [Nguyên tắc chuyển web sang mobile](01-mobile-product-architecture/web-to-mobile-principles.md), [information architecture và điều hướng](01-mobile-product-architecture/information-architecture.md), [điều hướng theo role](01-mobile-product-architecture/role-navigation.md), [bản đồ route](01-mobile-product-architecture/route-mapping.md)
4. [Mobile design tokens](02-mobile-design-system/tokens-and-components.md), [responsive, accessibility và trạng thái](02-mobile-design-system/layout-accessibility-states.md)
5. [Kiến trúc Flutter đề xuất](03-flutter-technical-architecture/architecture-and-folder-structure.md), [routing/state](03-flutter-technical-architecture/routing-and-state.md), [network/auth/storage/error](03-flutter-technical-architecture/network-security-and-errors.md), [authorization ba lớp](03-flutter-technical-architecture/authorization.md)
6. Đặc tả màn hình: [đăng nhập và khóa học](04-screen-specifications/auth-and-courses.md), [CodePulse](04-screen-specifications/codepulse.md), [lịch và phiên học](04-screen-specifications/schedule-and-sessions.md), [đăng ký và điều phối](04-screen-specifications/registration-and-coordination.md), [thư viện, hồ sơ, thống kê và monitoring](04-screen-specifications/library-profile-analytics.md)
7. API: [contract mapping](05-api-integration/contract-map.md), [domain mapping](05-api-integration/domain-data-mapping.md), [pagination/filtering](05-api-integration/pagination-filtering.md), [gap và quyết định cần có](05-api-integration/backend-gaps.md)
8. Delivery: [roadmap](06-implementation-roadmap/roadmap.md), [dependency order](06-implementation-roadmap/dependency-order.md), [quality strategy](07-quality-and-release/quality-strategy.md)

## Architectural direction in brief

- Treat the phone as an authenticated, role-aware client of a versioned backend API; never encode authorization as a client-only visibility rule.
- Prefer task-oriented mobile screens, compact cards, native pickers, bottom sheets and agenda/list views. Do not shrink desktop tables or carry the web sidebar/drawer into the phone shell.
- Proposed baseline: Flutter + Material 3, feature-first structure, Riverpod for async/application state, GoRouter for guarded deep links and tab stacks, Dio behind repositories, typed DTOs, secure token storage. These are recommendations only; none is installed in the app today.
- Before data-heavy feature work, resolve API reachability/auth/session security, persistence gaps and stable response/error contracts. Several web flows are local-only or fixture-driven.
- Build one vertical slice at a time, starting with environment/auth/course read, then roster/submission, CodePulse, schedule, registrations, and management/reporting according to product priority and backend readiness.

## Proposed implementation sequence

Phase 0 Discovery → Phase 1 Flutter foundation → Phase 2 authentication/authorization → Phase 3 application shell → Phase 4 core learning features → Phase 5 role-specific features → Phase 6 UX polish/resilience → Phase 7 testing/release. See the roadmap for prerequisites, modules, API dependencies and acceptance criteria per phase.

## Current status

- Discovery: **DISCOVERY COMPLETE** for the inspected checkout snapshot.
- Flutter feature implementation: **NOT STARTED**.
- Production readiness: **NEEDS DECISION / BLOCKED** on API reachability, auth lifecycle, role policy, and data/persistence contracts. Documentation completion does not mean the app is ready to ship.

## Critical decisions

1. Confirm `SPM-mobile` remains a separate repository and where this plan should live long-term.
2. Provide reachable HTTPS backend staging and production environments; backend currently binds loopback.
3. Define mobile-safe session refresh/revocation and canonical server capability contract.
4. Resolve coordinator/chairman/admin/lecturer permission mismatches and fixture/JSON persistence production readiness.
5. Decide core MVP and explicitly defer unbacked ratings, profile editing, library, notifications/chat, analytics and monitoring.
6. Review the implemented web matching contract in [`docs/ai-matching-research`](../ai-matching-research/README.md); decide mobile exposure, Coordinator policy and production persistence/privacy gates. Also confirm CodePulse production sandbox requirements, Android package ID/signing, iOS bundle ID and minimum OS.

## Status vocabulary

- **Hiện trạng**: directly observed in the checked-out source/configuration.
- **Đề xuất**: target behavior or architecture for the mobile app; not yet implemented or approved.
- **Cần xác nhận**: a product/security/backend decision or behavior that source does not prove.
- **Chặn phát hành**: must be resolved before the affected feature can be considered production-ready.

No Flutter feature implementation, dependency addition, backend change, or web change is part of this documentation task.
