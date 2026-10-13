# FixItNow: API Design Reference

All endpoints prefix: `/api`

### 1. Public & Citizen Endpoints
- `POST /api/complaints`: Create complaint, validate PIN, run AI triage pipeline.
- `GET /api/complaints/:id`: Get authorized complaint details and timeline.
- `GET /api/complaints/citizen/my-reports`: List complaints filed by the authenticated citizen.
- `POST /api/complaints/:id/verify`: Citizen confirms resolution, submits 1-5 rating & feedback, or reopens ticket.
- `GET /api/municipalities/by-pincode/:pincode`: Server-side lookup resolving `municipality_id`, name, and ward suggestions from Problem Location PIN.
- `POST /api/ai/pre-analyze`: Analyze complaint draft (category, extraction, duplicate check, priority) before final submission.

### 2. Municipal Admin Endpoints
- `GET /api/municipal/complaints`: List municipality-isolated complaints with filters (status, category, priority, ward, SLA risk).
- `GET /api/municipal/overview`: KPI counters (Total, Under Review, In Progress, SLA Risk, Resolved), volume trends, status breakdown.
- `PATCH /api/municipal/complaints/:id/assign`: Assign department, field officer, and due date.
- `PATCH /api/municipal/complaints/:id/status`: Update status following strict lifecycle rules.
- `POST /api/municipal/complaints/:id/ai-override`: Accept, reject, or modify AI category/priority with documented reason.
- `POST /api/municipal/complaints/:id/link-duplicate`: Link ticket as duplicate or mark to keep separate.
- `POST /api/municipal/complaints/:id/verify-resolution`: Verify resolution submitted by field officer.
- `GET /api/municipal/departments`: List departments with active workloads and officer counts.
- `GET /api/municipal/officers`: List field officers with assigned caseloads.
- `GET /api/municipal/sla-at-risk`: List tickets nearing or exceeding SLA limits.

### 3. Field Officer Endpoints
- `GET /api/officer/assignments`: List complaints assigned to the logged-in field officer.
- `PATCH /api/officer/complaints/:id/status`: Transition complaint (`IN_PROGRESS`, `ON_HOLD`).
- `POST /api/officer/complaints/:id/resolution`: Submit resolution notes and evidence media.

### 4. Master Government Admin Endpoints
- `GET /api/master/municipalities`: List all Municipal Corporations.
- `POST /api/master/municipalities`: Create a new Municipal Corporation.
- `PATCH /api/master/municipalities/:id`: Edit or deactivate Municipal Corporation.
- `GET /api/master/pincodes`: List all PIN-to-Municipality mappings.
- `POST /api/master/municipalities/:id/pincodes`: Register PIN codes served by a municipality.
- `GET /api/master/routing-queue`: Complaints submitted with unmapped/invalid PINs requiring jurisdiction review.
- `POST /api/master/routing-queue/:id/assign-municipality`: Manually route an unmapped complaint to a municipality.
- `GET /api/master/analytics/global`: Multi-municipality overview and SLA compliance benchmarks.
- `GET /api/master/audit-logs`: Global immutable audit trail of status changes and overrides.
