/**
 * Comprehensive End-to-End Integration Test for FixItNow AI & Complaint Workflow
 */

import { aiOrchestrator } from '../src/services/ai/aiOrchestrator.js';
import { db } from '../src/services/db/index.js';
import { complaintController } from '../src/controllers/complaintController.js';
import { officerController } from '../src/controllers/officerController.js';
import { municipalController } from '../src/controllers/municipalController.js';
import { config } from '../src/config/env.js';

let totalTests = 0;
let passedCount = 0;
let failedCount = 0;

function assert(title, condition, details = null) {
  totalTests++;
  if (condition) {
    passedCount++;
    console.log(`[PASS] ${title}`);
    if (details) console.log('       ', typeof details === 'string' ? details : JSON.stringify(details));
  } else {
    failedCount++;
    console.error(`[FAIL] ${title}`);
    if (details) console.error('       ', typeof details === 'string' ? details : JSON.stringify(details));
  }
}

async function runE2eTests() {
  console.log('===============================================================');
  console.log('🚀 FIXITNOW E2E AI INTEGRATION & RESOLUTION TEST SUITE');
  console.log('===============================================================\n');

  // 1. Initialize local DB
  await db.init().catch(() => {});
  assert('1. Local Database Initialized', Array.isArray(db.complaints));

  // 2. Multilingual Triage (Local Fallback Engine)
  const hiTriage = aiOrchestrator.localTriageEngine({
    description: 'सड़क पर खुला हुआ मैनहोल है बहुत बड़ा जानलेवा खतरा है',
    pincode: '273001'
  });
  assert('2a. Local Triage - Hindi Devanagari Open Manhole (Critical)',
    hiTriage.category === 'Drainage & Sewerage' && hiTriage.priority === 'CRITICAL',
    { category: hiTriage.category, priority: hiTriage.priority, reason: hiTriage.priority_reason }
  );

  const hinglishTriage = aiOrchestrator.localTriageEngine({
    description: 'Street light pole kharab hai aur raat ko pura andhera rehta hai',
    pincode: '273001'
  });
  assert('2b. Local Triage - Hinglish Street Lighting (High)',
    hinglishTriage.category === 'Street Lighting' && ['HIGH', 'CRITICAL', 'MEDIUM'].includes(hinglishTriage.priority),
    { category: hinglishTriage.category, priority: hinglishTriage.priority }
  );

  const enTriage = aiOrchestrator.localTriageEngine({
    description: 'Massive garbage dump and rotting waste near hospital gate',
    pincode: '273001'
  });
  assert('2c. Local Triage - English Garbage near Hospital (Critical)',
    enTriage.category === 'Solid Waste & Sanitation' && enTriage.priority === 'CRITICAL',
    { category: enTriage.category, priority: enTriage.priority }
  );

  // 3. AI Orchestrator analyzeComplaint (Full Flow with Fallback Safety)
  const fullTriage = await aiOrchestrator.analyzeComplaint({
    description: 'Deep road pothole on main transit road causing tire burst',
    pincode: '273001',
    lat: 26.7588,
    lng: 83.3732
  });
  assert('3. AI Orchestrator analyzeComplaint completes cleanly',
    fullTriage.category && fullTriage.priority && fullTriage.ai_status,
    { category: fullTriage.category, priority: fullTriage.priority, status: fullTriage.ai_status }
  );

  // 4. Duplicate Screening Engine
  const dupResults = await aiOrchestrator.screenDuplicates({
    newComplaint: {
      description: 'Deep road pothole on main transit road near petrol pump',
      pincode: '273001',
      lat: 26.7588,
      lng: 83.3732
    },
    category: 'Roads & Potholes'
  });
  assert('4. Duplicate Screening executes without crash', Array.isArray(dupResults));

  // 5. Advisory Before/After Repair Verification
  const verificationResult = await aiOrchestrator.verifyResolution({
    beforeMedia: 'uploads/complaints/evidence-1793281807651-463314646.jpg',
    afterMedia: 'uploads/complaints/evidence-1793281807651-463314646.jpg', // identical photo fraud
    beforeMetadata: { complaint_id: 'test-101', lat: 26.7588, lng: 83.3732, created_at: '2026-10-26T10:00:00Z' },
    afterMetadata: { complaint_id: 'test-101', lat: 26.7588, lng: 83.3732, created_at: '2026-10-27T10:00:00Z' },
    targetClass: 'garbage_litter'
  });
  assert('5a. Repair Verification (Fraud Detection or Advisory Fallback)',
    ['NOT_RESOLVED', 'NEEDS_MANUAL_REVIEW'].includes(verificationResult.decision),
    { decision: verificationResult.decision, reasons: verificationResult.decision_reasons }
  );

  const missingVerif = await aiOrchestrator.verifyResolution({
    beforeMedia: 'uploads/complaints/evidence-1793281807651-463314646.jpg',
    afterMedia: null
  });
  assert('5b. Repair Verification (Missing After Media -> Inconclusive/Review)',
    ['INCONCLUSIVE', 'NEEDS_MANUAL_REVIEW'].includes(missingVerif.decision),
    { decision: missingVerif.decision }
  );

  // 6. End-to-End Complaint Creation via Controller Mock Req/Res
  let createdComplaint = null;
  const mockReq = {
    user: { id: 'cit-test-01', name: 'Ramesh Citizen', phone: '+919876543210', role: 'citizen' },
    body: {
      description: 'Open dangerous sewer manhole without cover near primary school',
      pincode: '273001',
      address: 'Near Primary School Road',
      lat: 26.7588,
      lng: 83.3732,
      media: ['uploads/complaints/evidence-1793281807651-463314646.jpg']
    }
  };
  const mockRes = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(payload) {
      if (payload.data?.complaint) {
        createdComplaint = payload.data.complaint;
      }
      return payload;
    }
  };

  await complaintController.create(mockReq, mockRes, (err) => { if (err) console.error(err); });

  assert('6a. Complaint Creation Success', createdComplaint !== null && createdComplaint.id, {
    complaint_number: createdComplaint?.complaint_number,
    category: createdComplaint?.category,
    priority: createdComplaint?.priority
  });

  assert('6b. Complaint AI Classification & Safety Escalation',
    createdComplaint && createdComplaint.priority === 'CRITICAL',
    { priority: createdComplaint?.priority, reason: createdComplaint?.priority_reason }
  );

  // 7. Field Officer Submits Resolution with AI Verification
  if (createdComplaint) {
    const mockOfficerReq = {
      user: { id: 'of111111-1111-1111-1111-111111111111', name: 'Officer Vikram Singh', role: 'field_officer' },
      params: { id: createdComplaint.id },
      body: {
        notes: 'Manhole concrete cover successfully fabricated and sealed in place.',
        evidence: ['uploads/complaints/annotated_test.jpg']
      }
    };
    let officerResData = null;
    const mockOfficerRes = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { officerResData = payload; return payload; }
    };

    await officerController.submitResolution(mockOfficerReq, mockOfficerRes, (err) => { if (err) console.error(err); });

    const updatedC = db.getComplaintById(createdComplaint.id);
    assert('7a. Officer Submits Resolution with AI Verification Audit',
      updatedC?.status === 'RESOLUTION_SUBMITTED' && updatedC?.resolution?.ai_verification,
      {
        status: updatedC?.status,
        ai_decision: updatedC?.resolution?.ai_verification?.decision,
        officer: updatedC?.resolution?.officer_name
      }
    );

    // 8. Municipal Admin Re-verifies AI Resolution on Demand
    const mockAdminReq = {
      user: { id: 'adm-01', name: 'Admin Sharma', role: 'municipal_admin' },
      params: { id: createdComplaint.id }
    };
    let adminReverifyData = null;
    const mockAdminRes = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { adminReverifyData = payload; return payload; }
    };

    await municipalController.reverifyResolutionAi(mockAdminReq, mockAdminRes, (err) => { if (err) console.error(err); });
    assert('8. Admin reverifyResolutionAi Endpoint Functionality',
      adminReverifyData && adminReverifyData.success === true && adminReverifyData.data?.decision,
      { decision: adminReverifyData?.data?.decision }
    );

    // 9. Citizen Confirms Resolution
    const mockVerifyReq = {
      user: { id: 'cit-test-01', name: 'Ramesh Citizen', role: 'citizen' },
      params: { id: createdComplaint.id },
      body: {
        action: 'CONFIRM',
        rating: 5,
        feedback: 'Very prompt repair, manhole is properly covered now.'
      }
    };
    let verifyResData = null;
    const mockVerifyRes = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { verifyResData = payload; return payload; }
    };

    await complaintController.verify(mockVerifyReq, mockVerifyRes, (err) => { if (err) console.error(err); });
    const finalComplaint = db.getComplaintById(createdComplaint.id);
    assert('9. Citizen Confirms Resolution -> Ticket Closed',
      finalComplaint?.status === 'RESOLVED' && finalComplaint?.citizen_confirmed === true,
      { status: finalComplaint?.status, rating: finalComplaint?.citizen_rating }
    );
  }

  console.log('\n===============================================================');
  console.log(`📊 E2E SUMMARY: Total: ${totalTests} | Passed: ${passedCount} | Failed: ${failedCount}`);
  console.log('===============================================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runE2eTests().catch(err => {
  console.error('Test runner caught unexpected fatal error:', err);
  process.exit(1);
});

