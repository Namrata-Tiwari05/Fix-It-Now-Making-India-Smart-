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

export const aiOrchestrator = {
  /**
   * Comprehensive triage analysis: category, entities, duplicate detection, priority
   * @param {object} params 
   * @returns {Promise<object>}
   */
  async analyzeComplaint({ description, pincode, lat, lng, media = [] }) {
    try {
      // 1. Check if external FastAPI AI microservice is responsive
      if (config.aiServiceUrl) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1800);

          const response = await fetch(`${config.aiServiceUrl}/api/triage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description, pincode, lat, lng }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            const aiData = await response.json();
            return {
              ...aiData,
              ai_status: 'COMPLETED',
              source: 'fastapi_ml_service'
            };
          }
        } catch (e) {
          // Graceful fallback to built-in resilient engine
          console.log('[AI Orchestrator] External AI service offline/timeout, using local engine:', e.message);
        }
      }

      // 2. Local resilient NLP & heuristic engine
      return this.localTriageEngine({ description, pincode, lat, lng });
    } catch (err) {
      console.error('[AI Orchestrator Error]', err);
      // AI failure must never lose a complaint or block submission
      return {
        category: 'General Civic Issue',
        confidence: 0.50,
        priority: 'MEDIUM',
        priority_reason: 'Triage pending manual municipal review.',
        extracted_data: {},
        duplicate_candidates: [],
        ai_status: 'PENDING',
        model_version: 'v1.0-fallback'
      };
    }
  },

  /**
   * Resilient local NLP triage engine
   */
  localTriageEngine({ description, pincode, lat, lng }) {
    const text = (description || '').toLowerCase();

    // A. Category Detection
    let detectedCategory = 'Roads & Potholes';
    let confidence = 0.88;

    if (text.match(/garbage|trash|waste|dump|clean|dustbin|spill|sweep|dead animal/)) {
      detectedCategory = 'Solid Waste & Sanitation';
      confidence = 0.94;
    } else if (text.match(/light|lamp|dark|pole|wire|spark|electric|flicker|bulb/)) {
      detectedCategory = 'Street Lighting';
      confidence = 0.92;
    } else if (text.match(/drain|sewage|choke|waterlog|gutter|drainage|manhole|sewer|overflow/)) {
      detectedCategory = 'Drainage & Sewerage';
      confidence = 0.95;
    } else if (text.match(/water supply|pipeline|leak|drinking water|tap|no water|tanker/)) {
      detectedCategory = 'Water Supply';
      confidence = 0.91;
    } else if (text.match(/mosquito|dengue|malaria|fogging|epidemic|sanitation|stagnant/)) {
      detectedCategory = 'Public Health & Vector Control';
      confidence = 0.89;
    } else if (text.match(/encroach|footpath shop|illegal construction|blocked walkway/)) {
      detectedCategory = 'Encroachment & Public Space';
      confidence = 0.87;
    } else if (text.match(/pothole|road|crater|asphalt|accident|skid|tar|surface/)) {
      detectedCategory = 'Roads & Potholes';
      confidence = 0.96;
    }

    // B. Entity Extraction (Structured JSON)
    const extractedData = {};
    if (text.includes('pothole') || text.includes('crater')) extractedData.hazard = 'Road Crater / Pothole';
    if (text.includes('water') || text.includes('rain')) extractedData.water_involvement = true;
    if (text.includes('spark') || text.includes('wire')) extractedData.electrical_hazard = true;
    if (text.includes('gate') || text.includes('school') || text.includes('hospital') || text.includes('market')) {
      const match = text.match(/(near|at|opposite|behind)\s+([a-zA-Z0-9\s]+)/i);
      extractedData.landmark = match ? match[0] : 'Public Facility Corridor';
    }

    // C. Priority Engine (Transparent signals)
    let priority = 'MEDIUM';
    const reasons = [];

    const isHighTraffic = text.includes('main road') || text.includes('market') || text.includes('highway') || text.includes('hospital') || text.includes('school');
    const isSafetyDanger = text.includes('accident') || text.includes('skid') || text.includes('spark') || text.includes('open manhole') || text.includes('deep');
    const isHospitalZone = text.includes('hospital') || text.includes('clinic') || text.includes('emergency');

    if (isHospitalZone || (isSafetyDanger && isHighTraffic)) {
      priority = 'CRITICAL';
      reasons.push('High-risk public hazard affecting vulnerable zones or emergency access routes.');
    } else if (isSafetyDanger || isHighTraffic) {
      priority = 'HIGH';
      reasons.push('Direct risk to pedestrian or vehicular safety in active urban transit corridor.');
    } else if (text.includes('small') || text.includes('minor') || text.includes('aesthetic')) {
      priority = 'LOW';
      reasons.push('Minor infrastructure disruption without immediate physical risk.');
    } else {
      priority = 'MEDIUM';
      reasons.push('Standard municipal grievance requiring routine scheduled maintenance.');
    }

    // D. Duplicate Screening (2-stage: spatial candidate retrieval + lexical/semantic score)
    // Constraint: A shared PIN alone NEVER means duplicate!
    const duplicateCandidates = [];
    const activeComplaints = db.complaints.filter(c => !['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status));

    for (const c of activeComplaints) {
      // Must be same category or close text
      let score = 0;
      if (c.pincode === pincode) {
        // Shared PIN is just step 1; check text similarity
        if (c.category === detectedCategory) {
          score += 0.35;
        }

        // Check keyword overlap
        const wordsA = new Set(text.split(/\s+/).filter(w => w.length > 3));
        const wordsB = new Set((c.description || '').toLowerCase().split(/\s+/).filter(w => w.length > 3));
        let common = 0;
        wordsA.forEach(w => { if (wordsB.has(w)) common++; });

        if (wordsA.size > 0) {
          score += (common / Math.max(wordsA.size, wordsB.size)) * 0.55;
        }

        // Proximity bonus if coords available
        if (lat && lng && c.lat && c.lng) {
          const distKm = this.getDistanceFromLatLonInKm(lat, lng, c.lat, c.lng);
          if (distKm < 0.2) score += 0.20; // within 200m
        }

        if (score >= 0.50) {
          duplicateCandidates.push({
            candidate_id: c.id,
            complaint_number: c.complaint_number,
            category: c.category,
            description: c.description,
            address: c.address || c.landmark,
            status: c.status,
            similarity_score: Math.min(parseFloat(score.toFixed(2)), 0.96),
            created_at: c.created_at
          });
        }
      }
    }

    duplicateCandidates.sort((a, b) => b.similarity_score - a.similarity_score);

    return {
      category: detectedCategory,
      confidence: parseFloat(confidence.toFixed(2)),
      priority,
      priority_reason: reasons.join(' '),
      extracted_data: extractedData,
      duplicate_candidates: duplicateCandidates.slice(0, 3),
      ai_status: 'COMPLETED',
      model_version: 'v1.0-civic-triage'
    };
  },

  getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
};
