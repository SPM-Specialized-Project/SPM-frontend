# SOFTWARE-ENGINEER-BTL

[![React](https://img.shields.io/badge/React-19.0.0-61DAFB?style=flat&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat&logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> 🎓 A modern full-stack web application for HCMUT Software Engineering course management system

## 📋 Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Frontend Setup](#frontend-setup)
  - [Backend Setup](#backend-setup)
  - [Database Setup](#database-setup)
- [Development](#development)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

---

## 🌟 Overview

This project is a comprehensive course management system built for Ho Chi Minh City University of Technology (HCMUT). It provides a modern, scalable platform for managing courses, students, assignments, and system monitoring.

### ✨ Key Features

- 🔐 **Authentication & Authorization**: Secure login with JWT and Google OAuth
- 📚 **Course Management**: Create, manage, and enroll in courses
- 📊 **System Monitoring**: Real-time performance metrics and analytics
- 📝 **Assignment Submissions**: Upload and track student submissions
- 🎨 **Modern UI/UX**: Responsive design with Tailwind CSS and Material-UI
- ⚡ **Real-time Updates**: Live data synchronization
- 🔍 **Search & Filtering**: Advanced search capabilities

---

## Full-Stack Development/Implementation View
```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT TIER                                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────┐    │
│  │                         WEB BROWSER                                        │    │
│  │  ┌──────────────────────────────────────────────────────────────────────┐ │    │
│  │  │                    REACT APPLICATION (SPA)                           │ │    │
│  │  │                         Port: 80                                     │ │    │
│  │  │  ┌────────────────────────────────────────────────────────────────┐ │ │    │
│  │  │  │              PRESENTATION LAYER                                │ │ │    │
│  │  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │ │ │    │
│  │  │  │  │  Login   │  │  Course  │  │  System  │  │  Other   │      │ │ │    │
│  │  │  │  │  Page    │  │  Page    │  │  Monitor │  │  Pages   │      │ │ │    │
│  │  │  │  │ (~login/)│  │(~course/)│  │  Page    │  │          │      │ │ │    │
│  │  │  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘      │ │ │    │
│  │  │  └───────┼──────────────┼──────────────┼─────────────┼───────────┘ │ │    │
│  │  │          │              │              │             │             │ │    │
│  │  │  ┌───────▼──────────────▼──────────────▼─────────────▼───────────┐ │ │    │
│  │  │  │              ROUTING LAYER                                     │ │ │    │
│  │  │  │  ┌──────────────────────────────────────────────────────────┐ │ │ │    │
│  │  │  │  │   TanStack Router (routeTree.gen.ts)                     │ │ │ │    │
│  │  │  │  │   - File-based Routing                                   │ │ │ │    │
│  │  │  │  │   - Lazy Loading & Code Splitting                        │ │ │ │    │
│  │  │  │  │   - Route Guards (Auth Protection)                       │ │ │ │    │
│  │  │  │  └──────────────────────────────────────────────────────────┘ │ │ │    │
│  │  │  └────────────────────────┬───────────────────────────────────────┘ │ │    │
│  │  │                           │                                         │ │    │
│  │  │  ┌────────────────────────▼───────────────────────────────────────┐ │ │    │
│  │  │  │              STATE MANAGEMENT LAYER                            │ │ │    │
│  │  │  │  ┌───────────────────────────────────────────────────────────┐ │ │ │    │
│  │  │  │  │        Zustand Stores (Client State)                      │ │ │ │    │
│  │  │  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                │ │ │ │    │
│  │  │  │  │  │   Auth   │  │   User   │  │  Loading │                │ │ │ │    │
│  │  │  │  │  │  Store   │  │  Store   │  │  Store   │                │ │ │ │    │
│  │  │  │  │  └──────────┘  └──────────┘  └──────────┘                │ │ │ │    │
│  │  │  │  └───────────────────────────────────────────────────────────┘ │ │ │    │
│  │  │  │  ┌───────────────────────────────────────────────────────────┐ │ │ │    │
│  │  │  │  │   TanStack Query (Server State Cache)                     │ │ │ │    │
│  │  │  │  │   - Query Cache Management                                │ │ │ │    │
│  │  │  │  │   - Automatic Refetching                                  │ │ │ │    │
│  │  │  │  │   - Optimistic Updates                                    │ │ │ │    │
│  │  │  │  └───────────────────────────────────────────────────────────┘ │ │ │    │
│  │  │  └────────────────────────┬───────────────────────────────────────┘ │ │    │
│  │  │                           │                                         │ │    │
│  │  │  ┌────────────────────────▼───────────────────────────────────────┐ │ │    │
│  │  │  │              HTTP CLIENT LAYER                                 │ │ │    │
│  │  │  │  ┌───────────────────────────────────────────────────────────┐ │ │ │    │
│  │  │  │  │   Axios Instance (custom-axios.ts)                        │ │ │ │    │
│  │  │  │  │   - Base URL: http://localhost:3001                       │ │ │ │    │
│  │  │  │  │   - Request Interceptor (JWT Token Injection)             │ │ │ │    │
│  │  │  │  │   - Response Interceptor (Error Handling)                 │ │ │ │    │
│  │  │  │  │   - Credentials: withCredentials                          │ │ │ │    │
│  │  │  │  └───────────────────────────────────────────────────────────┘ │ │ │    │
│  │  │  └────────────────────────┬───────────────────────────────────────┘ │ │    │
│  │  └───────────────────────────┼────────────────────────────────────────┘ │    │
│  └────────────────────────────────┼───────────────────────────────────────┘    │
└────────────────────────────────┼────────────────────────────────────────────────┘
                                 │
                                 │ HTTP/HTTPS (REST API)
                                 │ JSON over HTTP
                                 │ Authorization: Bearer <JWT>
                                 │
┌────────────────────────────────▼────────────────────────────────────────────────────┐
│                           APPLICATION TIER (BACKEND)                                 │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────┐    │
│  │                         NESTJS APPLICATION                                  │    │
│  │                            Port: 3001                                       │    │
│  │  ┌──────────────────────────────────────────────────────────────────────┐ │    │
│  │  │              API GATEWAY LAYER                                       │ │    │
│  │  │  ┌────────────────────────────────────────────────────────────────┐ │ │    │
│  │  │  │   REST API Controllers                                         │ │ │    │
│  │  │  │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │ │ │    │
│  │  │  │   │   Auth   │  │   User   │  │  Course  │  │  System  │     │ │ │    │
│  │  │  │   │Controller│  │Controller│  │Controller│  │Controller│     │ │ │    │
│  │  │  │   │          │  │          │  │          │  │          │     │ │ │    │
│  │  │  │   │/api/auth │  │/api/users│  │/api/     │  │/api/     │     │ │ │    │
│  │  │  │   │          │  │          │  │courses   │  │system    │     │ │ │    │
│  │  │  │   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘     │ │ │    │
│  │  │  └────────┼──────────────┼──────────────┼─────────────┼──────────┘ │ │    │
│  │  │           │              │              │             │            │ │    │
│  │  │  ┌────────▼──────────────▼──────────────▼─────────────▼──────────┐ │ │    │
│  │  │  │              MIDDLEWARE & SECURITY LAYER                      │ │ │    │
│  │  │  │  ┌──────────────────────────────────────────────────────────┐ │ │ │    │
│  │  │  │  │  Global Middleware Pipeline                              │ │ │ │    │
│  │  │  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │ │ │ │    │
│  │  │  │  │  │   Helmet    │  │    CORS     │  │   Logger    │      │ │ │ │    │
│  │  │  │  │  │  (Security) │  │  (Origin)   │  │(Interceptor)│      │ │ │ │    │
│  │  │  │  │  └─────────────┘  └─────────────┘  └─────────────┘      │ │ │ │    │
│  │  │  │  └──────────────────────────────────────────────────────────┘ │ │ │    │
│  │  │  │  ┌──────────────────────────────────────────────────────────┐ │ │ │    │
│  │  │  │  │  Route-level Guards & Pipes                              │ │ │ │    │
│  │  │  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │ │ │ │    │
│  │  │  │  │  │    JWT      │  │    Role     │  │ Validation  │      │ │ │ │    │
│  │  │  │  │  │AuthGuard    │  │   Guard     │  │    Pipe     │      │ │ │ │    │
│  │  │  │  │  │(Passport)   │  │   (RBAC)    │  │class-validator│    │ │ │ │    │
│  │  │  │  │  └─────────────┘  └─────────────┘  └─────────────┘      │ │ │ │    │
│  │  │  │  └──────────────────────────────────────────────────────────┘ │ │ │    │
│  │  │  │  ┌──────────────────────────────────────────────────────────┐ │ │ │    │
│  │  │  │  │  Exception Filters                                       │ │ │ │    │
│  │  │  │  │  - HttpExceptionFilter                                   │ │ │ │    │
│  │  │  │  │  - ValidationExceptionFilter                             │ │ │ │    │
│  │  │  │  │  - DatabaseExceptionFilter                               │ │ │ │    │
│  │  │  │  └──────────────────────────────────────────────────────────┘ │ │ │    │
│  │  │  └────────────────────────┬───────────────────────────────────────┘ │ │    │
│  │  │                           │                                         │ │    │
│  │  │  ┌────────────────────────▼───────────────────────────────────────┐ │ │    │
│  │  │  │              BUSINESS LOGIC LAYER                              │ │ │    │
│  │  │  │  ┌──────────────────────────────────────────────────────────┐ │ │ │    │
│  │  │  │  │   NestJS Services (Domain Logic)                         │ │ │ │    │
│  │  │  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │ │ │ │    │
│  │  │  │  │  │   Auth   │  │   User   │  │  Course  │  │  System  │ │ │ │ │    │
│  │  │  │  │  │ Service  │  │ Service  │  │ Service  │  │ Service  │ │ │ │ │    │
│  │  │  │  │  │          │  │          │  │          │  │          │ │ │ │ │    │
│  │  │  │  │  │-login()  │  │-create() │  │-findAll()│  │-monitor()│ │ │ │ │    │
│  │  │  │  │  │-register│  │-update() │  │-enroll() │  │-metrics()│ │ │ │ │    │
│  │  │  │  │  │-validate│  │-delete() │  │-submit() │  │          │ │ │ │ │    │
│  │  │  │  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │ │ │ │    │
│  │  │  │  └───────┼──────────────┼──────────────┼─────────────┼──────┘ │ │ │    │
│  │  │  └──────────┼──────────────┼──────────────┼─────────────┼────────┘ │ │    │
│  │  │             │              │              │             │          │ │    │
│  │  │  ┌──────────▼──────────────▼──────────────▼─────────────▼────────┐ │ │    │
│  │  │  │              DATA ACCESS LAYER                                │ │ │    │
│  │  │  │  ┌──────────────────────────────────────────────────────────┐ │ │ │    │
│  │  │  │  │   TypeORM Repositories                                   │ │ │ │    │
│  │  │  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │ │ │ │    │
│  │  │  │  │  │   User   │  │  Course  │  │  Order   │  │Submission│ │ │ │ │    │
│  │  │  │  │  │Repository│  │Repository│  │Repository│  │Repository│ │ │ │ │    │
│  │  │  │  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │ │ │ │    │
│  │  │  │  └───────┼──────────────┼──────────────┼─────────────┼──────┘ │ │ │    │
│  │  │  └──────────┼──────────────┼──────────────┼─────────────┼────────┘ │ │    │
│  │  │             │              │              │             │          │ │    │
│  │  │  ┌──────────▼──────────────▼──────────────▼─────────────▼────────┐ │ │    │
│  │  │  │              ORM LAYER (TypeORM/Prisma)                       │ │ │    │
│  │  │  │  ┌──────────────────────────────────────────────────────────┐ │ │ │    │
│  │  │  │  │   Entity Models                                          │ │ │ │    │
│  │  │  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │ │ │ │    │
│  │  │  │  │  │   User   │  │  Course  │  │  Order   │  │Submission│ │ │ │ │    │
│  │  │  │  │  │  Entity  │  │  Entity  │  │  Entity  │  │  Entity  │ │ │ │ │    │
│  │  │  │  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │ │ │ │    │
│  │  │  │  └──────────────────────────────────────────────────────────┘ │ │ │    │
│  │  │  │  ┌──────────────────────────────────────────────────────────┐ │ │ │    │
│  │  │  │  │   Connection Pool & Query Builder                        │ │ │ │    │
│  │  │  │  │   - Transaction Management                               │ │ │ │    │
│  │  │  │  │   - Migration System                                     │ │ │ │    │
│  │  │  │  │   - Database Seeding                                     │ │ │ │    │
│  │  │  │  └────────────────────┬─────────────────────────────────────┘ │ │ │    │
│  │  │  └───────────────────────┼───────────────────────────────────────┘ │ │    │
│  │  └────────────────────────────┼────────────────────────────────────────┘ │    │
│  └───────────────────────────────┼─────────────────────────────────────────┘    │
└────────────────────────────────┼────────────────────────────────────────────────┘
                                 │
                                 │ TCP/IP (PostgreSQL Protocol)
                                 │ SQL Queries
                                 │
┌────────────────────────────────▼────────────────────────────────────────────────────┐
│                              DATABASE TIER                                           │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────┐    │
│  │                    PostgreSQL Database Server                               │    │
│  │                         Port: 5432                                          │    │
│  │  ┌──────────────────────────────────────────────────────────────────────┐ │    │
│  │  │              DATABASE SCHEMA                                         │ │    │
│  │  │  ┌────────────────────────────────────────────────────────────────┐ │ │    │
│  │  │  │   Tables                                                       │ │ │    │
│  │  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │ │ │    │
│  │  │  │  │  users   │  │ courses  │  │  orders  │  │submissions│    │ │ │    │
│  │  │  │  │          │  │          │  │          │  │          │     │ │ │    │
│  │  │  │  │-id (PK)  │  │-id (PK)  │  │-id (PK)  │  │-id (PK)  │     │ │ │    │
│  │  │  │  │-email    │  │-title    │  │-userId   │  │-courseId │     │ │ │    │
│  │  │  │  │-password │  │-content  │  │-total    │  │-userId   │     │ │ │    │
│  │  │  │  │-role     │  │-userId   │  │-status   │  │-file     │     │ │ │    │
│  │  │  │  │-createdAt│  │-createdAt│  │-createdAt│  │-createdAt│     │ │ │    │
│  │  │  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘     │ │ │    │
│  │  │  │       │              │              │             │           │ │ │    │
│  │  │  │       └──────────────┴──────────────┴─────────────┘           │ │ │    │
│  │  │  │              Foreign Key Relationships                        │ │ │    │
│  │  │  └────────────────────────────────────────────────────────────────┘ │ │    │
│  │  │  ┌────────────────────────────────────────────────────────────────┐ │ │    │
│  │  │  │   Indexes                                                      │ │ │    │
│  │  │  │   - Primary Keys (id)                                          │ │ │    │
│  │  │  │   - Unique Indexes (email)                                     │ │ │    │
│  │  │  │   - Foreign Key Indexes                                        │ │ │    │
│  │  │  │   - Performance Indexes (createdAt, userId, etc.)              │ │ │    │
│  │  │  └────────────────────────────────────────────────────────────────┘ │ │    │
│  │  │  ┌────────────────────────────────────────────────────────────────┐ │ │    │
│  │  │  │   Constraints                                                  │ │ │    │
│  │  │  │   - NOT NULL constraints                                       │ │ │    │
│  │  │  │   - CHECK constraints                                          │ │ │    │
│  │  │  │   - DEFAULT values                                             │ │ │    │
│  │  │  └────────────────────────────────────────────────────────────────┘ │ │    │
│  │  └──────────────────────────────────────────────────────────────────────┘ │    │
│  └────────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          SUPPORTING SERVICES                                         │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐   │
│  │  Redis Cache   │  │  File Storage  │  │  Email Service │  │  External APIs │   │
│  │  (Optional)    │  │  (AWS S3/Local)│  │  (SendGrid)    │  │  (Google OAuth)│   │
│  │  - Session     │  │  - Uploads     │  │  - Notifications│  │  - Auth       │   │
│  │  - Queue       │  │  - Static Files│  │  - Verification│  │                │   │
│  └────────────────┘  └────────────────┘  └────────────────┘  └────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 2. Data Flow Diagram - Complete Request Lifecycle
```
sequenceDiagram
    participant Browser as 🌐 Browser
    participant React as ⚛️ React App
    participant Router as 🛣️ TanStack Router
    participant Store as 🗄️ Zustand Store
    participant Axios as 📡 Axios Client
    participant NestJS as 🚀 NestJS API
    participant Guard as 🛡️ Auth Guard
    participant Service as 💼 Service Layer
    participant Repo as 📚 Repository
    participant DB as 🐘 PostgreSQL

    Browser->>React: User navigates to /course
    React->>Router: Route change detected
    Router->>Guard: Check authentication
    Guard->>Store: Get auth token
    Store-->>Guard: Token exists ✓
    Guard-->>Router: Authorized
    Router->>React: Render Course component
    
    React->>Axios: GET /api/courses
    Note over Axios: Add Bearer token to header
    Axios->>NestJS: HTTP Request + JWT
    
    NestJS->>Guard: JWT Auth Guard
    Guard->>Guard: Validate token signature
    Guard->>Guard: Decode payload
    Guard-->>NestJS: User authenticated ✓
    
    NestJS->>Service: courseService.findAll()
    Service->>Service: Apply business logic
    Service->>Repo: courseRepository.find()
    Repo->>DB: SELECT * FROM courses
    DB-->>Repo: Course records
    Repo-->>Service: Course entities
    Service->>Service: Transform data
    Service-->>NestJS: Course DTOs
    
    NestJS-->>Axios: HTTP 200 + JSON data
    Axios->>Store: Update course state
    Store-->>React: Trigger re-render
    React-->>Browser: Display courses
```

## 3. Module Dependency Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND MODULES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  main.tsx (Entry Point)                                         │
│       │                                                          │
│       ├─► app/index.tsx (App Component)                         │
│       │       │                                                  │
│       │       ├─► GoogleOAuthProvider (Auth Wrapper)            │
│       │       │                                                  │
│       │       └─► TanStack Router (Route Provider)              │
│       │               │                                          │
│       │               ├─► ~__root.tsx                           │
│       │               │                                          │
│       │               ├─► ~login/~index.tsx                     │
│       │               │       │                                  │
│       │               │       ├─► useAuthStore()                │
│       │               │       ├─► useUserStore()                │
│       │               │       └─► Axios (Login API)             │
│       │               │                                          │
│       │               └─► ~_private.tsx (Protected Routes)      │
│       │                       │                                  │
│       │                       ├─► ~course/~$id/~index.tsx       │
│       │                       ├─► ~system-monitoring/~index.tsx │
│       │                       └─► ... (Other features)          │
│       │                                                          │
│       ├─► stores/ (State Management)                            │
│       │       ├─► auth.store.ts                                 │
│       │       ├─► user.store.ts                                 │
│       │       └─► global-loading.store.ts                       │
│       │                                                          │
│       ├─► utils/ (Utilities)                                    │
│       │       ├─► custom-axios.ts (HTTP Client)                 │
│       │       ├─► storage.ts (LocalStorage wrapper)             │
│       │       └─► logger.ts                                     │
│       │                                                          │
│       └─► components/ (Reusable UI)                             │
│               ├─► icons/                                         │
│               ├─► button/                                        │
│               └─► study-layout/                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND MODULES                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  main.ts (Bootstrap)                                            │
│       │                                                          │
│       ├─► NestFactory.create(AppModule)                         │
│       ├─► Global Middleware (CORS, Helmet, etc.)                │
│       ├─► Global Pipes (ValidationPipe)                         │
│       ├─► Global Filters (ExceptionFilter)                      │
│       └─► app.listen(3001)                                      │
│                                                                  │
│  app.module.ts                                                  │
│       │                                                          │
│       ├─► ConfigModule.forRoot() (Environment)                  │
│       │                                                          │
│       ├─► TypeOrmModule.forRoot() (Database)                    │
│       │       │                                                  │
│       │       └─► Connection Pool → PostgreSQL                  │
│       │                                                          │
│       ├─► AuthModule                                            │
│       │       ├─► AuthController                                │
│       │       │       ├─► POST /api/auth/login                  │
│       │       │       ├─► POST /api/auth/register               │
│       │       │       └─► POST /api/auth/refresh                │
│       │       │                                                  │
│       │       ├─► AuthService                                   │
│       │       │       ├─► validateUser()                        │
│       │       │       ├─► login()                               │
│       │       │       ├─► generateToken()                       │
│       │       │       └─► Uses: UsersService, JwtService        │
│       │       │                                                  │
│       │       ├─► JwtStrategy (Passport)                        │
│       │       └─► JwtAuthGuard                                  │
│       │                                                          │
│       ├─► UsersModule                                           │
│       │       ├─► UsersController                               │
│       │       │       ├─► GET /api/users                        │
│       │       │       ├─► GET /api/users/:id                    │
│       │       │       ├─► POST /api/users                       │
│       │       │       ├─► PATCH /api/users/:id                  │
│       │       │       └─► DELETE /api/users/:id                 │
│       │       │                                                  │
│       │       ├─► UsersService                                  │
│       │       │       └─► Uses: UserRepository                  │
│       │       │                                                  │
│       │       ├─► UserRepository                                │
│       │       │       └─► Extends: Repository<User>             │
│       │       │                                                  │
│       │       └─► User Entity (TypeORM)                         │
│       │               └─► Maps to: users table                  │
│       │                                                          │
│       ├─► CoursesModule                                         │
│       │       ├─► CoursesController                             │
│       │       ├─► CoursesService                                │
│       │       ├─► CourseRepository                              │
│       │       └─► Course Entity                                 │
│       │                                                          │
│       └─► ... (Other feature modules)                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 4. Technology Stack - Complete Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND STACK                                │
├─────────────────────────────────────────────────────────────────┤
│  Core Framework                                                  │
│    ├─ React 19.0.0                                              │
│    ├─ TypeScript 5.x                                            │
│    └─ Vite 5.x (Build Tool)                                     │
│                                                                  │
│  Routing & Navigation                                           │
│    └─ @tanstack/react-router ^1.133.22                         │
│                                                                  │
│  State Management                                               │
│    ├─ Zustand ^5.0.3 (Client State)                            │
│    └─ @tanstack/react-query ^5.90.5 (Server State)             │
│                                                                  │
│  HTTP Client                                                    │
│    └─ Axios ^1.8.3                                              │
│                                                                  │
│  UI Framework & Styling                                         │
│    ├─ Tailwind CSS ^3.x                                         │
│    ├─ Material-UI (MUI) ^6.4.7                                  │
│    ├─ Framer Motion ^12.15.0                                    │
│    └─ Headless UI ^2.2.9                                        │
│                                                                  │
│  Forms & Validation                                             │
│    ├─ Formik ^2.4.6                                             │
│    ├─ Yup ^1.6.1                                                │
│    └─ Zod ^3.24.2                                               │
│                                                                  │
│  Authentication                                                  │
│    └─ @react-oauth/google ^0.12.1                              │
│                                                                  │
│  Charts & Visualization                                         │
│    ├─ ApexCharts ^5.3.6                                         │
│    ├─ Recharts ^3.4.1                                           │
│    └─ Lottie React ^2.4.1                                       │
│                                                                  │
│  Utilities                                                       │
│    ├─ Lodash ^4.17.21                                           │
│    ├─ Day.js ^1.11.13                                           │
│    ├─ DOMPurify ^3.2.5                                          │
│    └─ React Toastify ^11.0.5                                    │
│                                                                  │
│  Development Tools                                              │
│    ├─ ESLint ^9.22.0                                            │
│    ├─ Prettier                                                  │
│    ├─ Husky ^9.1.7                                              │
│    └─ Vitest (Testing)                                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND STACK                                 │
├─────────────────────────────────────────────────────────────────┤
│  Core Framework                                                  │
│    ├─ NestJS ^10.x                                              │
│    ├─ Node.js 18+ / 20+                                         │
│    ├─ TypeScript 5.x                                            │
│    └─ Express / Fastify                                         │
│                                                                  │
│  ORM & Database                                                 │
│    ├─ TypeORM ^0.3.x / Prisma ^5.x                             │
│    ├─ PostgreSQL 14+                                            │
│    └─ pg (PostgreSQL driver)                                    │
│                                                                  │
│  Authentication & Security                                       │
│    ├─ @nestjs/passport                                          │
│    ├─ @nestjs/jwt                                               │
│    ├─ passport-jwt                                              │
│    ├─ bcrypt / bcryptjs                                         │
│    ├─ helmet                                                    │
│    └─ class-validator & class-transformer                       │
│                                                                  │
│  API Documentation                                              │
│    └─ @nestjs/swagger (OpenAPI)                                │
│                                                                  │
│  Configuration                                                   │
│    └─ @nestjs/config (dotenv)                                  │
│                                                                  │
│  Testing                                                         │
│    ├─ Jest                                                      │
│    ├─ Supertest (E2E)                                           │
│    └─ @nestjs/testing                                           │
│                                                                  │
│  Logging & Monitoring                                           │
│    ├─ Winston / Pino                                            │
│    └─ @nestjs/logger                                            │
│                                                                  │
│  Optional Services                                              │
│    ├─ Redis (Caching)                                           │
│    ├─ Bull / BullMQ (Queue)                                     │
│    ├─ Socket.io (WebSocket)                                     │
│    └─ Multer (File Upload)                                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE & INFRASTRUCTURE                     │
├─────────────────────────────────────────────────────────────────┤
│  Database                                                        │
│    └─ PostgreSQL 14+ (Primary)                                  │
│                                                                  │
│  Caching (Optional)                                             │
│    └─ Redis 7.x                                                 │
│                                                                  │
│  File Storage                                                   │
│    ├─ Local File System                                         │
│    └─ AWS S3 / MinIO                                            │
│                                                                  │
│  Containerization                                               │
│    └─ Docker & Docker Compose                                   │
│                                                                  │
│  Version Control                                                │
│    └─ Git / GitHub                                              │
└─────────────────────────────────────────────────────────────────┘
```

## 5. Deployment Architecture
```
┌─────────────────────────────────────────────────────────────────────┐
│                     PRODUCTION DEPLOYMENT                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │              INTERNET / CDN                                 │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │   CloudFlare / AWS CloudFront                        │  │    │
│  │  │   - Static Asset Caching                             │  │    │
│  │  │   - DDoS Protection                                   │  │    │
│  │  │   - SSL/TLS Termination                              │  │    │
│  │  └────────────────────┬─────────────────────────────────┘  │    │
│  └───────────────────────┼────────────────────────────────────┘    │
│                          │                                          │
│  ┌───────────────────────▼────────────────────────────────────┐    │
│  │           LOAD BALANCER (Nginx / AWS ALB)                  │    │
│  │   - SSL Termination                                        │    │
│  │   - Load Distribution                                      │    │
│  │   - Health Checks                                          │    │
│  │   - Rate Limiting                                          │    │
│  └────────────────────┬───────────────────────────────────────┘    │
│                       │                                             │
│         ┌─────────────┴─────────────┬──────────────┐               │
│         │                           │              │               │
│  ┌──────▼─────────┐    ┌───────────▼───────┐  ┌──▼──────────┐    │
│  │  Frontend      │    │  Frontend         │  │  Frontend   │    │
│  │  Container 1   │    │  Container 2      │  │  Container N│    │
│  │  (Nginx)       │    │  (Nginx)          │  │  (Nginx)    │    │
│  │  ┌──────────┐  │    │  ┌──────────┐     │  │             │    │
│  │  │React App │  │    │  │React App │     │  │  ...        │    │
│  │  │(Static)  │  │    │  │(Static)  │     │  │             │    │
│  │  └──────────┘  │    │  └──────────┘     │  │             │    │
│  │  Port 80/443   │    │  Port 80/443      │  │             │    │
│  └────────────────┘    └───────────────────┘  └─────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              API GATEWAY (Optional)                         │  │
│  │   - Request Routing                                         │  │
│  │   - API Versioning                                          │  │
│  │   - Authentication Gateway                                  │  │
│  └────────────────────┬────────────────────────────────────────┘  │
│                       │                                            │
│         ┌─────────────┴─────────────┬──────────────┐              │
│         │                           │              │              │
│  ┌──────▼─────────┐    ┌───────────▼───────┐  ┌──▼──────────┐   │
│  │  Backend       │    │  Backend          │  │  Backend    │   │
│  │  Container 1   │    │  Container 2      │  │  Container N│   │
│  │  (NestJS)      │    │  (NestJS)         │  │  (NestJS)   │   │
│  │  Port 3001     │    │  Port 3001        │  │  Port 3001  │   │
│  └────────┬───────┘    └───────┬───────────┘  └──┬──────────┘   │
│           │                    │                  │              │
│           └────────────────────┴──────────────────┘              │
│                                │                                  │
│  ┌─────────────────────────────▼──────────────────────────────┐  │
│  │              DATABASE CLUSTER                              │  │
│  │  ┌───────────────────────────────────────────────────────┐ │  │
│  │  │   PostgreSQL Master (Read/Write)                      │ │  │
│  │  │   - Port 5432                                         │ │  │
│  │  │   - Primary Database                                  │ │  │
│  │  └────────────────────┬──────────────────────────────────┘ │  │
│  │                       │                                    │  │
│  │                       │ Streaming Replication              │  │
│  │                       │                                    │  │
│  │  ┌────────────────────▼──────────────────────────────────┐ │  │
│  │  │   PostgreSQL Replica 1 (Read Only)                    │ │  │
│  │  │   PostgreSQL Replica 2 (Read Only)                    │ │  │
│  │  │   - Load Distribution for SELECT queries              │ │  │
│  │  │   - Automatic Failover                                │ │  │
│  │  └───────────────────────────────────────────────────────┘ │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              CACHING LAYER (Redis Cluster)                  │  │
│  │   - Session Store                                           │  │
│  │   - Query Cache                                             │  │
│  │   - Rate Limiting                                           │  │
│  │   - Bull Queue (Background Jobs)                            │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              FILE STORAGE                                   │  │
│  │   AWS S3 / MinIO / Azure Blob Storage                       │  │
│  │   - User Uploads                                            │  │
│  │   - Static Assets                                           │  │
│  │   - Course Materials                                        │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              MONITORING & LOGGING                           │  │
│  │   ├─ Application Logs (Winston/Pino → ELK Stack)           │  │
│  │   ├─ Metrics (Prometheus + Grafana)                        │  │
│  │   ├─ APM (New Relic / Datadog)                             │  │
│  │   └─ Error Tracking (Sentry)                               │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```
## 🏗️ System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER                              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           React SPA (Port 80)                            │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  TanStack Router + Zustand + TanStack Query        │  │  │
│  │  └──────────────────┬─────────────────────────────────┘  │  │
│  │                     │ Axios (HTTP Client)                │  │
│  │                     │ JWT Token Authentication           │  │
│  └─────────────────────┼────────────────────────────────────┘  │
└─────────────────────────┼────────────────────────────────────────┘
                          │
                          │ REST API (JSON)
                          │
┌─────────────────────────▼────────────────────────────────────────┐
│                   APPLICATION LAYER                              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         NestJS API Server (Port 3001)                    │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  Controllers → Services → Repositories             │  │  │
│  │  │  Guards (JWT) → Pipes → Filters                    │  │  │
│  │  └──────────────────┬─────────────────────────────────┘  │  │
│  │                     │ TypeORM                            │  │
│  └─────────────────────┼────────────────────────────────────┘  │
└─────────────────────────┼────────────────────────────────────────┘
                          │
                          │ SQL/TCP
                          │
┌─────────────────────────▼────────────────────────────────────────┐
│                     DATABASE LAYER                               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         PostgreSQL Database (Port 5432)                  │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  users | courses | orders | submissions | ...      │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
Frontend (React)           Backend (NestJS)          Database
─────────────────         ──────────────────        ──────────
┌─────────────┐           ┌──────────────┐         ┌─────────┐
│   Pages     │──────────→│ Controllers  │────────→│ Tables  │
│  (~login/)  │  HTTP     │ (Auth, User) │  SQL    │ (users) │
│  (~course/) │  REST     │ (Course)     │  Query  │(courses)│
└─────────────┘           └──────────────┘         └─────────┘
      │                          │
      ↓                          ↓
┌─────────────┐           ┌──────────────┐
│   Stores    │           │   Services   │
│  (Zustand)  │           │  (Business   │
│  (Auth,     │           │   Logic)     │
│   User)     │           └──────────────┘
└─────────────┘                  │
      │                          ↓
      ↓                    ┌──────────────┐
┌─────────────┐           │ Repositories │
│   Axios     │           │  (TypeORM)   │
│  (HTTP)     │           └──────────────┘
└─────────────┘
```

---

## 🛠️ Technology Stack

### Frontend

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | React | 19.0.0 | UI Library |
| **Language** | TypeScript | 5.x | Type Safety |
| **Build Tool** | Vite | 5.x | Fast Build & HMR |
| **Routing** | TanStack Router | ^1.133.22 | File-based Routing |
| **State Management** | Zustand | ^5.0.3 | Client State |
| **Server State** | TanStack Query | ^5.90.5 | Server Cache |
| **HTTP Client** | Axios | ^1.8.3 | API Communication |
| **Styling** | Tailwind CSS | ^3.x | Utility-first CSS |
| **UI Components** | Material-UI | ^6.4.7 | Component Library |
| **Animation** | Framer Motion | ^12.15.0 | Animations |
| **Forms** | Formik + Yup | ^2.4.6 / ^1.6.1 | Form Management |
| **Charts** | ApexCharts, Recharts | ^5.3.6 / ^3.4.1 | Data Visualization |
| **Authentication** | Google OAuth | ^0.12.1 | Social Login |

### Backend

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | NestJS | 10.x | Node.js Framework |
| **Runtime** | Node.js | 18+ / 20+ | JavaScript Runtime |
| **Language** | TypeScript | 5.x | Type Safety |
| **ORM** | TypeORM / Prisma | ^0.3.x / ^5.x | Database ORM |
| **Database** | PostgreSQL | 14+ | Relational Database |
| **Authentication** | Passport + JWT | - | Auth Strategy |
| **Validation** | class-validator | - | DTO Validation |
| **Security** | Helmet, bcrypt | - | Security Headers |
| **Documentation** | Swagger/OpenAPI | - | API Docs |
| **Testing** | Jest, Supertest | - | Unit & E2E Tests |

### DevOps & Tools

- **Version Control**: Git, GitHub
- **Package Manager**: Yarn (Frontend), npm (Backend)
- **Code Quality**: ESLint, Prettier
- **Git Hooks**: Husky, lint-staged
- **Containerization**: Docker, Docker Compose
- **CI/CD**: GitHub Actions (recommended)

---

## 📁 Project Structure

```
SOFTWARE-ENGINEER-BTL/
├── frontend/                          # React Frontend Application
│   ├── public/                        # Static assets
│   │   └── mockupUsers.json          # Mock data for development
│   ├── src/
│   │   ├── app/                      # App component & providers
│   │   │   └── index.tsx
│   │   ├── assets/                   # Images, animations, icons
│   │   │   ├── animations/
│   │   │   └── bachkhoa.png
│   │   ├── components/               # Reusable UI components
│   │   │   ├── button/
│   │   │   │   └── google-button.tsx
│   │   │   ├── data/                 # Mock data
│   │   │   ├── icons/                # Icon components (100+ icons)
│   │   │   └── study-layout/
│   │   ├── config/                   # Configuration files
│   │   │   └── env.ts
│   │   ├── features/                 # Feature-based modules
│   │   │   ├── ~__root.tsx           # Root layout
│   │   │   ├── ~_private.tsx         # Protected routes wrapper
│   │   │   ├── ~index.tsx            # Home page
│   │   │   ├── ~login/               # Login feature
│   │   │   │   ├── ~index.tsx
│   │   │   │   └── wave.tsx
│   │   │   └── ~_private/            # Protected features
│   │   │       ├── ~course/          # Course management
│   │   │       │   └── ~$id/
│   │   │       │       ├── ~index.tsx
│   │   │       │       └── components/
│   │   │       └── ~system-monitoring/ # System dashboard
│   │   │           └── ~index.tsx
│   │   ├── helpers/                  # Helper utilities
│   │   │   ├── handle-axios-error.ts
│   │   │   └── storage.ts
│   │   ├── hooks/                    # Custom React hooks
│   │   │   └── use-lock-body-scroll.ts
│   │   ├── stores/                   # Zustand state stores
│   │   │   ├── auth.store.ts
│   │   │   ├── user.store.ts
│   │   │   ├── global-loading.store.ts
│   │   │   └── index.ts
│   │   ├── types/                    # TypeScript type definitions
│   │   │   ├── user.type.ts
│   │   │   ├── book.type.ts
│   │   │   ├── screen-size.ts
│   │   │   └── index.ts
│   │   ├── utils/                    # Utility functions
│   │   │   ├── custom-axios.ts       # Axios instance config
│   │   │   ├── logger.ts
│   │   │   ├── storage.ts
│   │   │   ├── time.ts
│   │   │   └── vnu-library.ts
│   │   ├── main.tsx                  # App entry point
│   │   ├── index.css                 # Global styles
│   │   ├── routeTree.gen.ts         # Generated route tree
│   │   └── vite-env.d.ts
│   ├── eslint.config.js
│   ├── vite.config.ts                # Vite configuration
│   ├── tailwind.config.cjs           # Tailwind CSS config
│   ├── tsconfig.json                 # TypeScript config
│   ├── package.json
│   └── README.md
│
├── backend/                           # Node.js API backend
│   ├── server.mjs                    # HTTP server entry point
│   ├── routes.mjs                    # REST route handlers
│   ├── http.mjs                      # JSON response/request helpers
│   ├── config.mjs                    # Port and persistence paths
│   ├── domain/backend-data.mjs       # Domain mapping and permissions
│   ├── data/storage.mjs              # Serialized JSON persistence
│   ├── data/seeds.mjs                # Initial users and domain data
│   ├── data/*.json                   # Runtime data files
│   └── package.json
│
├── docker-compose.yml                # Docker services configuration
├── .gitignore
├── package.json                      # Root package.json
└── README.md                         # This file
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your system:

- **Node.js**: v20.x or later ([Download](https://nodejs.org/))
- **Yarn**: v1.22.x or later ([Install](https://yarnpkg.com/))
- **Git**: Latest version ([Download](https://git-scm.com/))

Optional:
- **Docker** & **Docker Compose** (for containerized setup)

---

### 🎨 Frontend Setup

#### 1. Clone the repository

```bash
git clone https://github.com/Tung-Quan/SOFTWARE-ENGINEER-BTL.git
cd SOFTWARE-ENGINEER-BTL
```

#### 2. Navigate to frontend directory

```bash
cd frontend
```

#### 3. Install dependencies

```bash
yarn install
```

#### 4. Environment Configuration

Create a `.env` file in the `frontend` directory:

```env
# API Configuration (Vite proxies /api to the Node backend on port 4000)
VITE_BACKEND_URL=/api

# Google OAuth
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here

# App Configuration
VITE_APP_NAME=HCMUT Course Management
VITE_APP_ENV=development
```

#### 5. Start development server

```bash
yarn dev
```

The frontend will be available at: **http://localhost:80**

#### 6. Build for production

```bash
yarn build
```

#### 7. Preview production build

```bash
yarn preview
```

#### Other useful commands

```bash
# Linting
yarn lint

# Type checking
yarn check-types

# Generate API client (if using OpenAPI)
yarn codegen
```

---

### ⚙️ Backend Setup

The backend is a dependency-free Node.js HTTP API. It stores mutable demo data in `backend/data/*.json` so the frontend can be developed without an external database.

#### 1. Start the backend

```bash
npm run backend
```

For watch mode:

```bash
npm run backend:watch
```

The API listens at **http://127.0.0.1:4000** by default. Set `BACKEND_PORT` to use another port.

#### 2. Run backend tests

npm run backend:test
```

---

### 🗄️ Database Setup

No external database is required for this development backend. The JSON collections in `backend/data/` are created from `backend/data/seeds.mjs` when missing and updated by the API.

---

## 💻 Development

### Development Workflow

1. **Create a new feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and commit:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

3. **Push to remote**:
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create a Pull Request** on GitHub

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

Example:
```bash
git commit -m "feat(auth): implement Google OAuth login"
git commit -m "fix(course): resolve enrollment bug"
git commit -m "docs(readme): update installation steps"
```

### Code Style

- **Frontend**: Uses ESLint + Prettier
- **Backend**: Uses ESLint + Prettier
- Auto-formatting on save (recommended VSCode settings)
- Pre-commit hooks via Husky

---

## 🚢 Deployment

### Frontend Deployment

#### Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel
```

#### Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
cd frontend
yarn build
netlify deploy --prod --dir=dist
```

#### Deploy to Firebase Hosting

```bash
cd frontend
yarn build
firebase deploy
```

### Backend Deployment

#### Deploy to Heroku

```bash
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev

# Deploy
git push heroku main
```

#### Deploy to AWS EC2

1. Set up EC2 instance
2. Install Node.js and PostgreSQL
3. Clone repository
4. Set environment variables
5. Use PM2 for process management:

```bash
npm install -g pm2
pm2 start dist/main.js --name "btl-api"
pm2 save
pm2 startup
```

#### Docker Deployment

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start containers
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📚 API Documentation

### Base URL

```
Development: http://127.0.0.1:4000/api
Production: configure the deployed API URL with VITE_BACKEND_URL
```

### Authentication Endpoints

```http
POST /api/auth/login
```

### Health Endpoint

```http
GET    /api/health
```

### Courses Endpoints

```http
GET    /api/courses
GET    /api/courses/:id/detail
GET    /api/courses/:id/submissions
PATCH  /api/submissions/:id
GET/POST /api/sessions
PATCH/DELETE /api/sessions/:id
GET/POST /api/registrations
PATCH/DELETE /api/registrations/:id
GET/POST /api/course-requests
PATCH/DELETE /api/course-requests/:id
```


---

## 🧪 Testing

### Frontend Tests

```bash
cd frontend

# Run unit tests
yarn test

# Run with coverage
yarn test:coverage

# Run E2E tests
yarn test:e2e
```

### Backend Tests

```bash
cd backend

# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:cov
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'feat: add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Contribution Guidelines

- Write clear, concise commit messages
- Update documentation as needed
- Add tests for new features
- Ensure all tests pass before submitting PR
- Follow the existing code style

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

**HCMUT Software Engineering Team**

- **Project Lead**: [Your Name]
- **Frontend Developer**: [Name]
- **Backend Developer**: [Name]
- **Database Administrator**: [Name]

---

## 📧 Contact

For questions or support, please contact:

- **Email**: your.email@hcmut.edu.vn
- **GitHub Issues**: [Create an issue](https://github.com/Tung-Quan/SOFTWARE-ENGINEER-BTL/issues)
- **University**: Ho Chi Minh City University of Technology

---

## 🙏 Acknowledgments

- HCMUT Software Engineering Course
- All contributors and maintainers
- Open source community

---

## 📈 Project Status

🚧 **Status**: Active Development

### Roadmap

- [x] Frontend base setup
- [x] UI component library
- [x] Authentication flow
- [x] Course management UI
- [ ] Backend API development
- [ ] Database implementation
- [ ] Real-time features
- [ ] Testing coverage
- [ ] Production deployment

---

**Made with ❤️ by HCMUT Students**
