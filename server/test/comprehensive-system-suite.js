/**
 * FixItNow Comprehensive System Test Suite
 * Covers All 10 Functional Areas (A to J):
 *  - Area A: Citizen Authentication
 *  - Area B: Citizen Complaint Management
 *  - Area C: AI Image Detection & Triage
 *  - Area D: Multilingual NLP
 *  - Area E: Priority Engine & Safety Overrides
 *  - Area F: Hybrid Image-Text Matching
 *  - Area G: Duplicate Complaint Screening
 *  - Area H: Advisory Before/After Repair Verification
 *  - Area I: Officer & Municipal Admin Workflows (RBAC)
 *  - Area J: Backend, Database & Storage Resilience
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

const AI_BASE = 'http://127.0.0.1:8000';
const SERVER_BASE = 'http://localhost:5000';

const testInventory = [];
let passCount = 0;
let failCount = 0;

function recordTest(id, module, scenario, condition, expected, actual, details = '') {
  const status = condition ? 'PASS' : 'FAIL';
  if (condition) passCount++; else failCount++;
  
  testInventory.push({
    id,
    module,
    scenario,
    expected,
    actual,
    status,
    details
  });

  const color = condition ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}[${status}] ${id}\x1b[0m \x1b[1m[${module}]\x1b[0m ${scenario}`);
  if (!condition) {
    console.error(`       \x1b[31mExpected: ${expected} | Actual: ${JSON.stringify(actual)}\x1b[0m`);
  } else if (details) {
    console.log(`       \x1b[90m${typeof details === 'string' ? details : JSON.stringify(details)}\x1b[0m`);
  }
}

async function fetchJson(url, options = {}) {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    return { status: 0, ok: false, error: err.message };
  }
}

async function runComprehensiveSuite() {
  console.log('\n================================================================================');
  console.log('🚀 FIXITNOW MASTER COMPREHENSIVE TEST SUITE (AREAS A TO J)');
  console.log('================================================================================\n');

  // ---------------------------------------------------------------------------
  // AREA A: Citizen Authentication
  // ---------------------------------------------------------------------------
  console.log('--- AREA A: Citizen Authentication ---');
  const testPhone = '+919876543210';

  // AUTH-01: Send OTP
  const otpRes = await fetchJson(`${SERVER_BASE}/api/auth/citizen/send-otp`, {
    method: 'POST',
    body: JSON.stringify({ phone: testPhone })
  });
  const devOtp = otpRes.data?.data?.devOtp;
  recordTest('AUTH-01', 'Auth', 'Request OTP for citizen phone',
    otpRes.ok && devOtp !== undefined,
    'Status 200 with devOtp generated',
    { status: otpRes.status, devOtp },
    `Phone: ${testPhone}, OTP: ${devOtp}`
  );

  // AUTH-02: Verify Valid OTP
  let citizenToken = null;
  let citizenProfile = null;
  if (devOtp) {
    const verifyRes = await fetchJson(`${SERVER_BASE}/api/auth/citizen/verify-otp`, {
      method: 'POST',
      body: JSON.stringify({ phone: testPhone, otp: devOtp })
    });
    citizenToken = verifyRes.data?.data?.token;
    citizenProfile = verifyRes.data?.data?.profile;
    recordTest('AUTH-02', 'Auth', 'Verify valid OTP code',
      verifyRes.ok && citizenToken && citizenProfile?.phone === testPhone,
      'Status 200 with persistent session token',
      { status: verifyRes.status, hasToken: Boolean(citizenToken) },
      `Token: ${citizenToken?.slice(0, 18)}...`
    );
  }

  // AUTH-03: Verify Invalid OTP Code
  const otpForWrongRes = await fetchJson(`${SERVER_BASE}/api/auth/citizen/send-otp`, {
    method: 'POST',
    body: JSON.stringify({ phone: '+919820078614' })
  });
  const invalidOtpRes = await fetchJson(`${SERVER_BASE}/api/auth/citizen/verify-otp`, {
    method: 'POST',
    body: JSON.stringify({ phone: '+919820078614', otp: '0000' })
  });
  recordTest('AUTH-03', 'Auth', 'Reject invalid OTP code',
    invalidOtpRes.status === 400 && invalidOtpRes.data?.error?.code === 'INVALID_OTP',
    'Status 400 with INVALID_OTP',
    { status: invalidOtpRes.status, code: invalidOtpRes.data?.error?.code }
  );

  // AUTH-04: Missing mandatory auth fields
  const missingAuthRes = await fetchJson(`${SERVER_BASE}/api/auth/citizen/verify-otp`, {
    method: 'POST',
    body: JSON.stringify({ phone: testPhone })
  });
  recordTest('AUTH-04', 'Auth', 'Reject missing OTP field',
    missingAuthRes.status === 400 && missingAuthRes.data?.error?.code === 'MISSING_FIELDS',
    'Status 400 with MISSING_FIELDS',
    { status: missingAuthRes.status, code: missingAuthRes.data?.error?.code }
  );

  // AUTH-05: Unauthorized access with invalid token
  const invalidTokenRes = await fetchJson(`${SERVER_BASE}/api/complaints/citizen/my-reports`, {
    headers: { 'Authorization': 'Bearer bad_token_xyz_999' }
  });
  recordTest('AUTH-05', 'Auth', 'Reject invalid Bearer token',
    invalidTokenRes.status === 401 && invalidTokenRes.data?.error?.code === 'INVALID_TOKEN',
    'Status 401 with INVALID_TOKEN',
    { status: invalidTokenRes.status, code: invalidTokenRes.data?.error?.code }
  );

  // AUTH-06: Unauthorized access with missing token
  const missingTokenRes = await fetchJson(`${SERVER_BASE}/api/complaints/citizen/my-reports`);
  recordTest('AUTH-06', 'Auth', 'Reject missing Authorization header',
    missingTokenRes.status === 401 && missingTokenRes.data?.error?.code === 'UNAUTHORIZED',
    'Status 401 with UNAUTHORIZED',
    { status: missingTokenRes.status, code: missingTokenRes.data?.error?.code }
  );

  // AUTH-07: Current authenticated user profile
  const meRes = await fetchJson(`${SERVER_BASE}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${citizenToken || 'test_role_citizen'}` }
  });
  recordTest('AUTH-07', 'Auth', 'Retrieve authenticated session profile via /api/auth/me',
    meRes.ok && meRes.data?.data?.role === 'citizen',
    'Status 200 with authenticated citizen user profile',
    { status: meRes.status, role: meRes.data?.data?.role }
  );

  // ---------------------------------------------------------------------------
  // AREA B: Citizen Complaint Management
  // ---------------------------------------------------------------------------
  console.log('\n--- AREA B: Citizen Complaint Management ---');
  let testComplaint = null;
  const sampleImg = 'uploads/complaints/evidence-1793281807651-463314646.jpg';

  // COMP-01: Create complaint with all fields
  const createValidRes = await fetchJson(`${SERVER_BASE}/api/complaints`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${citizenToken || 'test_role_citizen'}` },
    body: JSON.stringify({
      description: 'सड़क पर भारी कचरा और सड़ांध का विशाल ढेर पड़ा हुआ है अस्पताल के गेट के पास बहुत खतरनाक स्थिति है',
      address: 'Sadar Hospital Gate Road, Golghar',
      pincode: '273001',
      lat: 26.7588,
      lng: 83.3732,
      media: [sampleImg]
    })
  });
  testComplaint = createValidRes.data?.data?.complaint;
  recordTest('COMP-01', 'Complaint', 'Submit valid complaint with all fields & photo',
    createValidRes.ok && testComplaint?.id && testComplaint?.complaint_number,
    'Status 200 with created complaint object & tracking number',
    { status: createValidRes.status, number: testComplaint?.complaint_number }
  );

  // COMP-02: Missing description
  const missingDescRes = await fetchJson(`${SERVER_BASE}/api/complaints`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${citizenToken || 'test_role_citizen'}` },
    body: JSON.stringify({ pincode: '273001' })
  });
  recordTest('COMP-02', 'Complaint', 'Reject complaint missing description',
    missingDescRes.status === 400 && missingDescRes.data?.error?.code === 'MISSING_FIELDS',
    'Status 400 with MISSING_FIELDS',
    { status: missingDescRes.status, code: missingDescRes.data?.error?.code }
  );

  // COMP-03: Missing PIN code
  const missingPinRes = await fetchJson(`${SERVER_BASE}/api/complaints`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${citizenToken || 'test_role_citizen'}` },
    body: JSON.stringify({ description: 'Pothole on road' })
  });
  recordTest('COMP-03', 'Complaint', 'Reject complaint missing PIN code',
    missingPinRes.status === 400 && missingPinRes.data?.error?.code === 'MISSING_FIELDS',
    'Status 400 with MISSING_FIELDS',
    { status: missingPinRes.status, code: missingPinRes.data?.error?.code }
  );

  // COMP-04: Text-only submission without image
  const textOnlyRes = await fetchJson(`${SERVER_BASE}/api/complaints`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${citizenToken || 'test_role_citizen'}` },
    body: JSON.stringify({
      description: 'Street light fused and dark stretch on Mohaddipur road',
      address: 'Mohaddipur Main Road',
      pincode: '273001'
    })
  });
  const textOnlyComplaint = textOnlyRes.data?.data?.complaint;
  recordTest('COMP-04', 'Complaint', 'Process text-only complaint submission',
    textOnlyRes.ok && textOnlyComplaint?.category === 'Street Lighting',
    'Status 200 triaged accurately via multilingual NLP',
    { status: textOnlyRes.status, category: textOnlyComplaint?.category }
  );

  // COMP-05: Track complaint by ID
  if (testComplaint?.id) {
    const trackRes = await fetchJson(`${SERVER_BASE}/api/complaints/${testComplaint.id}`, {
      headers: { 'Authorization': `Bearer ${citizenToken || 'test_role_citizen'}` }
    });
    const trackedData = trackRes.data?.data?.complaint || trackRes.data?.data;
    recordTest('COMP-05', 'Complaint', 'Retrieve full complaint details by ID',
      trackRes.ok && trackedData?.id === testComplaint.id,
      'Status 200 with complaint tracking details',
      { status: trackRes.status, trackedId: trackedData?.id }
    );
  }

  // COMP-06: Citizen complaint history
  const historyRes = await fetchJson(`${SERVER_BASE}/api/complaints/citizen/my-reports`, {
    headers: { 'Authorization': `Bearer ${citizenToken || 'test_role_citizen'}` }
  });
  const myReports = historyRes.data?.data?.complaints || historyRes.data?.data || [];
  recordTest('COMP-06', 'Complaint', 'Retrieve citizen personal complaint history',
    historyRes.ok && Array.isArray(myReports) && myReports.length > 0,
    'Status 200 with array of citizen reports',
    { status: historyRes.status, reportsCount: myReports.length }
  );

  // ---------------------------------------------------------------------------
  // AREA C: AI Image Detection
  // ---------------------------------------------------------------------------
  console.log('\n--- AREA C: AI Image Detection (FastAPI Port 8000) ---');

  // AI-DET-01: Direct image detection via JSON endpoint
  const detectRes = await fetchJson(`${AI_BASE}/api/detect/json`, {
    method: 'POST',
    body: JSON.stringify({
      image_path: sampleImg,
      conf_threshold: 0.15
    })
  });
  recordTest('AI-DET-01', 'Vision', 'YOLOv8 real defect detection on photographic image',
    detectRes.ok && Array.isArray(detectRes.data.detections) && detectRes.data.count >= 1,
    'Detections array populated with classes and bounding boxes',
    { count: detectRes.data.count, classes: detectRes.data.detections?.map(d => d.class_name) }
  );

  // AI-DET-02: Corrupted/invalid image error handling
  const badImgRes = await fetchJson(`${AI_BASE}/api/detect/json`, {
    method: 'POST',
    body: JSON.stringify({
      image_path: 'uploads/complaints/non_existent_fake_image.jpg'
    })
  });
  recordTest('AI-DET-02', 'Vision', 'Graceful 400 error handling for unresolvable image',
    badImgRes.status === 400,
    'Status 400 Bad Request',
    { status: badImgRes.status, detail: badImgRes.data?.detail }
  );

  // ---------------------------------------------------------------------------
  // AREA D: Multilingual NLP
  // ---------------------------------------------------------------------------
  console.log('\n--- AREA D: Multilingual NLP ---');

  // NLP-01: English clear complaint
  const enRes = await fetchJson(`${AI_BASE}/api/classify`, {
    method: 'POST',
    body: JSON.stringify({ text: 'Deep crater road pothole near junction causing severe vehicular damage' })
  });
  recordTest('NLP-01', 'NLP', 'English complaint classification',
    enRes.ok && enRes.data.predicted_category === 'pothole',
    'Predicted class: pothole',
    { category: enRes.data.predicted_category, lang: enRes.data.supporting_evidence?.detected_language }
  );

  // NLP-02: Hindi Devanagari clear complaint
  const hiRes = await fetchJson(`${AI_BASE}/api/classify`, {
    method: 'POST',
    body: JSON.stringify({ text: 'सड़क पर खुला हुआ मैनहोल है बच्चे गिर सकते हैं बहुत जानलेवा खतरा है' })
  });
  recordTest('NLP-02', 'NLP', 'Hindi Devanagari complaint classification',
    hiRes.ok && hiRes.data.predicted_category === 'open_manhole',
    'Predicted class: open_manhole',
    { category: hiRes.data.predicted_category, lang: hiRes.data.supporting_evidence?.detected_language }
  );

  // NLP-03: Hinglish clear complaint
  const hinglishRes = await fetchJson(`${AI_BASE}/api/classify`, {
    method: 'POST',
    body: JSON.stringify({ text: 'Street light pole kharab hai aur raat ko pura andhera rehta hai' })
  });
  recordTest('NLP-03', 'NLP', 'Hinglish transliterated complaint classification',
    hinglishRes.ok && hinglishRes.data.predicted_category === 'fault_streetlight',
    'Predicted class: fault_streetlight',
    { category: hinglishRes.data.predicted_category, lang: hinglishRes.data.supporting_evidence?.detected_language }
  );

  // NLP-04: Negation handling
  const negRes = await fetchJson(`${AI_BASE}/api/classify`, {
    method: 'POST',
    body: JSON.stringify({ text: 'Street light is working fine and has no problem, do not repair' })
  });
  recordTest('NLP-04', 'NLP', 'Negation tracking in text descriptions',
    negRes.ok && negRes.data.supporting_evidence?.is_negated === true,
    'Supporting evidence flags is_negated: true',
    { is_negated: negRes.data.supporting_evidence?.is_negated, status: negRes.data.classification_status }
  );

  // NLP-05: Multi-intent handling
  const multiRes = await fetchJson(`${AI_BASE}/api/classify`, {
    method: 'POST',
    body: JSON.stringify({ text: 'Huge pothole on road and big garbage dump beside it' })
  });
  recordTest('NLP-05', 'NLP', 'Multi-intent civic hazard handling',
    multiRes.ok && multiRes.data.supporting_evidence?.multiple_issues_mentioned === true,
    'Supporting evidence flags multiple_issues_mentioned: true',
    { multiple: multiRes.data.supporting_evidence?.multiple_issues_mentioned, candidates: multiRes.data.candidate_categories?.length }
  );

  // NLP-06: Empty or uninformative text
  const emptyRes = await fetchJson(`${AI_BASE}/api/classify`, {
    method: 'POST',
    body: JSON.stringify({ text: '   ' })
  });
  recordTest('NLP-06', 'NLP', 'Empty input handling with manual review flag',
    emptyRes.ok && emptyRes.data.requires_manual_review === true,
    'Requires manual review: true',
    { review: emptyRes.data.requires_manual_review, status: emptyRes.data.classification_status }
  );

  // ---------------------------------------------------------------------------
  // AREA E: Priority Engine & Safety Overrides
  // ---------------------------------------------------------------------------
  console.log('\n--- AREA E: Priority Engine & Safety Overrides ---');

  // PRI-01: Open manhole safety-critical override
  const manholePri = await fetchJson(`${AI_BASE}/api/priority`, {
    method: 'POST',
    body: JSON.stringify({
      text: 'सड़क पर खुला हुआ मैनहोल है कोई भी गिर सकता है',
      target_class: 'open_manhole'
    })
  });
  recordTest('PRI-01', 'Priority', 'Deterministic override: Open manhole -> CRITICAL',
    manholePri.ok && manholePri.data.priority_level === 'CRITICAL' && manholePri.data.risk_score >= 80,
    'Priority CRITICAL with risk score >= 80',
    { priority: manholePri.data.priority_level, score: manholePri.data.risk_score }
  );

  // PRI-02: Active electrical shock hazard
  const wirePri = await fetchJson(`${AI_BASE}/api/priority`, {
    method: 'POST',
    body: JSON.stringify({
      text: 'Faulty streetlight pole sparking with live wire sparking on ground',
      target_class: 'fault_streetlight'
    })
  });
  recordTest('PRI-02', 'Priority', 'Deterministic override: Live sparking wire -> CRITICAL',
    wirePri.ok && wirePri.data.priority_level === 'CRITICAL',
    'Priority CRITICAL triggered by electrical shock hazard',
    { priority: wirePri.data.priority_level, score: wirePri.data.risk_score }
  );

  // PRI-03: Emergency healthcare corridor obstruction
  const hospitalPri = await fetchJson(`${AI_BASE}/api/priority`, {
    method: 'POST',
    body: JSON.stringify({
      text: 'Huge deep pothole blocking hospital ambulance entrance',
      target_class: 'pothole'
    })
  });
  recordTest('PRI-03', 'Priority', 'Deterministic override: Healthcare corridor obstruction -> CRITICAL',
    hospitalPri.ok && hospitalPri.data.priority_level === 'CRITICAL',
    'Priority CRITICAL triggered by hospital obstruction',
    { priority: hospitalPri.data.priority_level, score: hospitalPri.data.risk_score }
  );

  // PRI-04: Minor aesthetic defect
  const minorPri = await fetchJson(`${AI_BASE}/api/priority`, {
    method: 'POST',
    body: JSON.stringify({
      text: 'Small minor hairline road crack in dead-end empty alley',
      target_class: 'road_crack'
    })
  });
  recordTest('PRI-04', 'Priority', 'Low severity complaint -> LOW priority tier',
    minorPri.ok && minorPri.data.priority_level === 'LOW',
    'Priority LOW with transparent risk scoring breakdown',
    { priority: minorPri.data.priority_level, score: minorPri.data.risk_score }
  );

  // ---------------------------------------------------------------------------
  // AREA F: Hybrid Context Matching
  // ---------------------------------------------------------------------------
  console.log('\n--- AREA F: Hybrid Context Matching ---');

  // HYB-01: Matching image and text
  const matchHyb = await fetchJson(`${AI_BASE}/api/hybrid-match`, {
    method: 'POST',
    body: JSON.stringify({
      text: 'Massive garbage pile and plastic trash rotting on street',
      image_path: sampleImg
    })
  });
  recordTest('HYB-01', 'Hybrid', 'Corroborated image and text context agreement',
    matchHyb.ok && matchHyb.data.status === 'MATCH',
    'Status MATCH with corroborated agreement',
    { status: matchHyb.data.status, visualClass: matchHyb.data.visual_class, textClass: matchHyb.data.text_class }
  );

  // HYB-02: Contradictory image and text
  const mismatchHyb = await fetchJson(`${AI_BASE}/api/hybrid-match`, {
    method: 'POST',
    body: JSON.stringify({
      text: 'Street light pole is broken and dark', // text is streetlight, image is garbage
      image_path: sampleImg
    })
  });
  recordTest('HYB-02', 'Hybrid', 'Contradictory evidence identification',
    mismatchHyb.ok && mismatchHyb.data.status === 'MISMATCH',
    'Status MISMATCH with detailed mismatch reasons',
    { status: mismatchHyb.data.status, reasons: mismatchHyb.data.mismatch_reasons }
  );

  // ---------------------------------------------------------------------------
  // AREA G: Duplicate Complaint Screening
  // ---------------------------------------------------------------------------
  console.log('\n--- AREA G: Duplicate Complaint Screening ---');

  const dupCheckRes = await fetchJson(`${AI_BASE}/api/duplicates/check`, {
    method: 'POST',
    body: JSON.stringify({
      new_complaint: {
        description: 'सड़क पर भारी कचरा और सड़ांध का ढेर पड़ा हुआ है अस्पताल के पास',
        lat: 26.7588,
        lng: 83.3732,
        image_path: sampleImg
      },
      candidates: [
        {
          id: 'cand-01',
          complaint_number: 'FIX-2026-0001',
          description: 'कचरा और सड़ांध का ढेर अस्पताल के पास फैला हुआ है',
          lat: 26.7589, // 11 meters away
          lng: 83.3733,
          image_path: sampleImg,
          status: 'IN_PROGRESS'
        },
        {
          id: 'cand-02',
          complaint_number: 'FIX-2026-0002',
          description: 'Street light pole not working on highway',
          lat: 26.8500, // 10 km away
          lng: 83.4500,
          status: 'RESOLVED'
        }
      ]
    })
  });

  const dupTop = dupCheckRes.data?.duplicate_candidates?.[0];
  recordTest('DUP-01', 'Duplicates', 'Spatial + perceptual duplicate candidate scoring',
    dupCheckRes.ok && dupTop?.candidate_id === 'cand-01' && dupTop?.decision === 'DUPLICATE',
    'Candidate cand-01 identified as DUPLICATE based on proximity & image match',
    { topCandidate: dupTop?.candidate_id, decision: dupTop?.decision, similarity: dupTop?.similarity_score }
  );

  // ---------------------------------------------------------------------------
  // AREA H: Advisory Before/After Repair Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- AREA H: Advisory Before/After Repair Verification ---');

  // VERIF-01: Identical image re-submitted fraud check
  const fraudVerif = await fetchJson(`${AI_BASE}/api/verify-repair`, {
    method: 'POST',
    body: JSON.stringify({
      before_image_path: sampleImg,
      after_image_path: sampleImg, // Identical image
      target_defect_class: 'garbage_litter'
    })
  });
  recordTest('VERIF-01', 'Repair', 'Fraud detection: Identical photo re-submitted',
    fraudVerif.ok && fraudVerif.data.decision === 'NOT_RESOLVED' && fraudVerif.data.evidence?.is_identical_photo === true,
    'Decision NOT_RESOLVED with evidence.is_identical_photo: true',
    { decision: fraudVerif.data.decision, reasons: fraudVerif.data.decision_reasons }
  );

  // VERIF-02: Missing after photo
  const missingAfterVerif = await fetchJson(`${AI_BASE}/api/verify-repair`, {
    method: 'POST',
    body: JSON.stringify({
      before_image_path: sampleImg,
      after_image_path: null
    })
  });
  recordTest('VERIF-02', 'Repair', 'Inconclusive decision for missing resolution photo',
    missingAfterVerif.ok && missingAfterVerif.data.decision === 'INCONCLUSIVE',
    'Decision INCONCLUSIVE requiring supervisory manual review',
    { decision: missingAfterVerif.data.decision }
  );

  // ---------------------------------------------------------------------------
  // AREA I: Officer & Municipal Admin Workflows (RBAC)
  // ---------------------------------------------------------------------------
  console.log('\n--- AREA I: Officer & Municipal Admin Workflows (RBAC) ---');

  // STAFF-01: Municipal Admin Login
  const adminLoginRes = await fetchJson(`${SERVER_BASE}/api/auth/staff/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin.gmc@gorakhpurmc.gov.in',
      password: 'AnyPasswordForLocalDev123'
    })
  });
  const adminToken = adminLoginRes.data?.data?.token;
  recordTest('STAFF-01', 'RBAC', 'Municipal Admin shared staff portal authentication',
    adminLoginRes.ok && adminToken && adminLoginRes.data?.data?.user?.role === 'municipal_admin',
    'Status 200 with municipal_admin role and session token',
    { status: adminLoginRes.status, role: adminLoginRes.data?.data?.user?.role }
  );

  // STAFF-02: Field Officer Login
  const officerLoginRes = await fetchJson(`${SERVER_BASE}/api/auth/staff/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: 'officer.roads@gorakhpurmc.gov.in',
      password: 'AnyPasswordForLocalDev123'
    })
  });
  const officerToken = officerLoginRes.data?.data?.token;
  recordTest('STAFF-02', 'RBAC', 'Field Officer shared staff portal authentication',
    officerLoginRes.ok && officerToken && officerLoginRes.data?.data?.user?.role === 'field_officer',
    'Status 200 with field_officer role and session token',
    { status: officerLoginRes.status, role: officerLoginRes.data?.data?.user?.role }
  );

  // STAFF-03: Field Officer submits resolution proof
  if (testComplaint?.id) {
    const resolveRes = await fetchJson(`${SERVER_BASE}/api/officer/complaints/${testComplaint.id}/resolution`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${officerToken || 'test_role_field_officer'}` },
      body: JSON.stringify({
        notes: 'Sanitation team deployed; waste cleared and chlorinated.',
        evidence: ['uploads/complaints/annotated_test.jpg']
      })
    });
    const resolvedComp = resolveRes.data?.data;
    recordTest('STAFF-03', 'Workflow', 'Field Officer submits resolution with advisory AI verification',
      resolveRes.ok && resolvedComp?.status === 'RESOLUTION_SUBMITTED' && resolvedComp?.resolution?.ai_verification,
      'Status RESOLUTION_SUBMITTED with attached ai_verification audit',
      { status: resolvedComp?.status, aiDecision: resolvedComp?.resolution?.ai_verification?.decision }
    );

    // STAFF-04: Municipal Admin on-demand AI re-verification
    const reverifyRes = await fetchJson(`${SERVER_BASE}/api/municipal/complaints/${testComplaint.id}/reverify-resolution-ai`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken || 'test_role_municipal_admin'}` }
    });
    recordTest('STAFF-04', 'Workflow', 'Municipal Admin invokes on-demand AI re-verification',
      reverifyRes.ok && reverifyRes.data?.data?.decision,
      'Status 200 with re-evaluated decision and quality assessment',
      { decision: reverifyRes.data?.data?.decision }
    );

    // STAFF-05: Municipal Admin manual approval
    const adminApproveRes = await fetchJson(`${SERVER_BASE}/api/municipal/complaints/${testComplaint.id}/verify-resolution`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken || 'test_role_municipal_admin'}` },
      body: JSON.stringify({
        approved: true,
        notes: 'Verified against municipal cleanup schedule.'
      })
    });
    const approvedData = adminApproveRes.data?.data?.complaint || adminApproveRes.data?.data;
    recordTest('STAFF-05', 'Workflow', 'Municipal Admin verifies resolution -> Status VERIFICATION',
      adminApproveRes.ok && approvedData?.status === 'VERIFICATION',
      'Status transitioned to VERIFICATION for citizen sign-off',
      { status: approvedData?.status }
    );

    // STAFF-06: Citizen confirms resolution and closes grievance
    const citizenConfirmRes = await fetchJson(`${SERVER_BASE}/api/complaints/${testComplaint.id}/verify`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${citizenToken || 'test_role_citizen'}` },
      body: JSON.stringify({
        action: 'CONFIRM',
        rating: 5,
        feedback: 'Excellent response time.'
      })
    });
    const confirmedData = citizenConfirmRes.data?.data?.complaint || citizenConfirmRes.data?.data;
    recordTest('STAFF-06', 'Workflow', 'Citizen confirms resolution -> Status RESOLVED (Ticket Closed)',
      citizenConfirmRes.ok && confirmedData?.status === 'RESOLVED' && confirmedData?.citizen_confirmed === true,
      'Status transitioned to RESOLVED with rating recorded',
      { status: confirmedData?.status, rating: confirmedData?.citizen_rating }
    );

    // STAFF-07: Citizen reopens complaint scenario
    const reopenRes = await fetchJson(`${SERVER_BASE}/api/complaints/${testComplaint.id}/verify`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${citizenToken || 'test_role_citizen'}` },
      body: JSON.stringify({
        action: 'REOPEN',
        reopen_reason: 'Garbage dump rekindled on next day.'
      })
    });
    const reopenedData = reopenRes.data?.data?.complaint || reopenRes.data?.data;
    recordTest('STAFF-07', 'Workflow', 'Citizen reopens complaint -> Status REOPENED',
      reopenRes.ok && reopenedData?.status === 'REOPENED' && reopenedData?.reopen_count >= 1,
      'Status transitioned to REOPENED with reopen_count incremented',
      { status: reopenedData?.status, count: reopenedData?.reopen_count }
    );
  }

  // STAFF-08: RBAC Access Boundary (Citizen accessing Municipal Admin endpoint)
  const rbacDenialRes = await fetchJson(`${SERVER_BASE}/api/municipal/overview`, {
    headers: { 'Authorization': `Bearer ${citizenToken || 'test_role_citizen'}` }
  });
  recordTest('STAFF-08', 'RBAC', 'Access restriction: Citizen forbidden on Municipal Admin route',
    rbacDenialRes.status === 403 && rbacDenialRes.data?.error?.code === 'FORBIDDEN',
    'Status 403 Forbidden with FORBIDDEN error code',
    { status: rbacDenialRes.status, code: rbacDenialRes.data?.error?.code }
  );

  // ---------------------------------------------------------------------------
  // AREA J: Backend, Database & Storage Resilience
  // ---------------------------------------------------------------------------
  console.log('\n--- AREA J: Backend, Database & Storage Resilience ---');

  // SYS-01: Express to FastAPI socket communication latency
  const startTime = Date.now();
  const preRes = await fetchJson(`${SERVER_BASE}/api/complaints/pre-analyze`, {
    method: 'POST',
    body: JSON.stringify({
      description: 'Dangerous open sewer hole on market road',
      pincode: '273001'
    })
  });
  const latencyMs = Date.now() - startTime;
  recordTest('SYS-01', 'System', 'Express to FastAPI socket communication within SLA',
    preRes.ok && preRes.data?.data?.ai_recommendation?.category === 'Drainage & Sewerage' && latencyMs < 3000,
    `Responded in ${latencyMs}ms (< 3000ms)`,
    { latencyMs, category: preRes.data?.data?.ai_recommendation?.category }
  );

  // SYS-02: Database persistence to store.json on disk
  const storePath = path.resolve(PROJECT_ROOT, 'server/data/store.json');
  const storeRaw = fs.readFileSync(storePath, 'utf8');
  const storeJson = JSON.parse(storeRaw);
  const foundInStore = storeJson.complaints?.some(c => c.id === testComplaint?.id);
  recordTest('SYS-02', 'System', 'Complaint records persistently committed to store.json',
    foundInStore === true,
    'Complaint record verified in persistent disk storage',
    { persisted: foundInStore }
  );

  // SYS-03: Direct camera media upload & static retrieval
  const dummyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const blob = new Blob([dummyPng], { type: 'image/png' });
  const formData = new FormData();
  formData.append('media', blob, 'test-complaint-proof.png');

  let mediaUploadUrl = null;
  const mediaRes = await fetch(`${SERVER_BASE}/api/complaints/upload-media`, {
    method: 'POST',
    body: formData
  });
  if (mediaRes.ok) {
    const mData = await mediaRes.json();
    mediaUploadUrl = mData.data?.mediaUrl;
  }
  recordTest('SYS-03', 'Storage', 'Camera evidence image upload via multipart/form-data',
    mediaRes.ok && mediaUploadUrl !== null,
    'Status 200 with persistent storage URL generated',
    { status: mediaRes.status, url: mediaUploadUrl }
  );

  // SYS-04: Static media retrieval
  if (mediaUploadUrl) {
    const fileFetchRes = await fetch(mediaUploadUrl);
    recordTest('SYS-04', 'Storage', 'Static retrieval of uploaded evidence file over HTTP',
      fileFetchRes.ok && fileFetchRes.status === 200,
      'Status 200 OK for statically served upload',
      { status: fileFetchRes.status, contentType: fileFetchRes.headers.get('content-type') }
    );
  }

  // SYS-05: Deterministic local triage fallback engine offline safety
  const { aiOrchestrator } = await import('../src/services/ai/aiOrchestrator.js');
  const localFallback = aiOrchestrator.localTriageEngine({
    description: 'सड़क पर खुला हुआ मैनहोल है बच्चे गिर सकते हैं बहुत जानलेवा खतरा है',
    pincode: '273001'
  });
  recordTest('SYS-05', 'System', 'Resilient local offline fallback preserves CRITICAL safety invariant',
    localFallback.category === 'Drainage & Sewerage' && localFallback.priority === 'CRITICAL',
    'Local engine assigns Drainage & Sewerage and CRITICAL priority',
    { category: localFallback.category, priority: localFallback.priority, reason: localFallback.priority_reason }
  );

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log(`📊 MASTER TEST RESULTS: Total: ${testInventory.length} | Passed: ${passCount} | Failed: ${failCount}`);
  console.log('================================================================================\n');

  // Save Traceable Test Case Inventory to JSON
  const invPath = path.resolve(PROJECT_ROOT, 'ai-artifacts/reports/master_test_inventory.json');
  fs.writeFileSync(invPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    total_tests: testInventory.length,
    passed_tests: passCount,
    failed_tests: failCount,
    pass_rate: `${((passCount / testInventory.length) * 100).toFixed(1)}%`,
    test_cases: testInventory
  }, null, 2), 'utf8');

  console.log(`Saved master test inventory to: ${invPath}`);

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runComprehensiveSuite().catch(err => {
  console.error('\x1b[31m[FATAL SUITE EXCEPTION]\x1b[0m', err);
  process.exit(1);
});
