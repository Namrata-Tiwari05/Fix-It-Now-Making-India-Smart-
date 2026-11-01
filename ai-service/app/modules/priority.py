"""
FixItNow AI Subsystem — Module C: Safety-First Multi-Factor Priority & Risk Scoring Engine
Implements the 6-Factor Civic Urgency Architecture:
  1. Defect Hazard (Weight: 25 pts) — Problem naturally kitni dangerous hai?
  2. Severity (Weight: 25 pts) — Problem kitni serious condition mein hai?
  3. Location Context (Weight: 20 pts) — Hospital, school, highway ya residential area?
  4. Public Exposure (Weight: 15 pts) — Kitne log affected ho sakte hain?
  5. Collateral Risk (Weight: 10 pts) — Kya accident, injury, flooding ya electrical hazard ka risk hai?
  6. Evidence Confidence (Weight: 5 pts) — Image aur complaint description ek doosre ko support karte hain?
Total = 100 pts.

Tiers:
  - CRITICAL: 80–100 pts (SLA: 24h)
  - HIGH:     60–79 pts (SLA: 48h)
  - MEDIUM:   35–59 pts (SLA: 168h / 7d)
  - LOW:      0–34 pts  (SLA: 336h / 14d)

Mandatory Life-Safety Overrides take absolute precedence:
  - Open manhole in public transit -> Minimum CRITICAL (>= 85 pts)
  - Exposed live electrical wiring / sparking -> Minimum CRITICAL (>= 88 pts)
  - Immediate threat to human life / fatality risk -> Minimum CRITICAL (>= 88 pts)
  - Severe road defect on transit corridor with accident risk -> Minimum HIGH (>= 65 pts)
  - Dangerous water accumulation impacting healthcare / school -> Minimum HIGH (>= 60 pts)
"""

import re
import math
import unicodedata
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("fixitnow-ai-service.priority")

DEFAULT_PRIORITY_CONFIG = {
    "weights": {
        "defect_hazard": 25,
        "severity": 25,
        "location_context": 20,
        "public_exposure": 15,
        "collateral_risk": 10,
        "evidence_confidence": 5
    },
    "thresholds": {
        "critical": 80,
        "high": 60,
        "medium": 35,
        "low": 0
    },
    "sla_hours": {
        "CRITICAL": 24,
        "HIGH": 48,
        "MEDIUM": 168,
        "LOW": 336
    }
}

SEVERITY_KEYWORDS = {
    "high": [
        r"\bdeep\b", r"\bhuge\b", r"\bmassive\b", r"\bcrater\b", r"\bdangerous\b", r"\bsevere\b",
        r"\baccident\b", r"\bdeath\s*trap\b", r"\bcollapsed\b", r"\boverflow\b", r"\bburst\b",
        r"गहरा", r"बहुत\s+बड़ा", r"खतरनाक", r"दुर्घटना", r"विशाल", r"जानलेवा", r"फूट\s+गई",
        r"\bbada\b", r"\bbohot\s+bada\b", r"\bkhatarnak\b", r"\bcollapse\b", r"\bheavy\b"
    ],
    "medium": [
        r"\bmoderate\b", r"\bspreading\b", r"\bdamaged\b", r"\bbad\b", r"\binconvenient\b",
        r"खराब", r"फैल\s+रहा", r"दिक्कत",
        r"\bkhara+b\b", r"\bpareshani\b", r"\bdamage\b", r"\bbadbu\b", r"\bgandagi\b", r"\bwater\s*log\b"
    ],
    "low": [
        r"\bsmall\b", r"\bminor\b", r"\bslight\b", r"\bhairline\b", r"\baesthetic\b", r"\blittle\b",
        r"छोटा", r"हल्का", r"मामूली",
        r"\bchot[aa]\b", r"\bhalka\b", r"\bminor\b"
    ]
}

LOCATION_KEYWORDS = {
    "critical": [
        r"\bhospital\b", r"\bambulance\b", r"\bclinic\b", r"\bemergency\b", r"\bicu\b",
        r"अस्पताल", r"इमरजेंसी", r"एम्बुलेंस"
    ],
    "high_transit": [
        r"\bschool\b", r"\bcollege\b", r"\bhighway\b", r"\bmain\s+road\b", r"\bbusy\s+market\b",
        r"\brailway\s+station\b", r"\bintersection\b", r"\bchauraha\b", r"\bbazaar\b",
        r"स्कूल", r"कॉलेज", r"हाईवे", r"मुख्य\s+मार्ग", r"बाजार", r"रेलवे\s+स्टेशन", r"चौराहा"
    ],
    "residential": [
        r"\bresidential\b", r"\bcolony\b", r"\bsector\b", r"\blane\b", r"\bmohalla\b", r"\bgali\b",
        r"कॉलोनी", r"मोहल्ला", r"गली", r"सेक्टर", r"मकान", r"घर"
    ],
    "isolated": [
        r"\balley\b", r"\bdead\s*end\b", r"\bempty\s+plot\b", r"\bbackyard\b", r"\bisolated\b",
        r"खाली\s+प्लाट", r"पिछवाड़े", r"सूनसान", r"\bkhali\s+plot\b"
    ]
}

LIFE_RISK_KEYWORDS = [
    r"\bspark\b", r"\bwire\b", r"\belectric\b", r"\bcurrent\b", r"\bdengue\b", r"\bmalaria\b",
    r"\bdeath\b", r"\bfall\b", r"\binjury\b", r"\baccident\b", r"\bskid\b", r"\bcasualty\b",
    r"चिनगारी", r"तार", r"करंट", r"डेंगू", r"मलेरिया", r"हादसा", r"चोट", r"गिर\s*गया", r"जानलेवा",
    r"\bcurrent\b", r"\btaar\b", r"\bchingari\b", r"\bgir\s*gaya\b", r"\bchot\b"
]

def assign_complaint_priority(
    complaint_input: Dict[str, Any],
    category_result: Optional[Dict] = None,
    upstream_visual_evidence: Optional[Dict] = None,
    duplicate_count: int = 0,
    config: Optional[Dict] = None
) -> Dict[str, Any]:
    """
    Transparent, explainable 6-Factor Weighted Priority and Risk Scoring Engine:
      1. Defect Hazard (25 pts)
      2. Severity (25 pts)
      3. Location Context (20 pts)
      4. Public Exposure (15 pts)
      5. Collateral Risk (10 pts)
      6. Evidence Confidence (5 pts)
    Total base score = 0–100.
    """
    cfg = config or DEFAULT_PRIORITY_CONFIG
    desc = (complaint_input.get("description") or "").strip()
    norm_text = unicodedata.normalize("NFKC", desc)
    clean_text = " " + re.sub(r"\s+", " ", norm_text).lower() + " "

    issue_class = None
    if category_result and category_result.get("predicted_category"):
        issue_class = category_result["predicted_category"]
    elif complaint_input.get("category"):
        issue_class = complaint_input["category"]

    reasons = []

    # ---------------------------------------------------------
    # Factor 1: Defect Hazard (Weight: 25 pts)
    # Problem naturally kitni dangerous hai?
    # ---------------------------------------------------------
    DEFECT_HAZARD_MAP = {
        "open_manhole": 25,
        "Drainage & Sewerage": 12,
        "pothole": 14,
        "Roads & Potholes": 14,
        "fault_streetlight": 9,
        "Street Lighting": 9,
        "stagnant_water": 10,
        "Water Supply": 10,
        "Public Health & Vector Control": 12,
        "garbage_litter": 6,
        "Solid Waste & Sanitation": 6,
        "road_crack": 8,
        "surface_erosion": 8,
        "encroachment": 7,
        "Encroachment & Public Space": 7
    }
    score_hazard = DEFECT_HAZARD_MAP.get(issue_class, 8)

    # Life hazard signals increase intrinsic hazard
    is_live_wire = bool(re.search(r"spark|live\s*wire|current|करंट|चिनगारी|बिजली\s*का\s*तार", clean_text))
    is_open_fall = bool(re.search(r"open.*manhole|manhole.*open|khula.*manhole|मैनहोल.*खुला|खुला.*मैनहोल|fall.*in|gir\s*sakta|death\s*trap|जानलेवा", clean_text)) or issue_class == "open_manhole"

    if is_open_fall or is_live_wire:
        score_hazard = 25

    reasons.append(f"1. Defect Hazard ({score_hazard}/25 pts): Intrinsic baseline danger for {issue_class or 'civic defect'}.")

    # ---------------------------------------------------------
    # Factor 2: Severity (Weight: 25 pts)
    # Problem kitni serious condition mein hai?
    # ---------------------------------------------------------
    score_severity = 8
    if any(re.search(p, clean_text) for p in SEVERITY_KEYWORDS["high"]):
        score_severity = 24
        reasons.append("2. Severity (24/25 pts): Acute physical scale, deep crater, or large structural collapse.")
    elif any(re.search(p, clean_text) for p in SEVERITY_KEYWORDS["low"]):
        score_severity = 5
        reasons.append("2. Severity (5/25 pts): Superficial cosmetic or hairline condition.")
    elif any(re.search(p, clean_text) for p in SEVERITY_KEYWORDS["medium"]):
        score_severity = 14
        reasons.append("2. Severity (14/25 pts): Moderate damage, foul odor, or noticeable road deterioration.")
    else:
        score_severity = 8
        reasons.append("2. Severity (8/25 pts): Standard physical defect condition.")

    # ---------------------------------------------------------
    # Factor 3: Location Context (Weight: 20 pts)
    # Hospital, school, highway ya residential area?
    # ---------------------------------------------------------
    loc_probe = clean_text + " " + (complaint_input.get("landmark") or "").lower() + " " + (complaint_input.get("address") or "").lower()
    score_loc = 8

    if any(re.search(p, loc_probe) for p in LOCATION_KEYWORDS["critical"]):
        score_loc = 20
        reasons.append("3. Location Context (20/20 pts): Hospital emergency healthcare route or ambulance access.")
    elif any(re.search(p, loc_probe) for p in LOCATION_KEYWORDS["high_transit"]):
        score_loc = 14
        reasons.append("3. Location Context (14/20 pts): High-density school zone, highway, or busy commercial corridor.")
    elif any(re.search(p, loc_probe) for p in LOCATION_KEYWORDS["isolated"]):
        score_loc = 3
        reasons.append("3. Location Context (3/20 pts): Isolated alley or vacant plot.")
    else:
        score_loc = 8
        reasons.append("3. Location Context (8/20 pts): Standard residential neighborhood or colony lane.")

    # ---------------------------------------------------------
    # Factor 4: Public Exposure (Weight: 15 pts)
    # Kitne log affected ho sakte hain?
    # ---------------------------------------------------------
    dup_val = duplicate_count or complaint_input.get("duplicate_count") or (len(complaint_input.get("merged_complaints", [])))
    score_exposure = 4
    if dup_val >= 4 or bool(re.search(r"thousands|hundreds|entire\s*mohalla|पूरा\s*मोहल्ला|सैकड़ों|हजारों", clean_text)):
        score_exposure = 15
        reasons.append(f"4. Public Exposure (15/15 pts): High population impact with {dup_val + 1} corroborated reports.")
    elif dup_val >= 2 or bool(re.search(r"society|residents|many\s*people|बहुत\s*लोग|कॉलोनी\s*वाले", clean_text)):
        score_exposure = 10
        reasons.append(f"4. Public Exposure (10/15 pts): Community impact with {dup_val + 1} resident reports.")
    elif dup_val >= 1:
        score_exposure = 7
        reasons.append("4. Public Exposure (7/15 pts): Multiple residents affected.")
    else:
        score_exposure = 4
        reasons.append("4. Public Exposure (4/15 pts): Individual citizen report.")

    # ---------------------------------------------------------
    # Factor 5: Collateral Risk (Weight: 10 pts)
    # Kya accident, injury, flooding ya electrical hazard ka risk hai?
    # ---------------------------------------------------------
    score_collateral = 1
    is_accident_injury = bool(re.search(r"accident|injury|collision|skid|दुर्घटना|हादसा|चोट", clean_text))
    is_vector_health = bool(re.search(r"dengue|malaria|epidemic|डेंगू|मलेरिया|बीमारी", clean_text))

    if is_live_wire or is_open_fall:
        score_collateral = 10
        reasons.append("5. Collateral Risk (10/10 pts): Immediate electrocution, fall, or severe casualty risk.")
    elif is_accident_injury:
        score_collateral = 8
        reasons.append("5. Collateral Risk (8/10 pts): Active vehicle skid or collision hazard.")
    elif is_vector_health:
        score_collateral = 6
        reasons.append("5. Collateral Risk (6/10 pts): Disease vector or public health hazard.")
    elif any(re.search(p, clean_text) for p in LIFE_RISK_KEYWORDS):
        score_collateral = 4
        reasons.append("5. Collateral Risk (4/10 pts): Collateral safety concern noted.")
    else:
        score_collateral = 1
        reasons.append("5. Collateral Risk (1/10 pts): Low secondary hazard risk.")

    # ---------------------------------------------------------
    # Factor 6: Evidence Confidence (Weight: 5 pts)
    # Image aur complaint description ek doosre ko support karte hain?
    # ---------------------------------------------------------
    score_evidence = 4
    has_photo = bool(complaint_input.get("media") or complaint_input.get("image_path") or complaint_input.get("photo_url"))
    yolo_conf = upstream_visual_evidence.get("primary_confidence", 0) if upstream_visual_evidence else 0

    if yolo_conf >= 0.70 and has_photo:
        score_evidence = 5
        reasons.append("6. Evidence Confidence (5/5 pts): YOLOv8 verified defect with photographic and textual congruence.")
    elif has_photo:
        score_evidence = 4
        reasons.append("6. Evidence Confidence (4/5 pts): Photographic evidence attached and verified.")
    else:
        score_evidence = 2
        reasons.append("6. Evidence Confidence (2/5 pts): Description-only submission.")

    # Base Weighted Score (Sum of 6 factors, 0-100)
    base_score = score_hazard + score_severity + score_loc + score_exposure + score_collateral + score_evidence
    total_score = min(100, max(5, base_score))

    # ---------------------------------------------------------
    # Mandatory Safety Overrides
    # ---------------------------------------------------------
    safety_override = None

    if is_open_fall:
        safety_override = "OPEN_MANHOLE_HAZARD"
        total_score = max(total_score, 90)
        reasons.insert(0, "SAFETY OVERRIDE APPLIED: Open manhole detected in public corridor; minimum CRITICAL priority enforced.")
    elif is_live_wire:
        safety_override = "ELECTROCUTION_HAZARD"
        total_score = max(total_score, 92)
        reasons.insert(0, "SAFETY OVERRIDE APPLIED: Exposed live electrical wiring detected; minimum CRITICAL priority enforced.")
    elif bool(re.search(r"जानलेवा|death\s*trap|fatal|fatalities|severe\s*injury|life\s*risk|drowning|life\s*threat", clean_text)):
        safety_override = "LIFE_THREAT_HAZARD"
        total_score = max(total_score, 88)
        reasons.insert(0, "SAFETY OVERRIDE APPLIED: Direct threat to human life reported; CRITICAL priority enforced.")
    elif (issue_class in ["pothole", "Roads & Potholes"]) and (is_accident_injury or score_severity >= 20) and total_score < 60:
        safety_override = "ROAD_ACCIDENT_HAZARD"
        total_score = max(total_score, 68)
        reasons.insert(0, "SAFETY OVERRIDE APPLIED: Severe roadway crater creating immediate accident risk; minimum HIGH priority enforced.")
    elif (issue_class in ["stagnant_water", "Drainage & Sewerage"]) and (score_loc >= 14 or is_accident_injury) and total_score < 60:
        safety_override = "WATER_HAZARD_OVERRIDE"
        total_score = max(total_score, 65)
        reasons.insert(0, "SAFETY OVERRIDE APPLIED: Dangerous water accumulation impacting transit corridor; minimum HIGH priority enforced.")

    # Map to priority levels using exact prompt thresholds:
    if total_score >= cfg["thresholds"]["critical"] or safety_override in ["OPEN_MANHOLE_HAZARD", "ELECTROCUTION_HAZARD", "LIFE_THREAT_HAZARD"]:
        priority_level = "CRITICAL"
    elif total_score >= cfg["thresholds"]["high"] or safety_override:
        priority_level = "HIGH"
    elif total_score >= cfg["thresholds"]["medium"]:
        priority_level = "MEDIUM"
    else:
        priority_level = "LOW"

    priority_conf = 0.94 if has_photo else 0.85

    return {
        "priority_level": priority_level,
        "risk_score": total_score,
        "confidence": priority_conf,
        "priority_reasons": reasons,
        "priority_reason": " ".join(reasons),
        "safety_override_triggered": safety_override,
        "safety_override_status": "Applied" if safety_override else "None",
        "contributing_factors": {
            "defect_hazard": score_hazard,
            "severity": score_severity,
            "location_context": score_loc,
            "public_exposure": score_exposure,
            "collateral_risk": score_collateral,
            "evidence_confidence": score_evidence
        },
        "risk_factors": {
            "defect_hazard": score_hazard,
            "severity": score_severity,
            "location_context": score_loc,
            "public_exposure": score_exposure,
            "collateral_risk": score_collateral,
            "evidence_confidence": score_evidence,
            # Backward-compat aliases
            "base_defect_risk": score_hazard,
            "observed_severity": score_severity,
            "location_vulnerability": score_loc,
            "public_density": score_exposure,
            "issue_severity": score_hazard,
            "safety_life_risk": score_collateral,
            "location_public_exposure": score_loc,
            "damage_extent": score_severity,
            "people_affected": score_exposure,
            "persistence_duration": score_evidence
        },
        "recommended_sla_hours": cfg["sla_hours"].get(priority_level, 168),
        "priority_method": "weighted_6_factor_safety_first_v5"
    }
