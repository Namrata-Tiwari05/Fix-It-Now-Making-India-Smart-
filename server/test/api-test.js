import http from 'http';

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body), headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('🏛️  FIXITNOW CIVIC GRIEVANCE PLATFORM — COMPREHENSIVE TEST SUITE');
  console.log('===============================================================\n');

  const base = { hostname: 'localhost', port: 5000 };
  let passedCount = 0;
  let totalTests = 0;

  function assertTest(title, condition, details = null) {
    totalTests++;
    if (condition) {
      passedCount++;
      console.log(`[PASS] ${title}`);
      if (details) console.log('       ', JSON.stringify(details));
    } else {
      console.error(`[FAIL] ${title}`);
      if (details) console.error('       ', JSON.stringify(details));
    }
  }

  // 1. Health Check
  const health = await makeRequest({ ...base, path: '/api/health', method: 'GET' });
  assertTest('1. System Health Check', health.status === 200 && health.data.status === 'healthy', health.data);

  // 2. Problem Location PIN Jurisdiction: 273001 -> Gorakhpur
  const pinGmc = await makeRequest({ ...base, path: '/api/municipalities/by-pincode/273001', method: 'GET' });
  assertTest('2. PIN 273001 Resolution -> Gorakhpur Municipal Corporation',
    pinGmc.status === 200 && pinGmc.data?.data?.municipality_name === 'Gorakhpur Municipal Corporation',
    pinGmc.data?.data
  );

  // 3. Unmapped PIN: 999999 -> Routing Review
  const pinUnmapped = await makeRequest({ ...base, path: '/api/municipalities/by-pincode/999999', method: 'GET' });
  assertTest('3. Unmapped PIN 999999 Resolution -> ROUTING_REVIEW Queue',
    pinUnmapped.status === 200 && pinUnmapped.data?.data?.is_routing_review === true,
    pinUnmapped.data?.data
  );

  // 4. AI Pre-Analysis
  const preAnalyze = await makeRequest({
    ...base,
    path: '/api/complaints/pre-analyze',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    description: 'A deep crater and broken drain near the intersection causing severe traffic hazard and flooding.',
    pincode: '273001'
  });
  assertTest('4. AI Pre-Analysis Engine (Prediction, Priority, Urgency)',
    preAnalyze.status === 200 && preAnalyze.data?.data?.ai_recommendation?.category,
    {
      category: preAnalyze.data?.data?.ai_recommendation?.category,
      confidence: preAnalyze.data?.data?.ai_recommendation?.confidence,
      priority: preAnalyze.data?.data?.ai_recommendation?.priority
    }
  );

  // 5. Citizen Authentication Flow (OTP -> Onboarding -> Profile)
  const testPhone = '+919876543210';
  const otpRes = await makeRequest({
    ...base,
    path: '/api/auth/citizen/send-otp',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { phone: testPhone });
  
  const devOtp = otpRes.data?.data?.devOtp;
  assertTest('5a. Citizen Send OTP', otpRes.status === 200 && (devOtp || otpRes.data?.data?.phone), {
    phone: otpRes.data?.data?.phone,
    expiresIn: otpRes.data?.data?.expiresInSeconds
  });

  const verifyOtpRes = await makeRequest({
    ...base,
    path: '/api/auth/citizen/verify-otp',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { phone: testPhone, otp: devOtp || '1234' });

  assertTest('5b. Citizen Verify OTP', verifyOtpRes.status === 200 && verifyOtpRes.data?.data?.verified === true, {
    verified: verifyOtpRes.data?.data?.verified,
    isFirstTime: verifyOtpRes.data?.data?.isFirstTime
  });

  // Citizen Profile Creation with State, District, and PIN Code
  const onboardRes = await makeRequest({
    ...base,
    path: '/api/auth/citizen/onboard',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    phone: testPhone,
    name: 'Pooja Verma',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    state: 'Uttar Pradesh',
    district: 'Gorakhpur',
    pincode: '273001'
  });

  const citizenToken = onboardRes.data?.data?.token || verifyOtpRes.data?.data?.token;
  assertTest('5c. Citizen Profile Creation with State, District, PIN Code',
    onboardRes.status === 201 && onboardRes.data?.data?.profile?.is_profile_completed === true && onboardRes.data?.data?.profile?.pincode === '273001',
    {
      name: onboardRes.data?.data?.profile?.name,
      state: onboardRes.data?.data?.profile?.state,
      district: onboardRes.data?.data?.profile?.district,
      pincode: onboardRes.data?.data?.profile?.pincode,
      role: onboardRes.data?.data?.profile?.role
    }
  );

  // 5d. Citizen Profile Verification via GET /api/auth/me
  const citizenMe = await makeRequest({
    ...base,
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${citizenToken}` }
  });
  assertTest('5d. Authenticated Citizen Identity (/api/auth/me)',
    citizenMe.status === 200 && citizenMe.data?.data?.role === 'citizen',
    { name: citizenMe.data?.data?.name, role: citizenMe.data?.data?.role }
  );

  // 6. Staff Shared Login — Master Admin (NO role param, resolved from DB)
  const masterLogin = await makeRequest({
    ...base,
    path: '/api/auth/staff/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: 'masteradmin@fixitnow.gov',
    password: 'FixItNow@2026!'
  });

  const masterToken = masterLogin.data?.data?.token;
  assertTest('6. Staff Login: Master Admin (Authoritative Role Resolution)',
    masterLogin.status === 200 && masterLogin.data?.data?.user?.role === 'master_admin',
    {
      email: masterLogin.data?.data?.user?.email,
      role: masterLogin.data?.data?.user?.role,
      name: masterLogin.data?.data?.user?.name
    }
  );

  // 7. Master Admin Global Overview & Municipality Operations
  const masterOverview = await makeRequest({
    ...base,
    path: '/api/master/overview',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${masterToken}` }
  });

  assertTest('7. Master Admin Global Overview',
    masterOverview.status === 200 && typeof masterOverview.data?.data?.totalComplaints === 'number',
    {
      totalComplaints: masterOverview.data?.data?.totalComplaints,
      activeMunicipalities: masterOverview.data?.data?.activeMunicipalities,
      unmappedRoutingQueue: masterOverview.data?.data?.unmappedRoutingQueue
    }
  );

  // 8. Staff Shared Login — Municipal Admin (Gorakhpur GMC)
  const muniLogin = await makeRequest({
    ...base,
    path: '/api/auth/staff/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: 'admin.gmc@gorakhpurmc.gov.in',
    password: 'FixItNow@2026!'
  });

  const municipalToken = muniLogin.data?.data?.token;
  const gmcMuniId = muniLogin.data?.data?.user?.municipality_id;
  assertTest('8. Staff Login: Municipal Admin (GMC Authoritative Profile)',
    muniLogin.status === 200 && muniLogin.data?.data?.user?.role === 'municipal_admin' && gmcMuniId,
    {
      email: muniLogin.data?.data?.user?.email,
      role: muniLogin.data?.data?.user?.role,
      municipality_name: muniLogin.data?.data?.user?.municipality_name
    }
  );

  // 9. Municipal Admin: Create Department & Recruit Field Officer
  const newDeptRes = await makeRequest({
    ...base,
    path: '/api/municipal/departments',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${municipalToken}`
    }
  }, {
    name: 'Sanitation & Solid Waste',
    code: 'SAN-01',
    description: 'City garbage collection and street cleaning'
  });

  assertTest('9a. Municipal Admin: Create Department',
    newDeptRes.status === 201 && newDeptRes.data?.data?.name === 'Sanitation & Solid Waste',
    { id: newDeptRes.data?.data?.id, name: newDeptRes.data?.data?.name }
  );

  const newOfficerRes = await makeRequest({
    ...base,
    path: '/api/municipal/officers',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${municipalToken}`
    }
  }, {
    name: 'Vikram Singh',
    email: 'officer.vikram@gorakhpurmc.gov.in',
    password: 'FixItNow@2026!',
    phone: '+919876543299',
    department_id: newDeptRes.data?.data?.id || 'd1111111-1111-1111-1111-111111111111'
  });

  assertTest('9b. Municipal Admin: Recruit Field Officer',
    newOfficerRes.status === 201 && (newOfficerRes.data?.data?.profile?.role === 'field_officer' || newOfficerRes.data?.data?.officer),
    {
      id: newOfficerRes.data?.data?.officer?.id,
      name: newOfficerRes.data?.data?.profile?.name,
      email: newOfficerRes.data?.data?.profile?.email,
      role: newOfficerRes.data?.data?.profile?.role
    }
  );

  // 10. Staff Shared Login — Field Officer
  const officerLogin = await makeRequest({
    ...base,
    path: '/api/auth/staff/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: 'officer.roads@gorakhpurmc.gov.in',
    password: 'FixItNow@2026!'
  });

  const officerToken = officerLogin.data?.data?.token;
  assertTest('10. Staff Login: Field Officer (Authoritative Profile)',
    officerLogin.status === 200 && officerLogin.data?.data?.user?.role === 'field_officer',
    {
      email: officerLogin.data?.data?.user?.email,
      role: officerLogin.data?.data?.user?.role,
      name: officerLogin.data?.data?.user?.name
    }
  );

  // 11. End-to-End Complaint Lifecycle
  // Step 11a: Citizen Submits Complaint with Problem PIN 273001
  const createComplaintRes = await makeRequest({
    ...base,
    path: '/api/complaints',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${citizenToken}`
    }
  }, {
    description: 'Deep cave-in and broken water pipe on Park Road near Civil Lines.',
    pincode: '273001',
    address: 'Park Road, Civil Lines',
    landmark: 'Opposite State Bank',
    category: 'Water & Sewage',
    priority: 'HIGH'
  });

  const complaint = createComplaintRes.data?.data?.complaint;
  const complaintId = complaint?.id;
  assertTest('11a. Citizen Submits Complaint (PIN 273001 -> Gorakhpur GMC)',
    createComplaintRes.status === 201 && complaintId && complaint?.status === 'SUBMITTED',
    {
      id: complaintId,
      number: complaint?.complaint_number,
      status: complaint?.status,
      municipality: createComplaintRes.data?.data?.routing_info?.municipality_name
    }
  );

  // Step 11b: Municipal Admin views GMC complaints queue
  const muniQueue = await makeRequest({
    ...base,
    path: '/api/municipal/complaints',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${municipalToken}` }
  });

  const foundInQueue = muniQueue.data?.data?.some(c => c.id === complaintId);
  assertTest('11b. Municipal Admin Queue contains submitted complaint',
    muniQueue.status === 200 && foundInQueue,
    { totalInQueue: muniQueue.data?.data?.length }
  );

  // Step 11c: Municipal Admin Assigns Department and Field Officer
  const assignRes = await makeRequest({
    ...base,
    path: `/api/municipal/complaints/${complaintId}/assign`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${municipalToken}`
    }
  }, {
    department_id: 'd1111111-1111-1111-1111-111111111111',
    officer_id: '4d98a7c1-fd90-4184-b9de-8cd021e1fb76',
    notes: 'Dispatched emergency repair team'
  });

  assertTest('11c. Municipal Admin Assigns Complaint -> Status: ASSIGNED',
    assignRes.status === 200 && assignRes.data?.data?.status === 'ASSIGNED',
    { status: assignRes.data?.data?.status, assignedOfficer: assignRes.data?.data?.assigned_officer_name }
  );

  // Step 11d: Field Officer updates status to IN_PROGRESS
  const officerProgress = await makeRequest({
    ...base,
    path: `/api/officer/complaints/${complaintId}/status`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${officerToken}`
    }
  }, {
    status: 'IN_PROGRESS',
    notes: 'Excavation team on-site. Repairing damaged pipe.'
  });

  assertTest('11d. Field Officer Marks In-Progress -> Status: IN_PROGRESS',
    officerProgress.status === 200 && officerProgress.data?.data?.status === 'IN_PROGRESS',
    { status: officerProgress.data?.data?.status }
  );

  // Step 11e: Field Officer Submits Resolution with Photo Evidence
  const resolutionRes = await makeRequest({
    ...base,
    path: `/api/officer/complaints/${complaintId}/resolution`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${officerToken}`
    }
  }, {
    notes: 'Replaced cracked section of main pipeline and resurfaced road with cold asphalt.',
    evidence: [
      'https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?w=500',
      'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=500'
    ]
  });

  assertTest('11e. Field Officer Submits Resolution -> Status: RESOLUTION_SUBMITTED',
    resolutionRes.status === 200 && resolutionRes.data?.data?.status === 'RESOLUTION_SUBMITTED',
    {
      status: resolutionRes.data?.data?.status,
      evidenceCount: resolutionRes.data?.data?.resolution_evidence?.length
    }
  );

  // Step 11f: Municipal Admin Verifies and Approves Resolution
  const verifyAdmin = await makeRequest({
    ...base,
    path: `/api/municipal/complaints/${complaintId}/verify-resolution`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${municipalToken}`
    }
  }, {
    approved: true,
    notes: 'Photo evidence inspected and confirmed by zonal supervisor.'
  });

  assertTest('11f. Municipal Admin Verifies Resolution -> Status: VERIFICATION',
    verifyAdmin.status === 200 && verifyAdmin.data?.data?.status === 'VERIFICATION',
    { status: verifyAdmin.data?.data?.status }
  );

  // Step 11g: Citizen Confirms Resolution and gives 5-Star Rating
  const citizenConfirm = await makeRequest({
    ...base,
    path: `/api/complaints/${complaintId}/verify`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${citizenToken}`
    }
  }, {
    action: 'CONFIRM',
    rating: 5,
    feedback: 'Prompt and high quality repair work by Gorakhpur Municipal Corporation!'
  });

  assertTest('11g. Citizen Confirms Resolution -> Status: RESOLVED (5-Star Rating)',
    citizenConfirm.status === 200 && citizenConfirm.data?.data?.status === 'RESOLVED' && citizenConfirm.data?.data?.citizen_rating === 5,
    {
      status: citizenConfirm.data?.data?.status,
      rating: citizenConfirm.data?.data?.citizen_rating,
      feedback: citizenConfirm.data?.data?.citizen_feedback
    }
  );

  // 12. Complete Audit Log History Verification
  const complaintDetails = await makeRequest({
    ...base,
    path: `/api/complaints/${complaintId}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${citizenToken}` }
  });

  const auditHistory = complaintDetails.data?.data?.audit_history || [];
  const requiredActions = ['SUBMITTED', 'ASSIGNED', 'OFFICER_STATUS_UPDATE', 'RESOLUTION_SUBMITTED', 'RESOLUTION_VERIFIED', 'CITIZEN_CONFIRMED'];
  const actionsPresent = requiredActions.every(act => auditHistory.some(log => log.action === act));

  assertTest('12. Comprehensive Audit Trail (Chronological, Actors, Transitions)',
    complaintDetails.status === 200 && auditHistory.length >= 5 && actionsPresent,
    {
      totalAuditEntries: auditHistory.length,
      actionsRecorded: auditHistory.map(a => `${a.action} by ${a.actor_role}`)
    }
  );

  // 13. Strict Cross-Municipality Data Isolation
  // GMC Admin attempting to request complaints from Varanasi Municipal Corporation
  const crossMuniQuery = await makeRequest({
    ...base,
    path: '/api/municipal/complaints?municipality_id=m2222222-2222-2222-2222-222222222222',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${municipalToken}` }
  });

  assertTest('13. Cross-Municipality Isolation Enforcement (403 FORBIDDEN_CROSS_MUNICIPALITY)',
    crossMuniQuery.status === 403 && crossMuniQuery.data?.error?.code === 'FORBIDDEN_CROSS_MUNICIPALITY',
    crossMuniQuery.data?.error
  );

  // 14. Role-Based Access Control (RBAC) Enforcement
  // Citizen token attempting to access Master Admin Overview
  const citizenUnauthorized = await makeRequest({
    ...base,
    path: '/api/master/overview',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${citizenToken}` }
  });

  assertTest('14. Role-Based Authorization: Citizen Blocked from Master Portal (403 FORBIDDEN)',
    citizenUnauthorized.status === 403 && citizenUnauthorized.data?.error?.code === 'FORBIDDEN',
    citizenUnauthorized.data?.error
  );

  console.log('\n===============================================================');
  console.log(`🏁 TEST RESULTS: ${passedCount}/${totalTests} TESTS PASSED`);
  console.log('===============================================================\n');

  if (passedCount === totalTests) {
    console.log('🎉 ALL INTEGRATION AND SECURITY VERIFICATIONS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error(`⚠️  ${totalTests - passedCount} TESTS FAILED.`);
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error running test suite:', err);
  process.exit(1);
});
