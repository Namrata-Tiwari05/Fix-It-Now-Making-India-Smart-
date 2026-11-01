/**
 * FixItNow Live HTTP End-to-End Workflow & AI Integration Test Suite
 * Executes real network calls against running services:
 * - FastAPI AI Microservice (http://127.0.0.1:8000)
 * - Express Civic Backend (http://localhost:5000)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

const AI_BASE = 'http://127.0.0.1:8000';
const SERVER_BASE = 'http://localhost:5000';

let testCount = 0;
let passedCount = 0;
let failedCount = 0;

function assertTest(name, condition, details = null) {
  testCount++;
  if (condition) {
    passedCount++;
    console.log(`\x1b[32m[PASS ${testCount}]\x1b[0m ${name}`);
    if (details) {
      console.log('       \x1b[90m' + (typeof details === 'string' ? details : JSON.stringify(details)) + '\x1b[0m');
    }
  } else {
    failedCount++;
    console.error(`\x1b[31m[FAIL ${testCount}]\x1b[0m ${name}`);
    if (details) {
      console.error('       \x1b[31m' + (typeof details === 'string' ? details : JSON.stringify(details)) + '\x1b[0m');
    }
  }
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runLiveVerification() {
  console.log('\n======================================================================');
  console.log('🌐 FIXITNOW LIVE HTTP WORKFLOW & AI INTEGRATION VERIFICATION');
  console.log('======================================================================\n');

  // ---------------------------------------------------------------------------
  // STEP 1: Verify FastAPI AI Microservice Health & Endpoints (Port 8000)
  // ---------------------------------------------------------------------------
  console.log('--- Phase 1: Live FastAPI AI Microservice Endpoints ---');
  
  const aiHealth = await fetchJson(`${AI_BASE}/health`);
  assertTest('FastAPI /health probe', 
    aiHealth.ok && aiHealth.data.status === 'online' && aiHealth.data.active_model === 'improved_yolov8s',
    { status: aiHealth.data.status, model: aiHealth.data.active_model, cuda: aiHealth.data.cuda_available }
  );

  // Multilingual Classification via FastAPI
  const hiClassify = await fetchJson(`${AI_BASE}/api/classify`, {
    method: 'POST',
    body: JSON.stringify({ text: 'सड़क पर खुला हुआ मैनहोल है बच्चे गिर सकते हैं' })
  });
  assertTest('FastAPI /api/classify (Hindi Devanagari open manhole)',
    hiClassify.ok && hiClassify.data.predicted_category === 'open_manhole' && hiClassify.data.municipal_department === 'Drainage & Sewerage' && ['Hindi', 'hi'].includes(hiClassify.data.supporting_evidence?.detected_language),
    { category: hiClassify.data.predicted_category, department: hiClassify.data.municipal_department, lang: hiClassify.data.supporting_evidence?.detected_language }
  );

  // Priority Risk Scoring via FastAPI
  const priorityRes = await fetchJson(`${AI_BASE}/api/priority`, {
    method: 'POST',
    body: JSON.stringify({
      text: 'खुला मैनहोल बहुत खतरनाक है',
      target_class: 'open_manhole'
    })
  });
  assertTest('FastAPI /api/priority (Safety-Critical Override)',
    priorityRes.ok && priorityRes.data.priority_level === 'CRITICAL' && priorityRes.data.risk_score >= 80,
    { priority: priorityRes.data.priority_level, risk_score: priorityRes.data.risk_score, reasons: priorityRes.data.priority_reasons }
  );

  // Real YOLOv8 Detection via FastAPI
  const testImgRelative = 'uploads/complaints/evidence-1793281807651-463314646.jpg';
  const detectRes = await fetchJson(`${AI_BASE}/api/detect/json`, {
    method: 'POST',
    body: JSON.stringify({
      image_path: testImgRelative,
      conf_threshold: 0.15
    })
  });
  assertTest('FastAPI /api/detect/json (Real YOLOv8 Inference on Test Image)',
    detectRes.ok && Array.isArray(detectRes.data.detections) && detectRes.data.count >= 1,
    { detection_count: detectRes.data.count, classes: detectRes.data.detections?.map(d => d.class_name) }
  );

  // Unified Triage via FastAPI
  const triageRes = await fetchJson(`${AI_BASE}/api/triage`, {
    method: 'POST',
    body: JSON.stringify({
      description: 'Deep dangerous road pothole on MG road',
      pincode: '273001',
      image_path: testImgRelative
    })
  });
  assertTest('FastAPI /api/triage (Unified Multimodal Pipeline)',
    triageRes.ok && triageRes.data.category && triageRes.data.priority,
    { category: triageRes.data.category, priority: triageRes.data.priority, risk: triageRes.data.risk_score }
  );

  // Advisory Repair Verification via FastAPI
  const repairRes = await fetchJson(`${AI_BASE}/api/verify-repair`, {
    method: 'POST',
    body: JSON.stringify({
      before_image_path: testImgRelative,
      after_image_path: testImgRelative, // Identical image (simulated fraud/no repair)
      target_defect_class: 'garbage_litter'
    })
  });
  assertTest('FastAPI /api/verify-repair (Advisory Before/After Fraud Check)',
    repairRes.ok && ['NOT_RESOLVED', 'NEEDS_MANUAL_REVIEW'].includes(repairRes.data.decision),
    { decision: repairRes.data.decision, reasons: repairRes.data.decision_reasons }
  );

  // ---------------------------------------------------------------------------
  // STEP 2: Express Backend Health, Auth & Draft Pre-analysis (Port 5000)
  // ---------------------------------------------------------------------------
  console.log('\n--- Phase 2: Live Express Backend Endpoints & Auth ---');

  const expHealth = await fetchJson(`${SERVER_BASE}/api/health`);
  assertTest('Express /api/health probe',
    expHealth.ok && expHealth.data.status === 'healthy',
    { service: expHealth.data.service, version: expHealth.data.version }
  );

  // Conversational AI Pre-analysis (Public Endpoint)
  const preAnalyze = await fetchJson(`${SERVER_BASE}/api/complaints/pre-analyze`, {
    method: 'POST',
    body: JSON.stringify({
      description: 'Road pothole near highway junction causing traffic hazard',
      pincode: '273001'
    })
  });
  assertTest('Express /api/complaints/pre-analyze (Draft AI scan)',
    preAnalyze.ok && preAnalyze.data.data?.ai_recommendation?.category === 'Roads & Potholes',
    { category: preAnalyze.data.data?.ai_recommendation?.category, priority: preAnalyze.data.data?.ai_recommendation?.priority }
  );

  // Citizen Authentication Flow via Phone OTP
  const citizenPhone = '+919876543210';
  const otpSend = await fetchJson(`${SERVER_BASE}/api/auth/citizen/send-otp`, {
    method: 'POST',
    body: JSON.stringify({ phone: citizenPhone })
  });
  const devOtp = otpSend.data?.data?.devOtp;
  assertTest('Citizen OTP Generation (/api/auth/citizen/send-otp)',
    otpSend.ok && devOtp !== undefined,
    { phone: citizenPhone, devOtp }
  );

  let citizenToken = null;
  let citizenProfile = null;
  if (devOtp) {
    const otpVerify = await fetchJson(`${SERVER_BASE}/api/auth/citizen/verify-otp`, {
      method: 'POST',
      body: JSON.stringify({ phone: citizenPhone, otp: devOtp })
    });
    citizenToken = otpVerify.data?.data?.token;
    citizenProfile = otpVerify.data?.data?.profile;
    assertTest('Citizen OTP Verification (/api/auth/citizen/verify-otp)',
      otpVerify.ok && citizenToken !== null && citizenProfile?.phone === citizenPhone,
      { userName: citizenProfile?.name, tokenPrefix: citizenToken?.slice(0, 15) }
    );
  }

  // ---------------------------------------------------------------------------
  // STEP 3: Citizen Complaint Submission & Multimodal AI Ingestion
  // ---------------------------------------------------------------------------
  console.log('\n--- Phase 3: Citizen Complaint Submission & Multimodal AI ---');

  let submittedComplaint = null;
  // Corroborated image + text complaint (garbage photo with high-severity garbage description)
  const complaintPayload = {
    description: 'सड़क पर भारी कचरा और सड़ांध का विशाल ढेर पड़ा हुआ है अस्पताल के गेट के पास बहुत खतरनाक स्थिति है',
    address: 'Near Sadar Hospital Gate, Station Road',
    pincode: '273001',
    lat: 26.7588,
    lng: 83.3732,
    media: [testImgRelative]
  };

  const createRes = await fetchJson(`${SERVER_BASE}/api/complaints`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${citizenToken || 'test_role_citizen'}`
    },
    body: JSON.stringify(complaintPayload)
  });

  submittedComplaint = createRes.data?.data?.complaint;
  assertTest('Citizen Submits Complaint with Real Image & Hindi Text',
    createRes.ok && submittedComplaint?.id && submittedComplaint?.complaint_number,
    {
      id: submittedComplaint?.id,
      number: submittedComplaint?.complaint_number,
      category: submittedComplaint?.category,
      priority: submittedComplaint?.priority
    }
  );

  // Verify Multimodal Corroboration & Multi-Factor Priority Escalation
  assertTest('Multimodal Corroboration & Multi-Factor Risk Escalation (Solid Waste, Calibrated Urgency)',
    submittedComplaint?.category === 'Solid Waste & Sanitation' && ['MEDIUM', 'HIGH', 'CRITICAL'].includes(submittedComplaint?.priority),
    {
      category: submittedComplaint?.category,
      priority: submittedComplaint?.priority,
      reason: submittedComplaint?.priority_reason
    }
  );

  // Submit Open Manhole to verify CRITICAL safety override on submission
  const manholeRes = await fetchJson(`${SERVER_BASE}/api/complaints`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${citizenToken || 'test_role_citizen'}`
    },
    body: JSON.stringify({
      description: 'सड़क पर खुला हुआ मैनहोल है ढक्कन गायब है बहुत बड़ा जानलेवा खतरा है',
      address: 'Near Golghar Market',
      pincode: '273001',
      lat: 26.7588,
      lng: 83.3732
    })
  });
  const manholeComplaint = manholeRes.data?.data?.complaint;
  assertTest('Safety-Critical Deterministic Escalation on Submission (Open Manhole -> CRITICAL)',
    manholeRes.ok && manholeComplaint?.category === 'Drainage & Sewerage' && manholeComplaint?.priority === 'CRITICAL',
    {
      category: manholeComplaint?.category,
      priority: manholeComplaint?.priority,
      reason: manholeComplaint?.priority_reason
    }
  );

  assertTest('YOLOv8 Detection Results Attached to Complaint Record',
    Array.isArray(submittedComplaint?.ai_detections) && submittedComplaint?.ai_detections.length > 0,
    {
      detections_count: submittedComplaint?.ai_detections?.length || 0,
      detected_classes: submittedComplaint?.ai_detections?.map(d => d.class_name)
    }
  );

  // ---------------------------------------------------------------------------
  // STEP 4: Store Persistence Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- Phase 4: Local Store JSON Persistence Verification ---');

  const storePath = path.resolve(PROJECT_ROOT, 'server/data/store.json');
  const storeRaw = fs.readFileSync(storePath, 'utf8');
  const storeData = JSON.parse(storeRaw);
  const persistedComplaint = storeData.complaints?.find(c => c.id === submittedComplaint?.id);

  assertTest('Complaint Persisted to server/data/store.json on disk',
    persistedComplaint !== undefined && persistedComplaint.id === submittedComplaint?.id,
    {
      persisted_id: persistedComplaint?.id,
      persisted_status: persistedComplaint?.status,
      persisted_priority: persistedComplaint?.priority
    }
  );

  // ---------------------------------------------------------------------------
  // STEP 5: Duplicate Complaint Screening over HTTP
  // ---------------------------------------------------------------------------
  console.log('\n--- Phase 5: Duplicate Complaint Screening over HTTP ---');

  const dupRes = await fetchJson(`${SERVER_BASE}/api/complaints`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${citizenToken || 'test_role_citizen'}`
    },
    body: JSON.stringify({
      description: 'सड़क पर भारी कचरा और सड़ांध का ढेर पड़ा हुआ है अस्पताल के गेट के पास',
      address: 'Near Sadar Hospital Gate, Station Road',
      pincode: '273001',
      lat: 26.7589, // ~11 meters away
      lng: 83.3733,
      media: [testImgRelative]
    })
  });

  const dupComplaint = dupRes.data?.data?.complaint;
  const duplicateFlag = dupRes.data?.data?.duplicate_screening;
  assertTest('Duplicate Complaint Screened & Processed Cleanly',
    dupRes.ok && dupComplaint?.id,
    {
      duplicate_id: dupComplaint?.id,
      duplicate_number: dupComplaint?.complaint_number,
      duplicates_flagged: duplicateFlag?.length || 0
    }
  );

  // ---------------------------------------------------------------------------
  // STEP 6: Offline Fallback Behavior Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- Phase 6: Deterministic Offline Safety Fallback Verification ---');

  const { aiOrchestrator } = await import('../src/services/ai/aiOrchestrator.js');
  const fallbackResult = aiOrchestrator.localTriageEngine({
    description: 'Dangerous open manhole and missing drain lid on dark pathway',
    pincode: '273001'
  });
  assertTest('Local Triage Fallback Engine (Safety-Critical Invariant Preserved Offline)',
    fallbackResult.category === 'Drainage & Sewerage' && fallbackResult.priority === 'CRITICAL',
    { category: fallbackResult.category, priority: fallbackResult.priority, reason: fallbackResult.priority_reason }
  );

  // ---------------------------------------------------------------------------
  // STEP 7: Field Officer Resolution Submission with Advisory AI Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- Phase 7: Field Officer Resolution Workflow ---');

  if (submittedComplaint?.id) {
    const officerToken = 'test_role_field_officer';
    const resolutionRes = await fetchJson(`${SERVER_BASE}/api/officer/complaints/${submittedComplaint.id}/resolution`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${officerToken}`
      },
      body: JSON.stringify({
        notes: 'Garbage heap cleared and sanitized with disinfectant powder.',
        evidence: ['uploads/complaints/annotated_test.jpg']
      })
    });

    const resComplaint = resolutionRes.data?.data;
    assertTest('Field Officer Submits Resolution Evidence with Advisory AI Audit',
      resolutionRes.ok && resComplaint?.status === 'RESOLUTION_SUBMITTED' && resComplaint?.resolution?.ai_verification,
      {
        status: resComplaint?.status,
        ai_decision: resComplaint?.resolution?.ai_verification?.decision,
        reasons: resComplaint?.resolution?.ai_verification?.decision_reasons
      }
    );

    // -------------------------------------------------------------------------
    // STEP 8: Municipal Admin On-Demand Re-verification
    // -------------------------------------------------------------------------
    console.log('\n--- Phase 8: Municipal Admin AI Re-verification ---');

    const adminToken = 'test_role_municipal_admin';
    const reverifyRes = await fetchJson(`${SERVER_BASE}/api/municipal/complaints/${submittedComplaint.id}/reverify-resolution-ai`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    assertTest('Municipal Admin Re-verifies Resolution AI On-Demand',
      reverifyRes.ok && reverifyRes.data?.data?.decision,
      {
        decision: reverifyRes.data?.data?.decision,
        reasons: reverifyRes.data?.data?.decision_reasons,
        quality_assessment: reverifyRes.data?.data?.after_quality_assessment
      }
    );

    // -------------------------------------------------------------------------
    // STEP 9: Confirm AI Cannot Bypass Mandatory Human Approval
    // -------------------------------------------------------------------------
    console.log('\n--- Phase 9: Human-in-the-Loop Safety Approval Invariant ---');

    // Confirm that right now, despite AI verification having run, the ticket is NOT closed
    const currentComplaint = await fetchJson(`${SERVER_BASE}/api/complaints/${submittedComplaint.id}`, {
      headers: { 'Authorization': `Bearer ${citizenToken || 'test_role_citizen'}` }
    });
    const cData = currentComplaint.data?.data?.complaint || currentComplaint.data?.data;
    assertTest('Invariant: AI Verification Alone Cannot Auto-Resolve (Status is NOT RESOLVED)',
      cData?.status === 'RESOLUTION_SUBMITTED',
      { current_status: cData?.status }
    );

    // Admin explicitly reviews and approves resolution
    const adminApproval = await fetchJson(`${SERVER_BASE}/api/municipal/complaints/${submittedComplaint.id}/verify-resolution`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        approved: true,
        notes: 'Verified repaired on municipal inspection logs.'
      })
    });
    const updatedByAdmin = adminApproval.data?.data?.complaint || adminApproval.data?.data;
    assertTest('Municipal Admin Human Verification Review -> Status VERIFICATION',
      adminApproval.ok && updatedByAdmin?.status === 'VERIFICATION',
      { new_status: updatedByAdmin?.status }
    );

    // Citizen provides final sign-off confirming closure
    const citizenConfirmation = await fetchJson(`${SERVER_BASE}/api/complaints/${submittedComplaint.id}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${citizenToken || 'test_role_citizen'}`
      },
      body: JSON.stringify({
        action: 'CONFIRM',
        rating: 5,
        feedback: 'Cleaned thoroughly, thank you.'
      })
    });
    const updatedByCitizen = citizenConfirmation.data?.data?.complaint || citizenConfirmation.data?.data;
    assertTest('Citizen Human Confirmation Closes Complaint Ticket -> RESOLVED',
      citizenConfirmation.ok && updatedByCitizen?.status === 'RESOLVED',
      {
        final_status: updatedByCitizen?.status,
        citizen_confirmed: updatedByCitizen?.citizen_confirmed
      }
    );
  }

  // ---------------------------------------------------------------------------
  // FINAL RESULTS
  // ---------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log(`📊 LIVE HTTP TEST SUMMARY: Total: ${testCount} | Passed: ${passedCount} | Failed: ${failedCount}`);
  console.log('======================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runLiveVerification().catch(err => {
  console.error('\x1b[31m[FATAL EXCEPTION in live verification runner]\x1b[0m', err);
  process.exit(1);
});
