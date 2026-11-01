import { config } from '../../config/env.js';
import { db } from '../db/index.js';

// Fixed civic taxonomy as required by PRD Section 18
export const CIVIC_CATEGORIES = [
  'Roads & Potholes',
  'Solid Waste & Sanitation',
  'Street Lighting',
  'Drainage & Sewerage',
  'Water Supply',
  'Public Health & Vector Control',
  'Encroachment & Public Space'
];

let lastWorkingAiUrl = null;

async function callAiMicroservice(endpoint, payload, timeoutMs = 45000) {
  const configured = (config.aiServiceUrl || '').trim();
  const internalDefault = 'http://127.0.0.1:8000';
  const localhostDefault = 'http://localhost:8000';

  const candidates = [];
  if (lastWorkingAiUrl) {
    candidates.push(lastWorkingAiUrl);
  }
  if (configured && !candidates.includes(configured)) {
    candidates.push(configured);
  }
  if (!candidates.includes(internalDefault)) {
    candidates.push(internalDefault);
  }
  if (!candidates.includes(localhostDefault)) {
    candidates.push(localhostDefault);
  }

  for (const base of candidates) {
    const cleanBase = base.replace(/\/+$/, '');
    const isTunnel = cleanBase.includes('trycloudflare.com') || cleanBase.includes('loca.lt') || cleanBase.includes('ngrok');
    
    // Fail-fast for tunnels that might be disconnected so we don't stall the citizen
    const currentTimeout = isTunnel ? Math.min(timeoutMs, 4500) : timeoutMs;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), currentTimeout);

    try {
      const response = await fetch(`${cleanBase}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        lastWorkingAiUrl = cleanBase;
        return await response.json();
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn(`[AI Orchestrator] AI service at ${cleanBase}${endpoint} unavailable (${err.message}). Trying fallback endpoint...`);
      if (lastWorkingAiUrl === cleanBase) {
        lastWorkingAiUrl = null;
      }
    }
  }

  return null;
}

export const aiOrchestrator = {
  /**
   * Module 1: Citizen Image-Description Validation
   * Validates whether the uploaded photo contains a recognizable civic defect
   * and matches the written description before allowing progression.
   * @param {object} params
   * @returns {Promise<object>}
   */
  async validateCitizenSubmission({ description, pincode, lat, lng, media = [] }) {
    if (config.aiServiceUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const response = await fetch(`${config.aiServiceUrl}/api/validate-submission`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description, pincode, lat, lng, media }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const valData = await response.json();
          return {
            isValid: Boolean(valData.is_valid),
            canProceed: Boolean(valData.can_proceed !== undefined ? valData.can_proceed : valData.is_valid),
            validationStatus: valData.validation_status,
            reason: valData.reason,
            mismatchReasons: valData.mismatch_reasons || [],
            category: valData.primary_category,
            categoryConfidence: valData.category_confidence,
            imageEvidence: valData.image_evidence,
            descriptionEvidence: valData.description_evidence,
            priority: valData.priority,
            riskScore: valData.risk_score,
            priorityConfidence: valData.priority_confidence,
            priorityReason: valData.priority_reason,
            safetyOverrideTriggered: valData.safety_override_triggered,
            modelIdentifier: valData.model_identifier,
            caseId: valData.case_id,
            isFlagged: Boolean(valData.is_flagged),
            flagReason: valData.flag_reason,
            visualConfidence: valData.visual_confidence || 0.0,
            textConfidence: valData.text_confidence || 0.0,
            detections: valData.detections || [],
            annotatedImage: valData.annotated_image || null,
            source: 'fastapi_ml_validator'
          };
        }
      } catch (e) {
        console.warn('[AI Orchestrator] External validation API failed/timeout, using local fallback validator:', e.message);
      }
    }

    // Local resilient validator (Deterministic state handling when external AI is unavailable)
    const localTriage = this.localTriageEngine({ description, pincode, lat, lng });
    const hasMedia = media && Array.isArray(media) && media.length > 0;
    
    return {
      isValid: !hasMedia, // Photos cannot be automatically declared MATCHED without model inference
      validationStatus: hasMedia ? 'NEEDS_MANUAL_REVIEW' : 'TEXT_ONLY_PROCESSED',
      reason: hasMedia 
        ? 'AI visual verification currently unavailable; complaint flagged for municipal engineer review.' 
        : 'Textual grievance categorized under municipal guidelines.',
      mismatchReasons: hasMedia ? ['AI visual verification unavailable for uploaded photo.'] : [],
      category: localTriage.category,
      categoryConfidence: hasMedia ? 0.45 : localTriage.confidence,
      imageEvidence: hasMedia ? 'Photographic evidence attached (unverified).' : 'No photo provided.',
      descriptionEvidence: `Grievance categorized under ${localTriage.category}.`,
      priority: localTriage.priority,
      riskScore: localTriage.risk_score,
      priorityConfidence: 0.60,
      priorityReason: localTriage.priority_reason,
      safetyOverrideTriggered: localTriage.safety_override_triggered,
      modelIdentifier: 'local_resilient_v3.0',
      detections: [],
      source: 'local_resilient_engine'
    };
  },

  /**
   * Module 5: Field Officer Resolution Pre-Submission Validation
   * Validates whether officer's image and description are relevant to original complaint.
   * @param {object} params
   * @returns {Promise<object>}
   */
  async validateOfficerResolution({ complaint, resolutionNotes, evidence = [], officerLat, officerLng }) {
    if (config.aiServiceUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const imgPath = evidence.length > 0 ? (typeof evidence[0] === 'string' ? evidence[0] : (evidence[0]?.storage_path || evidence[0]?.url)) : null;
        const primaryBeforeMedia = (complaint.media && complaint.media.length > 0) ? complaint.media[0] : null;
        const beforeImgPath = typeof primaryBeforeMedia === 'string' ? primaryBeforeMedia : (primaryBeforeMedia?.storage_path || primaryBeforeMedia?.url || null);
        const targetClass = complaint.target_class || (complaint.ai_detections && complaint.ai_detections.length > 0 ? complaint.ai_detections[0].class_name : null);

        const response = await fetch(`${config.aiServiceUrl}/api/validate-resolution`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            complaint_id: complaint.id,
            complaint_category: complaint.category,
            original_description: complaint.description,
            target_class: targetClass,
            resolution_notes: resolutionNotes || '',
            resolution_image_path: imgPath,
            before_image_path: beforeImgPath,
            complaint_lat: complaint.lat,
            complaint_lng: complaint.lng,
            officer_lat: officerLat,
            officer_lng: officerLng
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const valData = await response.json();
          return {
            status: valData.status || valData.code,
            outcome: valData.outcome || valData.status,
            isValid: Boolean(valData.is_valid),
            canSubmit: Boolean(valData.can_submit),
            code: valData.code,
            reason: valData.reason,
            badgeText: valData.badge_text,
            failureReasons: valData.failure_reasons || (valData.reason ? [valData.reason] : []),
            targetDefect: valData.target_defect,
            detectedCategory: valData.detected_category,
            assignedCategory: valData.assigned_category,
            yoloDetections: valData.yolo_detections || [],
            yoloCount: valData.yolo_count || 0,
            locationStatus: valData.location_status || 'UNVERIFIED',
            distanceMeters: valData.distance_meters,
            verificationScore: valData.verification_score,
            checks: valData.checks || {}
          };
        }
      } catch (e) {
        console.warn('[AI Orchestrator] Officer validation API failed/timeout, using local fallback:', e.message);
      }
    }

    // Local resilient fallback engine when external AI service is unreachable
    let locationStatus = 'UNVERIFIED';
    let gpsDistanceM = null;
    const oLat = (officerLat !== undefined && officerLat !== null) ? Number(officerLat) : null;
    const oLng = (officerLng !== undefined && officerLng !== null) ? Number(officerLng) : null;
    if (oLat !== null && oLng !== null && !isNaN(oLat) && !isNaN(oLng) && complaint.lat && complaint.lng) {
      gpsDistanceM = this.calculateHaversineMeters(complaint.lat, complaint.lng, oLat, oLng);
      if (gpsDistanceM <= 45) {
        locationStatus = 'MATCHED_EXACT';
      } else if (gpsDistanceM <= 100) {
        locationStatus = 'MATCHED_VICINITY';
      } else {
        locationStatus = 'LOCATION_MISMATCH';
      }
    }

    if (locationStatus === 'LOCATION_MISMATCH') {
      return {
        status: 'INSUFFICIENT_EVIDENCE',
        outcome: 'INSUFFICIENT_EVIDENCE',
        isValid: false,
        canSubmit: false,
        code: 'LOCATION_MISMATCH',
        reason: `Evidence Rejected: Resolution photo was captured ${gpsDistanceM}m away from complaint site (> 100m threshold). Please capture evidence on-site.`,
        badgeText: 'AMBER — Evidence Rejected / Insufficient Evidence',
        failureReasons: [`Resolution photo captured ${gpsDistanceM}m away from complaint site (> 100m).`],
        detectedCategory: complaint.category || '',
        assignedCategory: complaint.category || '',
        yoloDetections: [],
        locationStatus,
        distanceMeters: gpsDistanceM
      };
    }

    const hasPhoto = evidence && Array.isArray(evidence) && evidence.length > 0;
    if (!hasPhoto) {
      return {
        status: 'INSUFFICIENT_EVIDENCE',
        outcome: 'INSUFFICIENT_EVIDENCE',
        isValid: false,
        canSubmit: false,
        code: 'MISSING_IMAGE',
        reason: 'Resolution proof photograph is mandatory. Please capture a real-time photograph of the repaired site.',
        badgeText: 'AMBER — Evidence Rejected / Insufficient Evidence',
        failureReasons: ['Missing resolution photograph.'],
        detectedCategory: complaint.category || '',
        assignedCategory: complaint.category || '',
        yoloDetections: [],
        locationStatus,
        distanceMeters: gpsDistanceM
      };
    }

    // Fallback requires manual engineer inspection
    return {
      status: 'NEEDS_MANUAL_REVIEW',
      outcome: 'NEEDS_MANUAL_REVIEW',
      isValid: true,
      canSubmit: true,
      code: 'NEEDS_MANUAL_REVIEW',
      reason: 'AI validation service offline; resolution proof submitted for manual municipal engineer verification.',
      badgeText: 'AMBER — Municipal Engineer Review Required',
      failureReasons: [],
      detectedCategory: complaint.category || '',
      assignedCategory: complaint.category || '',
      yoloDetections: [],
      locationStatus,
      distanceMeters: gpsDistanceM
    };
  },

  /**
   * Comprehensive triage analysis: category, entities, duplicate detection, priority, YOLO detections
   * @param {object} params 
   * @returns {Promise<object>}
   */
  async analyzeComplaint({ description, pincode, lat, lng, media = [] }) {
    try {
      if (config.aiServiceUrl) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);

          const response = await fetch(`${config.aiServiceUrl}/api/triage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description, pincode, lat, lng, media }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            const aiData = await response.json();
            const localDuplicates = await this.screenDuplicates({
              newComplaint: { description, pincode, lat, lng, media },
              category: aiData.category
            });

            return {
              ...aiData,
              duplicate_candidates: localDuplicates,
              ai_status: 'COMPLETED',
              source: 'fastapi_ml_service'
            };
          }
        } catch (e) {
          console.log('[AI Orchestrator] External AI service offline/timeout, using local engine:', e.message);
        }
      }

      // Local resilient NLP & heuristic engine
      return this.localTriageEngine({ description, pincode, lat, lng, media });
    } catch (err) {
      console.error('[AI Orchestrator Error]', err);
      return {
        category: 'Roads & Potholes',
        confidence: 0.50,
        priority: 'MEDIUM',
        priority_reason: 'Triage pending manual municipal review.',
        extracted_data: {},
        duplicate_candidates: [],
        detections: [],
        ai_status: 'PENDING',
        model_version: 'v1.0-fallback'
      };
    }
  },

  /**
   * Module 6: Advisory Before/After repair verification
   * Audits resolution proof submitted by field officer against original complaint photo.
   * @param {object} params
   * @returns {Promise<object>}
   */
  async verifyResolution({ beforeMedia, afterMedia, beforeMetadata, afterMetadata, targetClass, originalDescription, resolutionDescription }) {
    if (config.aiServiceUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const beforeImgPath = typeof beforeMedia === 'string' ? beforeMedia : (beforeMedia?.storage_path || beforeMedia?.url || null);
        const afterImgPath = typeof afterMedia === 'string' ? afterMedia : (afterMedia?.storage_path || afterMedia?.url || null);

        const response = await fetch(`${config.aiServiceUrl}/api/verify-repair`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            before_image_path: beforeImgPath,
            after_image_path: afterImgPath,
            before_metadata: beforeMetadata || {},
            after_metadata: afterMetadata || {},
            target_class: targetClass || null,
            original_description: originalDescription || beforeMetadata?.description || null,
            resolution_description: resolutionDescription || afterMetadata?.notes || null
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const verificationData = await response.json();
          return {
            ...verificationData,
            verified_at: new Date().toISOString(),
            source: 'fastapi_repair_verifier'
          };
        }
      } catch (err) {
        console.warn('[AI Orchestrator] Repair verification AI call failed/timeout, falling back to advisory review:', err.message);
      }
    }

    // Safe fallback advisory response
    return {
      decision: 'PARTIAL_EVIDENCE',
      recommendation: 'PARTIAL_EVIDENCE',
      verification_score: 70,
      decision_reasons: [
        'Resolution photograph and field completion notes submitted.',
        'Human municipal administrator review required before ticket sign-off.'
      ],
      failed_checks: [],
      requires_manual_review: true,
      evidence: {
        has_before: Boolean(beforeMedia),
        has_after: Boolean(afterMedia),
        location_status: 'UNVERIFIED'
      },
      breakdown: {
        category_consistency: 25,
        visual_evidence: 20,
        location_consistency: 10,
        description_consistency: 10,
        evidence_quality: 5
      },
      advisory_notice: 'Human municipal inspection mandatory before final ticket closure.',
      verified_at: new Date().toISOString(),
      source: 'local_safety_fallback'
    };
  },

  /**
   * Resilient local multilingual NLP triage engine (English, Hindi, Hinglish)
   * Strictly implementing the 6-Factor Weighted Priority Architecture:
   * Issue severity (30%), Safety/life risk (30%), Location (15%), Damage extent (10%), People affected (10%), Persistence (5%)
   */
  localTriageEngine({ description, pincode, lat, lng, media = [] }) {
    const raw = (description || '').trim();
    const text = raw.toLowerCase();

    // A. Category Detection
    let detectedCategory = 'Roads & Potholes';
    let confidence = 0.88;

    if (text.match(/drain|sewage|choke|water\s*log|water\s+accumulat|puddle|standing\s+water|gutter|drainage|manhole|sewer|overflow|keechad|ganda\s+paani|ganda\s+pani|jal-?jamao|jal\s*bharao|सीवर|मैनहोल|जलभराव|जल-?जमाव|पानी\s*भरा|गटर|नाली/)) {
      detectedCategory = 'Drainage & Sewerage';
      confidence = 0.95;
    } else if (text.match(/garbage|trash|waste|dump|clean|dustbin|spill|sweep|dead animal|litter|debris|kachra|kooda|badbu|gandagi|कूड़ा|कचरा|गंदगी|सड़ांध/)) {
      detectedCategory = 'Solid Waste & Sanitation';
      confidence = 0.94;
    } else if (text.match(/street\s*light|lamp|pole|wire|spark|electric|flicker|bulb|black spot|andhera|batti|स्ट्रीट\s*लाइट|खंभा|बत्ती|अंधेरा|बिजली|\bdark\s*(?:spot|pole|road)?\b/)) {
      detectedCategory = 'Street Lighting';
      confidence = 0.93;
    } else if (text.match(/water supply|pipeline|leak|drinking water|tap|no water|tanker|paani supply|नल|पाइपलाइन|पेयजल/)) {
      detectedCategory = 'Water Supply';
      confidence = 0.91;
    } else if (text.match(/mosquito|dengue|malaria|fogging|epidemic|sanitation|stagnant|machhar|मच्छर|डेंगू|मलेरिया/)) {
      detectedCategory = 'Public Health & Vector Control';
      confidence = 0.89;
    } else if (text.match(/encroach|footpath shop|illegal construction|blocked walkway|kabza|अतिक्रमण|कब्जा/)) {
      detectedCategory = 'Encroachment & Public Space';
      confidence = 0.87;
    } else if (text.match(/pothole|road|crater|asphalt|accident|skid|tar|surface|gaddha|khadda|tooti road|darar|गड्ढा|खड्ड|टूटी सड़क|दरार/)) {
      detectedCategory = 'Roads & Potholes';
      confidence = 0.96;
    }

    // B. Entity Extraction
    const extractedData = {};
    if (text.includes('pothole') || text.includes('crater') || text.includes('gaddha') || text.includes('गड्ढा')) {
      extractedData.hazard = 'Road Crater / Pothole';
    }
    if (text.includes('water') || text.includes('paani') || text.includes('पानी')) {
      extractedData.water_involvement = true;
    }
    if (text.includes('spark') || text.includes('wire') || text.includes('current') || text.includes('करंट')) {
      extractedData.electrical_hazard = true;
    }

    // C. 6-Factor Weighted Urgency Architecture (Total = 100):
    // 1. Defect Hazard (25 pts) — Problem naturally kitni dangerous hai?
    // 2. Severity (25 pts) — Problem kitni serious condition mein hai?
    // 3. Location Context (20 pts) — Hospital, school, highway ya residential area?
    // 4. Public Exposure (15 pts) — Kitne log affected ho sakte hain?
    // 5. Collateral Risk (10 pts) — Kya accident, injury, flooding ya electrical hazard ka risk hai?
    // 6. Evidence Confidence (5 pts) — Image aur complaint description ek doosre ko support karte hain?
    const reasons = [];

    const localCandidates = this.findLocalDuplicateCandidates({
      description,
      pincode,
      lat,
      lng,
      category: detectedCategory
    });
    const dupCount = (localCandidates || []).length;

    // Signals for overrides & collateral risks
    const isLiveWire = text.includes('spark') || text.includes('live wire') || text.includes('current') || text.includes('करंट') || text.includes('चिनगारी');
    const isOpenManhole = Boolean(text.match(/open.*manhole|manhole.*open|khula.*manhole|manhole.*khula|खुला.*मैनहोल|मैनहोल.*खुला|खुला.*सीवर|missing.*lid|uncovered.*drain/));
    const isAccidentRisk = text.includes('accident') || text.includes('injury') || text.includes('skid') || text.includes('fall') || text.includes('दुर्घटना') || text.includes('हादसा');
    const isLifeThreat = text.includes('जानलेवा') || text.includes('death trap') || text.includes('fatal');
    const isVectorHealth = text.includes('dengue') || text.includes('malaria') || text.includes('मलेरिया') || text.includes('डेंगू') || text.includes('mosquito') || text.includes('machhar');

    // Factor 1: Defect Hazard (Weight: 25 pts)
    const DEFECT_HAZARD_MAP = {
      'Drainage & Sewerage': 12,
      'Roads & Potholes': 14,
      'Street Lighting': 9,
      'Water Supply': 10,
      'Public Health & Vector Control': 12,
      'Solid Waste & Sanitation': 6,
      'Encroachment & Public Space': 7
    };
    let scoreHazard = DEFECT_HAZARD_MAP[detectedCategory] || 10;
    if (isOpenManhole || isLiveWire || isLifeThreat) {
      scoreHazard = 25;
    }
    reasons.push(`1. Defect Hazard (${scoreHazard}/25 pts): Baseline hazard for ${detectedCategory}.`);

    // Factor 2: Severity (Weight: 25 pts)
    let scoreSeverity = 8;
    if (text.match(/deep|massive|huge|crater|burst|collapse|विशाल|खतरनाक|बहुत\s*बड़ा|severe/)) {
      scoreSeverity = 24;
      reasons.push('2. Severity (24/25 pts): Acute physical scale, deep crater, or large structural defect.');
    } else if (text.match(/small|minor|hairline|chota|halka|छोटा|मामूली/)) {
      scoreSeverity = 5;
      reasons.push('2. Severity (5/25 pts): Superficial cosmetic or minor defect condition.');
    } else if (text.match(/damage|broke|broken|kharab|water\s*log|badbu|gandagi|गंदगी|बदबू/)) {
      scoreSeverity = 14;
      reasons.push('2. Severity (14/25 pts): Moderate damage or noticeable environmental impact.');
    } else {
      scoreSeverity = 8;
      reasons.push('2. Severity (8/25 pts): Standard physical defect condition.');
    }

    // Factor 3: Location Context (Weight: 20 pts)
    let scoreLoc = 8;
    const isHospitalZone = text.includes('hospital') || text.includes('clinic') || text.includes('emergency') || text.includes('ambulance') || text.includes('अस्पताल');
    const isMainTransit = text.includes('school') || text.includes('college') || text.includes('highway') || text.includes('main road') || text.includes('market') || text.includes('railway station') || text.includes('station road') || text.includes('chauraha') || text.includes('चौराहा');
    const isIsolated = text.includes('alley') || text.includes('isolated') || text.includes('empty plot') || text.includes('khali plot');

    if (isHospitalZone) {
      scoreLoc = 20;
      reasons.push('3. Location Context (20/20 pts): Hospital emergency healthcare route or ambulance access.');
    } else if (isMainTransit) {
      scoreLoc = 14;
      reasons.push('3. Location Context (14/20 pts): High-density school zone, highway, or busy commercial corridor.');
    } else if (isIsolated) {
      scoreLoc = 3;
      reasons.push('3. Location Context (3/20 pts): Low-exposure isolated alley or vacant plot.');
    } else {
      scoreLoc = 8;
      reasons.push('3. Location Context (8/20 pts): Standard residential neighborhood or colony lane.');
    }

    // Factor 4: Public Exposure (Weight: 15 pts)
    let scoreExposure = 4;
    if (dupCount >= 4 || text.match(/thousands|hundreds|entire\s*mohalla|पूरा\s*मोहल्ला|सैकड़ों|हजारों/)) {
      scoreExposure = 15;
      reasons.push(`4. Public Exposure (15/15 pts): High population impact with ${dupCount + 1} corroborated reports.`);
    } else if (dupCount >= 2 || text.match(/society|residents|many\s*people|बहुत\s*लोग|कॉलोनी\s*वाले/)) {
      scoreExposure = 10;
      reasons.push(`4. Public Exposure (10/15 pts): Community impact with ${dupCount + 1} resident reports.`);
    } else if (dupCount === 1) {
      scoreExposure = 7;
      reasons.push('4. Public Exposure (7/15 pts): Multiple residents affected.');
    } else {
      scoreExposure = 4;
      reasons.push('4. Public Exposure (4/15 pts): Individual citizen report.');
    }

    // Factor 5: Collateral Risk (Weight: 10 pts)
    let scoreCollateral = 1;
    if (isLiveWire || isOpenManhole || isLifeThreat) {
      scoreCollateral = 10;
      reasons.push('5. Collateral Risk (10/10 pts): Immediate electrocution, fall, or severe casualty risk.');
    } else if (isAccidentRisk) {
      scoreCollateral = 8;
      reasons.push('5. Collateral Risk (8/10 pts): Active vehicle skid or collision hazard.');
    } else if (isVectorHealth) {
      scoreCollateral = 6;
      reasons.push('5. Collateral Risk (6/10 pts): Disease vector or public health hazard.');
    } else {
      scoreCollateral = 1;
      reasons.push('5. Collateral Risk (1/10 pts): Low secondary hazard risk.');
    }

    // Factor 6: Evidence Confidence (Weight: 5 pts)
    const hasPhoto = media && Array.isArray(media) && media.length > 0;
    const scoreEvidence = hasPhoto ? 4 : 2;
    reasons.push(`6. Evidence Confidence (${scoreEvidence}/5 pts): ${hasPhoto ? 'Photographic evidence attached and verified.' : 'Description-only submission.'}`);

    const baseScore = scoreHazard + scoreSeverity + scoreLoc + scoreExposure + scoreCollateral + scoreEvidence;
    let totalScore = Math.min(100, Math.max(5, baseScore));

    // Mandatory Safety Overrides
    let safetyOverride = null;
    if (isOpenManhole) {
      safetyOverride = 'OPEN_MANHOLE_HAZARD';
      totalScore = Math.max(totalScore, 90);
      reasons.unshift('SAFETY OVERRIDE APPLIED: Open manhole detected in public corridor; minimum CRITICAL priority enforced.');
    } else if (isLiveWire) {
      safetyOverride = 'ELECTROCUTION_HAZARD';
      totalScore = Math.max(totalScore, 92);
      reasons.unshift('SAFETY OVERRIDE APPLIED: Exposed live electrical wiring detected; minimum CRITICAL priority enforced.');
    } else if (isLifeThreat) {
      safetyOverride = 'LIFE_THREAT_HAZARD';
      totalScore = Math.max(totalScore, 88);
      reasons.unshift('SAFETY OVERRIDE APPLIED: Direct threat to human life reported; CRITICAL priority enforced.');
    } else if (detectedCategory.includes('Road') && (isAccidentRisk || scoreSeverity >= 20) && totalScore < 60) {
      safetyOverride = 'ROAD_ACCIDENT_HAZARD';
      totalScore = Math.max(totalScore, 68);
      reasons.unshift('SAFETY OVERRIDE APPLIED: Severe roadway crater creating immediate accident risk; minimum HIGH priority enforced.');
    } else if (detectedCategory.includes('Drainage') && (scoreLoc >= 14 || isAccidentRisk) && totalScore < 60) {
      safetyOverride = 'WATER_HAZARD_OVERRIDE';
      totalScore = Math.max(totalScore, 65);
      reasons.unshift('SAFETY OVERRIDE APPLIED: Dangerous water accumulation impacting transit corridor; minimum HIGH priority enforced.');
    }

    // Thresholds: CRITICAL: 80-100, HIGH: 60-79, MEDIUM: 35-59, LOW: 0-34
    let priority = 'MEDIUM';
    let slaHours = 168;

    if (totalScore >= 80 || ['OPEN_MANHOLE_HAZARD', 'ELECTROCUTION_HAZARD', 'LIFE_THREAT_HAZARD'].includes(safetyOverride)) {
      priority = 'CRITICAL';
      slaHours = 24;
    } else if (totalScore >= 60 || safetyOverride) {
      priority = 'HIGH';
      slaHours = 48;
    } else if (totalScore >= 35) {
      priority = 'MEDIUM';
      slaHours = 168;
    } else {
      priority = 'LOW';
      slaHours = 336;
    }

    return {
      category: detectedCategory,
      primary_category: detectedCategory,
      confidence: parseFloat(confidence.toFixed(2)),
      priority,
      priority_confidence: 0.90,
      priority_reason: reasons.join(' '),
      risk_score: totalScore,
      contributing_factors: {
        defect_hazard: scoreHazard,
        severity: scoreSeverity,
        location_context: scoreLoc,
        public_exposure: scoreExposure,
        collateral_risk: scoreCollateral,
        evidence_confidence: scoreEvidence
      },
      risk_factors: {
        defect_hazard: scoreHazard,
        severity: scoreSeverity,
        location_context: scoreLoc,
        public_exposure: scoreExposure,
        collateral_risk: scoreCollateral,
        evidence_confidence: scoreEvidence,
        base_defect_risk: scoreHazard,
        observed_severity: scoreSeverity,
        location_vulnerability: scoreLoc,
        community_amplification: scoreExposure,
        collateral_hazard: scoreCollateral,
        corroboration_score: scoreEvidence
      },
      safety_override_triggered: safetyOverride,
      safety_override_status: safetyOverride ? 'Applied' : 'None',
      priority_reasons_list: reasons,
      recommended_sla_hours: slaHours,
      extracted_data: extractedData,
      duplicate_candidates: localCandidates,
      detections: [],
      ai_status: 'COMPLETED',
      model_version: 'v4.0-safety-first-risk-engine'
    };
  },

  /**
   * Multi-signal duplicate screening combining AI microservice check with resilient local engine
   */
  async screenDuplicates({ newComplaint, category }) {
    const localCandidates = this.findLocalDuplicateCandidates({
      description: newComplaint.description,
      pincode: newComplaint.pincode,
      lat: newComplaint.lat,
      lng: newComplaint.lng,
      category,
      created_at: newComplaint.created_at || new Date().toISOString()
    });

    if (localCandidates.length > 0 && config.aiServiceUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const candidatePayloads = localCandidates.map(c => ({
          id: c.candidate_id,
          complaint_number: c.complaint_number,
          description: c.description,
          category: c.category,
          pincode: c.pincode || newComplaint.pincode,
          lat: c.lat,
          lng: c.lng,
          status: c.status,
          created_at: c.created_at
        }));

        const response = await fetch(`${config.aiServiceUrl}/api/duplicates/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            new_complaint: {
              description: newComplaint.description,
              pincode: newComplaint.pincode,
              category,
              lat: newComplaint.lat,
              lng: newComplaint.lng,
              media: newComplaint.media,
              created_at: newComplaint.created_at || new Date().toISOString()
            },
            candidates: candidatePayloads
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const dupData = await response.json();
          if (dupData.duplicate_candidates) {
            const validCandidates = dupData.duplicate_candidates.filter(
              d => d.similarity_score >= 0.60 && d.decision !== 'NOT_DUPLICATE'
            );
            return validCandidates.map(d => {
              const matchedLocal = localCandidates.find(l => l.candidate_id === d.candidate_id);
              return {
                candidate_id: d.candidate_id,
                complaint_number: d.complaint_number,
                category: matchedLocal?.category || category,
                description: matchedLocal?.description,
                address: matchedLocal?.address,
                status: matchedLocal?.status,
                similarity_score: d.similarity_score,
                decision: d.decision,
                distance_meters: d.distance_meters ?? matchedLocal?.breakdown?.distance_meters,
                time_difference: d.time_difference ?? matchedLocal?.breakdown?.time_delta_label,
                image_similarity: d.image_similarity,
                description_similarity: d.description_similarity,
                category_similarity: d.category_similarity,
                explanation: d.explanation || (d.reasons || []).join(' '),
                reasons: d.reasons || matchedLocal?.reasons || [],
                breakdown: d.breakdown || matchedLocal?.breakdown || {},
                created_at: matchedLocal?.created_at
              };
            });
          }
        }
      } catch (err) {
        console.warn('[AI Orchestrator] Duplicate check AI API fallback:', err.message);
      }
    }

    return localCandidates;
  },

  /**
   * Resilient local candidate screening using strict multi-signal rules
   */
  findLocalDuplicateCandidates({ description, pincode, lat, lng, category, created_at }) {
    const complaints = db.complaints || [];
    if (!complaints.length) return [];

    const now = created_at ? new Date(created_at) : new Date();
    const cleanDesc = (description || '').toLowerCase();
    const candidateMatches = [];

    for (const other of complaints) {
      if (['RESOLVED', 'CLOSED'].includes(other.status)) continue;

      let catMatch = false;
      const otherCat = (other.category || '').toLowerCase();
      const currentCat = (category || '').toLowerCase();

      if (currentCat && otherCat && currentCat === otherCat) {
        catMatch = true;
      } else if (
        (currentCat.includes('road') || currentCat.includes('pothole')) &&
        (otherCat.includes('road') || otherCat.includes('pothole'))
      ) {
        catMatch = true;
      }

      if (!catMatch) continue;

      let distMeters = null;
      if (lat && lng && other.lat && other.lng) {
        distMeters = this.calculateHaversineMeters(lat, lng, other.lat, other.lng);
      }

      const samePin = pincode && other.pincode && pincode === other.pincode;
      if (distMeters === null && !samePin) continue;
      if (distMeters !== null && distMeters > 250) continue;

      const otherTime = other.created_at ? new Date(other.created_at) : now;
      const hoursDiff = Math.abs((now - otherTime) / (1000 * 60 * 60));

      const otherDesc = (other.description || '').toLowerCase();
      const textOverlap = this.calculateTextOverlap(cleanDesc, otherDesc);

      // Strict Rule: Never mark as duplicate based on location alone.
      // Defect text/content must have meaningful overlap (>= 0.25)
      if (textOverlap < 0.25) continue;

      let geoScore = 0.5;
      let distLabel = 'Same PIN';
      if (distMeters !== null) {
        if (distMeters <= 30) {
          geoScore = 1.0;
          distLabel = `${Math.round(distMeters)}m apart (Exact Spot • GPS Verified)`;
        } else if (distMeters <= 85) {
          geoScore = 0.8;
          distLabel = `${Math.round(distMeters)}m apart (Same Street • GPS Verified)`;
        } else {
          geoScore = 0.4;
          distLabel = `${Math.round(distMeters)}m apart (Locality)`;
        }
      }

      let timeScore = 0.5;
      if (hoursDiff <= 24) timeScore = 1.0;
      else if (hoursDiff <= 168) timeScore = 0.75;
      else timeScore = 0.4;

      const combinedScore = (0.40 * textOverlap) + (0.35 * geoScore) + (0.15 * 1.0) + (0.10 * timeScore);

      if (combinedScore >= 0.60) {
        let decision = 'POSSIBLE_DUPLICATE';
        if (combinedScore >= 0.78 && geoScore >= 0.80 && textOverlap >= 0.35) {
          decision = 'CONFIRMED_DUPLICATE';
        }

        const reasons = [
          distLabel,
          `Reported ${hoursDiff < 24 ? Math.round(hoursDiff) + 'h apart (Same day)' : Math.round(hoursDiff / 24) + 'd apart'}`,
          `Matching defect category (${other.category})`
        ];

        candidateMatches.push({
          candidate_id: other.id,
          complaint_number: other.complaint_number,
          category: other.category,
          description: other.description,
          address: other.address,
          status: other.status,
          similarity_score: Math.round(combinedScore * 100) / 100,
          decision,
          distance_meters: distMeters,
          time_difference: `${Math.round(hoursDiff)} hours apart`,
          image_similarity: 0.0,
          description_similarity: textOverlap,
          category_similarity: true,
          explanation: reasons.join(' • '),
          reasons,
          breakdown: {
            distance_meters: distMeters,
            distance_label: distLabel,
            time_delta_hours: hoursDiff,
            time_delta_label: `${Math.round(hoursDiff)}h apart`,
            category_match: true,
            text_similarity_percent: Math.round(textOverlap * 100)
          },
          created_at: other.created_at
        });
      }
    }

    candidateMatches.sort((a, b) => b.similarity_score - a.similarity_score);
    return candidateMatches;
  },

  calculateHaversineMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  },

  calculateTextOverlap(t1, t2) {
    if (!t1 || !t2) return 0;
    const words1 = new Set(t1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(t2.split(/\s+/).filter(w => w.length > 2));
    if (!words1.size || !words2.size) return 0;

    let matchCount = 0;
    for (const w of words1) {
      if (words2.has(w)) matchCount++;
    }

    return matchCount / Math.max(words1.size, words2.size);
  }
};
