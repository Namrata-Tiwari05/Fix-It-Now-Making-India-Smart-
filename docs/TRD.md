# FixItNow: Technical Requirements Document (TRD)

### 1. Technical Stack
- **Citizen UI**: React 18 + Vite + Capacitor (Android/Mobile Web)
- **Admin UI**: React 18 + Vite (Desktop-first 1440px+, Responsive)
- **Backend/API**: Node.js + Express.js (REST API, RBAC, State Machine, SLA Engine)
- **Authentication**: Supabase Auth + Server-side RBAC
- **Database**: Supabase PostgreSQL + `pgvector` for similarity search
- **File Storage**: Supabase Storage / Validated multipart upload
- **AI/ML Service**: Dedicated Python/FastAPI microservice + Node.js heuristic fallback
- **Maps/Location**: Problem Location PIN (authoritative), Device GPS & Leaflet dark tiles
- **Notifications**: Event-driven in-app notifications, push notifications architecture

### 2. Logical Data Flow
1. Citizen App -> Express API: submits description, Problem Location PIN, media, optional GPS.
2. Express API validates auth & performs PIN lookup against `municipality_pincodes`.
3. Server derives `municipality_id` (or flags `is_routing_review: true` if unmapped).
4. AI Orchestrator executes:
   - Category detection with confidence score
   - Information extraction (landmarks, roads, hazards)
   - Duplicate detection (geospatial filter + embedding cosine similarity)
   - Priority recommendation with transparent signal analysis
5. Citizen reviews AI recommendations and confirms submission.
6. Unique Complaint ID generated (e.g. `FIX-2026-XXXX`).
7. Ticket appears in matched Municipal Admin Dashboard.
8. Municipal Admin reviews AI insights, accepts/overrides with reason, assigns Department & Field Officer.
9. Field Officer receives assignment, marks `IN_PROGRESS`, and uploads before/after resolution evidence.
10. Municipal Admin verifies resolution evidence.
11. Citizen receives notification, inspects resolution proof, and confirms or reopens with feedback.
12. All changes, assignments, overrides, and resolutions write immutable rows to `audit_logs`.
