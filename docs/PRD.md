# FixItNow: AI-Enabled Civic Grievance Platform

## Product Requirements Document (PRD)

### 1. Product Overview
FixItNow is an AI-enabled civic grievance platform connecting citizens with their designated Municipal Corporation. Citizens use a mobile-first React application packaged with Capacitor for Android, while municipal staff and the Master Government Admin use desktop-first web portals.

AI reduces reporting friction and manual triage: it understands natural-language complaints, predicts category, detects likely duplicates, recommends priority, and extracts structured information. Official government rules remain authoritative for jurisdiction, permissions, SLA, and final administrative decisions.

### 2. Goals & Scope
- **Simple reporting**: Citizens describe the issue naturally; unnecessary forms are eliminated.
- **Correct routing**: Each Municipal Corporation registers its service PIN codes. The Problem Location PIN determines the municipal dashboard server-side.
- **Less duplication**: Detect nearby and similar active complaints before creating redundant tickets.
- **Faster triage**: AI recommends category, priority, and department.
- **Accountability**: Assignments, status changes, overrides, and resolutions are fully auditable.
- **Government visibility**: Master Admin monitors municipalities, SLA, backlog, and escalations.

### 3. Users & Roles
- **Citizen**: Reports, tracks, comments, verifies, rates, and reopens complaints.
- **Municipal Admin**: Reviews, assigns, manages SLA, verifies resolution, and resolves local municipal complaints within strict municipality isolation.
- **Field Officer**: Operational mobile/responsive web view to accept work, update progress, and upload resolution evidence.
- **Master Admin / Government**: Creates municipalities, configures PIN coverage, monitors all municipalities globally, handles unmapped PIN routing reviews, and audits AI/human overrides.

### 4. Municipality Identification & PIN-Code Routing
- The Master Admin creates Municipal Corporations and registers all PIN codes served.
- Citizen enters the **Problem Location PIN Code** (where the issue exists, not necessarily their home PIN).
- The server validates the PIN against `municipality_pincodes` and derives `municipality_id` server-side.
- Invalid or unmapped PINs enter a `routing-review` queue instead of being silently misrouted.
- A client is never trusted to choose its own municipality.

### 5. Complaint Lifecycle State Transitions
`SUBMITTED` -> `UNDER_REVIEW` / `REJECTED`  
`UNDER_REVIEW` -> `ASSIGNED` / `REJECTED`  
`ASSIGNED` -> `IN_PROGRESS` / `ON_HOLD`  
`IN_PROGRESS` -> `RESOLUTION_SUBMITTED` / `ON_HOLD`  
`RESOLUTION_SUBMITTED` -> `VERIFICATION`  
`VERIFICATION` -> `RESOLVED` / `REOPENED`  
`RESOLVED` -> `CLOSED` / `REOPENED`  
`CLOSED` -> `REOPENED` (only under official policy window)  
