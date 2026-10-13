# FixItNow: AI-Enabled Civic Grievance & Municipal Redressal Platform

FixItNow is a production-grade, AI-enabled civic grievance redressal and municipal dispatch platform architected strictly according to the authoritative **Product Requirements Document (PRD)** and **Technical Requirements Document (TRD)**.

The platform connects citizens directly with their designated Municipal Corporation using **authoritative Problem Location PIN Code routing**, backed by an assistive AI layer for category prediction, priority recommendation, and duplicate screening, while strictly maintaining deterministic government jurisdiction, role-based access control, masked Aadhaar data governance, and an immutable audit trail.

---

## 🏛️ System Architecture & Portals

FixItNow is organized into four full-stack tiers:

```
                                    +-----------------------------------------+
                                    |         Citizen Mobile App              |
                                    |  (Phone OTP + Masked Aadhaar Onboard)   |
                                    +--------------------+--------------------+
                                                         |
                                                         v
                                    +-----------------------------------------+
                                    |        Unified Staff Login Portal       |
                                    |       (Email + Password, NO Role Dropdown)|
                                    +----+-------------------+----------------+
                                         |                   |
                       +-----------------+                   +----------------+
                       v                                                      v
      +--------------------------------+                     +---------------------------------+
      |  Municipal Admin Command Center |                     | Dedicated Field Officer App     |
      |  (Gorakhpur GMC Data Isolation)|                     | (Mobile-first Task Cards & KPIs)|
      +--------------------------------+                     +---------------------------------+
                       ^                                                      ^
                       |                                                      |
                       +-----------------+                   +----------------+
                                         |                   |
                                    +----+-------------------+----------------+
                                    |     Master Government Admin Portal      |
                                    |   (Municipalities CRUD, Unmapped Queue) |
                                    +--------------------+--------------------+
                                                         |
                                                         v
                                    +-----------------------------------------+
                                    |      Express API & Routing Engine       |
                                    |   (JWT / Session Auth + PIN Resolution) |
                                    +--------------------+--------------------+
                                                         |
                                                         v
                                    +-----------------------------------------+
                                    |     Supabase PostgreSQL & Auth         |
                                    |   (15 Tables, RLS, Triggers, Storage)   |
                                    +-----------------------------------------+
```

### 1. Citizen Mobile Application (`client/`)
- **URL**: `http://localhost:5173`
- **Tech Stack**: React 18, Vite, Lucide Icons, Vanilla CSS design tokens.
- **Theme**: Dark Charcoal (`#0B0F12`, `#18202A`) with Electric Lime (`#D4FF00`) accents.
- **Authentication**: Phone number only -> Random 4-digit OTP -> First-time onboarding (Name, Photo, masked Aadhaar `XXXX-XXXX-1234`).
- **Grievance Submission**: Conversational intake with natural language description, voice input simulation, and photo uploads.
- **Problem Location PIN**: Authoritative 6-digit PIN where the issue exists (not citizen home address).
- **Assistive AI Triage**: Animated scan radar, category detection, confidence score, and priority reasoning.
- **Lifecycle Tracking**: Real-time vertical timeline stepper (`SUBMITTED` ➔ `ASSIGNED` ➔ `IN_PROGRESS` ➔ `RESOLUTION_SUBMITTED` ➔ `VERIFICATION` ➔ `RESOLVED` ➔ `CLOSED`).
- **Citizen Verification**: Review field officer proof photo, submit 1–5 star rating, or dispute/reopen grievance.

### 2. Unified Staff Login Portal (`admin-web/`)
- **URL**: `http://localhost:5174`
- **Single Login Page**: Email and Password inputs. **NO role dropdown** or selector.
- **Authoritative Resolution**: The backend verifies credentials against Supabase Auth, retrieves the trusted user record from the database `profiles` table, and securely establishes the role (`master_admin`, `municipal_admin`, or `field_officer`).

### 3. Municipal Admin Command Center (`admin-web/`)
- **Scope**: Strictly isolated to the admin's Municipal Corporation (e.g. *Gorakhpur Municipal Corporation*).
- **KPI Metrics**: Total Grievances, Needs Review, In Progress, SLA Risk, Resolved.
- **Complaint Queue**: Filterable by Status, Category, Priority, Ward, and Search Query.
- **Assignment & Dispatch**: Assign complaints to Department and active Field Officer with live workload counters.
- **Resolution Verification**: Review field officer before/after photo evidence and approve for citizen verification.
- **Department & Officer Management**: Add departments and recruit field officers with instant credential provisioning.

### 4. Dedicated Field Officer Mobile-first App (`admin-web/`)
- **Design**: Fully responsive, card-based mobile interface specifically built for on-ground officers (e.g. *Inspector Suresh Yadav*).
- **Today's Work KPIs**: Assigned, In Progress, Due Soon, Overdue, and Completed.
- **Action Workflow**:
  1. Open task card to view complaint description, location, and priority.
  2. Tap **"Start Work (Mark In-Progress)"** when arriving on site.
  3. Tap **"Submit Resolution Evidence"** to upload proof photo and repair notes.

### 5. Master Government Admin Portal (`admin-web/`)
- **National Oversight**: Global cross-municipality overview and aggregate metrics.
- **Municipalities CRUD**: Create new Municipal Corporations and provision their Municipal Admin accounts.
- **Unmapped PIN Routing Queue**: Complaints submitted with PIN codes not yet registered to any municipality are held in `ROUTING_REVIEW` for manual administrative allocation.

---

## 🗄️ Database Architecture & Supabase Setup

### Consolidated SQL Migration Script
The complete database schema, custom enums, PostgreSQL extensions, 15 relational tables, auto-updated timestamps, RLS policies, and realistic seed records are consolidated into a single executable file:
- **File**: [`supabase/fixitnow_complete.sql`](file:///s:/Fix-It-Now/supabase/fixitnow_complete.sql)

### How to Run Migration in Supabase:
1. Open your Supabase project dashboard: [https://supabase.com/dashboard/project/hfdxnsrusdbixrrlfcln](https://supabase.com/dashboard/project/hfdxnsrusdbixrrlfcln)
2. Navigate to the **SQL Editor** in the left sidebar.
3. Click **New Query**, paste the contents of `supabase/fixitnow_complete.sql`, and click **Run**.
4. All tables (`municipalities`, `wards`, `municipality_pincodes`, `profiles`, `departments`, `officers`, `complaints`, `complaint_media`, `complaint_timeline`, `complaint_duplicates`, `audit_logs`, `sla_policies`, `sla_breaches`, `notifications`, `ai_analyses`) will be created and seeded.

### Master Admin Account Setup Script
To create the authoritative Master Admin, Municipal Admin, and Field Officer accounts in Supabase Auth:
```bash
node scripts/setup-master-admin.js
```
This script uses the Supabase service role key to provision:
- **Master Admin**: `masteradmin@fixitnow.gov` / `FixItNow@2026!`
- **Municipal Admin (Gorakhpur)**: `admin.gmc@gorakhpurmc.gov.in` / `FixItNow@2026!`
- **Field Officer (Gorakhpur)**: `officer.roads@gorakhpurmc.gov.in` / `FixItNow@2026!`

---

## 🔑 Pre-Configured Test Credentials

| Role | Portal / URL | Email / Phone | Password / OTP | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Citizen** | `http://localhost:5173` | `+919876543210` | 4-Digit OTP (terminal / quick-fill) | Onboard with masked Aadhaar `XXXX-XXXX-4433` |
| **Master Admin** | `http://localhost:5174` | `masteradmin@fixitnow.gov` | `FixItNow@2026!` | National oversight, all municipalities |
| **Municipal Admin** | `http://localhost:5174` | `admin.gmc@gorakhpurmc.gov.in` | `FixItNow@2026!` | Gorakhpur Municipal Corporation (GMC-UP) |
| **Field Officer** | `http://localhost:5174` | `officer.roads@gorakhpurmc.gov.in` | `FixItNow@2026!` | Inspector Suresh Yadav (Roads Dept) |

---

## 🔒 Security & Data Isolation Architecture

1. **Deterministic PIN Routing**:
   - Every complaint requires an authoritative 6-digit Problem Location PIN.
   - Looked up against `municipality_pincodes`. E.g., `273001` deterministically routes to Gorakhpur Municipal Corporation.
   - Unmapped PINs (e.g. `999999`) automatically route to `is_routing_review: true`.

2. **Cross-Municipality Data Isolation**:
   - Backend middleware (`server/src/middleware/rbac.js:requireMunicipality`) inspects incoming requests.
   - If a Municipal Admin or Field Officer tries to read or modify records belonging to another Municipal Corporation, the request is immediately rejected with HTTP 403 `FORBIDDEN_CROSS_MUNICIPALITY`.

3. **Masked Aadhaar Governance**:
   - Aadhaar numbers are never logged in plaintext or passed to AI services.
   - Only masked values (`XXXX-XXXX-1234`) and cryptographic SHA-256 hashes are stored in the database.

4. **Immutable Audit Trail**:
   - Every lifecycle transition (`SUBMITTED`, `ASSIGNED`, `OFFICER_STATUS_UPDATE`, `RESOLUTION_SUBMITTED`, `RESOLUTION_VERIFIED`, `CITIZEN_CONFIRMED`) is permanently recorded in `audit_logs` with actor ID, role, old value, new value, reason, and timestamp.

---

## 🧪 Comprehensive Automated Test Suite

A complete integration test suite verifies the end-to-end lifecycle, authentication, security boundaries, and audit logging against the running backend.

### Run the Tests:
```bash
cd server
node test/api-test.js
```

### Test Suite Coverage (24/24 Verifications Passing):
- **Test 1**: System Health Check (`/api/health`)
- **Test 2**: Problem Location PIN 273001 Resolution -> Gorakhpur Municipal Corporation
- **Test 3**: Unmapped PIN 999999 Resolution -> `ROUTING_REVIEW` Queue
- **Test 4**: AI Pre-Analysis Engine (Prediction, Priority, Urgency scoring)
- **Test 5a**: Citizen Send OTP (`/api/auth/citizen/send-otp`)
- **Test 5b**: Citizen Verify OTP (`/api/auth/citizen/verify-otp`)
- **Test 5c**: Citizen Onboarding with Masked Aadhaar (`XXXX-XXXX-9900`)
- **Test 5d**: Authenticated Citizen Identity (`/api/auth/me`)
- **Test 6**: Staff Shared Login: Master Admin (`masteradmin@fixitnow.gov`) with authoritative DB role resolution
- **Test 7**: Master Admin Global Overview
- **Test 8**: Staff Shared Login: Municipal Admin (`admin.gmc@gorakhpurmc.gov.in`) with GMC profile
- **Test 9a**: Municipal Admin creates Department (`Sanitation & Solid Waste`)
- **Test 9b**: Municipal Admin recruits Field Officer (`Vikram Singh`)
- **Test 10**: Staff Shared Login: Field Officer (`officer.roads@gorakhpurmc.gov.in`)
- **Test 11a**: Citizen Submits Complaint with PIN 273001 -> Status: `SUBMITTED`
- **Test 11b**: Municipal Admin Queue contains submitted complaint
- **Test 11c**: Municipal Admin assigns Department & Officer -> Status: `ASSIGNED`
- **Test 11d**: Field Officer marks work in progress -> Status: `IN_PROGRESS`
- **Test 11e**: Field Officer submits resolution with photo evidence -> Status: `RESOLUTION_SUBMITTED`
- **Test 11f**: Municipal Admin verifies resolution -> Status: `VERIFICATION`
- **Test 11g**: Citizen confirms resolution with 5-star rating -> Status: `RESOLVED`
- **Test 12**: Comprehensive Audit Trail with complete chronological transitions
- **Test 13**: Cross-Municipality Isolation Enforcement (HTTP 403 `FORBIDDEN_CROSS_MUNICIPALITY`)
- **Test 14**: Role-Based Authorization Enforcement: Citizen blocked from Master Admin (HTTP 403 `FORBIDDEN`)

---

## 🚀 Running the Local Environment

### 1. API Server
```bash
cd server
npm install
npm run dev
# Running on http://localhost:5000
```

### 2. Citizen Mobile App
```bash
cd client
npm install
npm run dev
# Running on http://localhost:5173
```

### 3. Admin Command Center & Field Officer App
```bash
cd admin-web
npm install
npm run dev
# Running on http://localhost:5174
```
