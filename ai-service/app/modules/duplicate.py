"""
FixItNow AI Subsystem — Module E: Multi-Signal Duplicate Complaint Screening Engine
Fuses geospatial Haversine distance, temporal delta, multilingual lexical/conceptual similarity,
defect taxonomy matching, and perceptual image hashing (dHash) to triage duplicate civic complaints.

Enforces:
  - CONFIRMED_DUPLICATE: Multi-factor agreement across space, time, category, and content.
  - POSSIBLE_DUPLICATE: Proximity with partial corroboration; flagged for human review.
  - NOT_DUPLICATE: Independent or distinct civic defect.
Rule: A single factor is NEVER sufficient for confirmed duplicate status.
"""

import math
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import numpy as np
from PIL import Image

logger = logging.getLogger("fixitnow-ai-service.duplicate")

DEFAULT_DUPLICATE_CONFIG = {
    "gps_same_spot_m": 30.0,
    "gps_immediate_vicinity_m": 85.0,
    "gps_neighborhood_cutoff_m": 250.0,
    "dhash_duplicate_max_dist": 6,
    "text_sim_duplicate_min": 0.55,
    "text_sim_moderate_min": 0.35,
    "time_same_shift_hours": 24.0,
    "time_active_window_days": 14.0
}

# Multilingual defect concept clusters (English, Hindi, and Hinglish)
CONCEPT_CLUSTERS = {
    "solid_waste": [
        "garbage", "kachra", "koora", "kooda", "waste", "litter", "trash", "dustbin", "dump", "badbu", "smell",
        "कूड़ा", "कचरा", "गंदगी", "बदबू", "सफाई", "ढेर", "सड़न"
    ],
    "roads_potholes": [
        "pothole", "gaddha", "gadde", "crack", "road", "sadak", "pit", "hole", "crater", "damage",
        "गड्ढा", "गड्ढे", "सड़क", "टूटी", "टूटा", "खराब सड़क"
    ],
    "water_drainage": [
        "water", "waterlogging", "pani", "naali", "drain", "drainage", "sewage", "clogged", "overflow", "stagnant",
        "जलभराव", "नाला", "नाली", "पानी", "सीवर", "कीचड़", "ओवरफ्लो"
    ],
    "open_manhole": [
        "manhole", "dhakkan", "open manhole", "menhol", "chamber", "cover", "gutter",
        "मैनहोल", "ढक्कन", "खुला मैनहोल", "गटर"
    ],
    "streetlights": [
        "light", "streetlight", "batti", "khamba", "pole", "wire", "darkness", "andhera", "bulb",
        "अंधेरा", "लाइट", "बत्ती", "खंभा", "तार", "खंभा टूटा"
    ],
    "surface_erosion": [
        "erosion", "gravel", "mitti", "soil", "kankad", "dust", "sand", "stone",
        "मिट्टी", "धूल", "कंकड़", "पत्थर"
    ],
    "encroachment": [
        "encroachment", "thela", "illegal", "kabza", "footpath", "shop", "vendor",
        "कब्जा", "ठेला", "फुटपाथ", "दुकान"
    ]
}

def extract_concepts(text: Optional[str]) -> set:
    """Extracts high-level defect concept clusters from text in English, Hindi, or Hinglish."""
    if not text:
        return set()
    t = text.lower()
    concepts = set()
    for cat, keywords in CONCEPT_CLUSTERS.items():
        for kw in keywords:
            if kw in t:
                concepts.add(cat)
                break
    return concepts

def compute_text_similarity(text1: Optional[str], text2: Optional[str]) -> float:
    """
    Computes hybrid text similarity combining token Jaccard overlap and semantic defect concept matching.
    Handles Hindi, English, and Hinglish.
    """
    if not text1 or not text2:
        return 0.0
    
    tokens1 = set(w.lower() for w in text1.split() if len(w) > 2)
    tokens2 = set(w.lower() for w in text2.split() if len(w) > 2)
    
    jaccard = len(tokens1 & tokens2) / max(len(tokens1 | tokens2), 1)
    overlap = len(tokens1 & tokens2) / max(min(len(tokens1), len(tokens2)), 1)
    lexical = 0.5 * jaccard + 0.5 * overlap

    concepts1 = extract_concepts(text1)
    concepts2 = extract_concepts(text2)

    if concepts1 and concepts2:
        concept_score = 1.0 if (concepts1 & concepts2) else 0.0
    elif not concepts1 and not concepts2:
        concept_score = lexical
    else:
        concept_score = 0.35

    return round(0.40 * lexical + 0.60 * concept_score, 4)

def compute_dhash(img: Any) -> Optional[np.ndarray]:
    """Computes a 64-bit difference hash for an image."""
    if img is None:
        return None
    try:
        if not isinstance(img, Image.Image):
            return None
        gray = img.convert("L").resize((9, 8), Image.Resampling.BILINEAR)
        pixels = np.array(gray, dtype=np.int32)
        diff = pixels[:, :-1] > pixels[:, 1:]
        return diff.flatten()
    except Exception:
        return None

def dhash_hamming_distance(h1: Optional[np.ndarray], h2: Optional[np.ndarray]) -> Optional[int]:
    """Hamming distance between two 64-bit hashes."""
    if h1 is None or h2 is None:
        return None
    return int(np.count_nonzero(h1 != h2))

def calculate_haversine_distance(lat1: Any, lon1: Any, lat2: Any, lon2: Any) -> Optional[float]:
    """Computes great-circle surface distance in meters between two WGS84 GPS coordinates."""
    if any(c is None for c in [lat1, lon1, lat2, lon2]):
        return None
    try:
        lat1, lon1, lat2, lon2 = float(lat1), float(lon1), float(lat2), float(lon2)
    except (ValueError, TypeError):
        return None

    if not (-90.0 <= lat1 <= 90.0 and -90.0 <= lat2 <= 90.0 and -180.0 <= lon1 <= 180.0 and -180.0 <= lon2 <= 180.0):
        return None

    R = 6371000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)

def calculate_time_delta_hours(time_str1: Any, time_str2: Any) -> Optional[float]:
    """Calculates absolute time difference in hours between two ISO timestamp strings."""
    if not time_str1 or not time_str2:
        return None
    try:
        t1 = datetime.fromisoformat(str(time_str1).replace("Z", "+00:00"))
        t2 = datetime.fromisoformat(str(time_str2).replace("Z", "+00:00"))
        return round(abs((t1 - t2).total_seconds()) / 3600.0, 2)
    except Exception:
        return None

def format_time_delta_label(hours: Optional[float]) -> str:
    """Formats time difference into a readable label."""
    if hours is None:
        return "Time difference unknown"
    if hours < 1.0:
        mins = max(1, int(hours * 60))
        return f"Reported {mins} minute{'s' if mins != 1 else ''} apart"
    if hours < 24.0:
        h = int(hours)
        return f"Reported {h} hour{'s' if h != 1 else ''} apart (Same day)"
    days = int(hours / 24.0)
    return f"Reported {days} day{'s' if days != 1 else ''} apart"

def evaluate_duplicate_decision(
    new_complaint: Dict[str, Any],
    candidate_complaint: Dict[str, Any],
    new_image: Optional[Image.Image] = None,
    candidate_image: Optional[Image.Image] = None,
    config: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Evaluates whether two complaints refer to the exact same physical incident using
    multi-signal fusion: Geospatial distance, Temporal proximity, Category taxonomy,
    Multilingual text similarity, and perceptual image hashing.
    """
    cfg = config or DEFAULT_DUPLICATE_CONFIG
    reasons: List[str] = []

    # 1. Geospatial Signal
    gps_dist = calculate_haversine_distance(
        new_complaint.get("lat"), new_complaint.get("lng"),
        candidate_complaint.get("lat"), candidate_complaint.get("lng")
    )
    
    same_pincode = (
        str(new_complaint.get("pincode") or "").strip() == str(candidate_complaint.get("pincode") or "").strip()
        and bool(new_complaint.get("pincode"))
    )

    if gps_dist is not None:
        if gps_dist <= cfg["gps_same_spot_m"]:
            geo_score = 1.0
            dist_label = f"{int(gps_dist)}m apart (Exact Spot)"
            reasons.append(f"Located at the exact same physical coordinates ({int(gps_dist)}m apart).")
        elif gps_dist <= cfg["gps_immediate_vicinity_m"]:
            geo_score = 0.85 - 0.25 * ((gps_dist - cfg["gps_same_spot_m"]) / (cfg["gps_immediate_vicinity_m"] - cfg["gps_same_spot_m"]))
            dist_label = f"{int(gps_dist)}m apart (Same Street)"
            reasons.append(f"Located in immediate street vicinity ({int(gps_dist)}m apart).")
        elif gps_dist <= cfg["gps_neighborhood_cutoff_m"]:
            geo_score = 0.50 - 0.30 * ((gps_dist - cfg["gps_immediate_vicinity_m"]) / (cfg["gps_neighborhood_cutoff_m"] - cfg["gps_immediate_vicinity_m"]))
            dist_label = f"{int(gps_dist)}m apart (Same Neighborhood)"
            reasons.append(f"Located {int(gps_dist)}m apart within same locality.")
        else:
            geo_score = 0.05
            dist_label = f"{int(gps_dist)}m apart (Distant)"
            reasons.append(f"Geographic distance ({int(gps_dist)}m) indicates distinct physical locations.")
    else:
        geo_score = 0.60 if same_pincode else 0.15
        dist_label = f"PIN {new_complaint.get('pincode') or 'N/A'} Match" if same_pincode else "Different PIN Code"
        if same_pincode:
            reasons.append(f"Reported within the same PIN area ({new_complaint.get('pincode')}).")

    # 2. Temporal Signal
    time_delta = calculate_time_delta_hours(
        new_complaint.get("created_at"),
        candidate_complaint.get("created_at")
    )
    time_label = format_time_delta_label(time_delta)

    if time_delta is not None:
        if time_delta <= cfg["time_same_shift_hours"]:
            time_score = 1.0
            reasons.append(f"{time_label} during the same operational shift.")
        elif time_delta <= (cfg["time_active_window_days"] * 24.0):
            time_score = 0.75
            reasons.append(f"{time_label} within the active lifecycle window.")
        else:
            cand_status = str(candidate_complaint.get("status") or "").upper()
            if cand_status in ["ASSIGNED", "IN_PROGRESS", "UNDER_REVIEW"]:
                time_score = 0.50
                reasons.append(f"{time_label}; existing defect is still actively pending resolution.")
            else:
                time_score = 0.20
    else:
        time_score = 0.70

    # 3. Category & Defect Taxonomy Signal (Strict Domain Gate)
    cat_new = str(new_complaint.get("category") or "").strip().lower()
    cat_cand = str(candidate_complaint.get("category") or "").strip().lower()

    if cat_new and cat_cand and cat_new == cat_cand:
        cat_score = 1.0
        cat_match = True
        cat_label = f"Matching Category ({candidate_complaint.get('category')})"
        reasons.append(f"Both reports share the defect category '{candidate_complaint.get('category')}'.")
    elif cat_new and cat_cand:
        if any(c in cat_new for c in ["water", "road", "pothole"]) and any(c in cat_cand for c in ["water", "road", "pothole"]):
            cat_score = 0.60
            cat_match = True
            cat_label = "Correlated Defect Category"
            reasons.append(f"Related infrastructure categories: '{new_complaint.get('category')}' and '{candidate_complaint.get('category')}'.")
        else:
            cat_score = 0.0
            cat_match = False
            cat_label = "Different Category"
    else:
        cat_score = 0.50
        cat_match = True
        cat_label = "Unassigned Category"

    # STRICT GATE 1: Different categories cannot be duplicates
    if not cat_match:
        diff_reason = f"Different defect categories ('{new_complaint.get('category')}' vs '{candidate_complaint.get('category')}'). Distinct civic issues."
        return {
            "decision": "NOT_DUPLICATE",
            "similarity_score": 0.05,
            "requires_manual_review": False,
            "explanation": diff_reason,
            "reasons": [diff_reason],
            "matched_complaint_id": candidate_complaint.get("id"),
            "distance_meters": gps_dist,
            "time_difference": time_label,
            "image_similarity": 0.0,
            "description_similarity": 0.0,
            "category_similarity": False,
            "breakdown": {
                "distance_meters": gps_dist,
                "distance_label": dist_label,
                "time_delta_hours": time_delta,
                "time_delta_label": time_label,
                "category_match": False,
                "category_label": cat_label,
                "text_similarity_percent": 0,
                "text_label": "Different Defect Category",
                "dhash_distance": None
            }
        }

    # 4. Text & Semantic Context Signal
    text_new = new_complaint.get("description") or ""
    text_cand = candidate_complaint.get("description") or ""
    text_sim = compute_text_similarity(text_new, text_cand)
    text_pct = int(round(text_sim * 100))

    concepts1 = extract_concepts(text_new)
    concepts2 = extract_concepts(text_cand)
    has_concept_overlap = bool(concepts1 & concepts2)

    if text_sim >= cfg["text_sim_duplicate_min"]:
        text_label = f"{text_pct}% Description Overlap"
        reasons.append(f"Descriptions confirm identical defect context ({text_pct}% semantic overlap).")
    elif text_sim >= cfg["text_sim_moderate_min"]:
        text_label = f"{text_pct}% Moderate Overlap"
        reasons.append(f"Moderate description similarity ({text_pct}%).")
    else:
        text_label = f"{text_pct}% Text Match"

    # 5. Visual Perceptual Hash Signal (dHash)
    dhash_dist = None
    has_identical_photo = False
    image_sim = 0.0
    if new_image is not None and candidate_image is not None:
        h1 = compute_dhash(new_image)
        h2 = compute_dhash(candidate_image)
        dhash_dist = dhash_hamming_distance(h1, h2)
        if dhash_dist is not None:
            image_sim = max(0.0, round(1.0 - (dhash_dist / 64.0), 2))
            if dhash_dist <= cfg["dhash_duplicate_max_dist"]:
                has_identical_photo = True
                reasons.append(f"Near-identical photograph detected (dHash distance: {dhash_dist}/64).")

    # STRICT GATE 2: Proximity alone is NEVER sufficient
    # If 0% concept overlap, 0% photo match, and lexical overlap < 25%, distinct issue
    if not has_identical_photo and not has_concept_overlap and text_sim < 0.25:
        distinct_reason = "Descriptions describe distinct civic problems despite geographic proximity."
        return {
            "decision": "NOT_DUPLICATE",
            "similarity_score": min(0.20, round(0.12 * geo_score, 2)),
            "requires_manual_review": False,
            "explanation": distinct_reason,
            "reasons": [
                distinct_reason,
                "Zero textual or visual defect corroboration (independent occurrences)."
            ],
            "matched_complaint_id": candidate_complaint.get("id"),
            "distance_meters": gps_dist,
            "time_difference": time_label,
            "image_similarity": image_sim,
            "description_similarity": text_sim,
            "category_similarity": cat_match,
            "breakdown": {
                "distance_meters": gps_dist,
                "distance_label": dist_label,
                "time_delta_hours": time_delta,
                "time_delta_label": time_label,
                "category_match": cat_match,
                "category_label": cat_label,
                "text_similarity_percent": text_pct,
                "text_label": f"{text_pct}% Match (Distinct Defect Content)",
                "dhash_distance": dhash_dist
            }
        }

    # Multi-Factor Weighted Blend (Defect Content: 40%, Geo Proximity: 35%, Category: 15%, Time: 10%)
    combined_score = (
        0.40 * text_sim +
        0.35 * geo_score +
        0.15 * cat_score +
        0.10 * time_score
    )

    if has_identical_photo:
        combined_score = max(combined_score, 0.95)

    if gps_dist is not None and gps_dist > cfg["gps_neighborhood_cutoff_m"]:
        combined_score = min(combined_score, 0.35)

    # Decision Categorization:
    # A single factor must NEVER be sufficient for confirmed duplicate status.
    # CONFIRMED_DUPLICATE requires: combined_score >= 0.78 AND geo_score >= 0.75 AND (text_sim >= 0.35 or has_identical_photo)
    if combined_score >= 0.78 and geo_score >= 0.75 and (text_sim >= 0.35 or has_identical_photo):
        decision = "CONFIRMED_DUPLICATE"
        requires_review = False
    elif combined_score >= 0.60:
        decision = "POSSIBLE_DUPLICATE"
        requires_review = True
    else:
        decision = "NOT_DUPLICATE"
        requires_review = False

    explanation = " ".join(reasons)

    return {
        "decision": decision,
        "similarity_score": round(combined_score, 2),
        "requires_manual_review": requires_review,
        "explanation": explanation,
        "reasons": reasons,
        "matched_complaint_id": candidate_complaint.get("id"),
        "distance_meters": gps_dist,
        "time_difference": time_label,
        "image_similarity": image_sim,
        "description_similarity": text_sim,
        "category_similarity": cat_match,
        "breakdown": {
            "distance_meters": gps_dist,
            "distance_label": dist_label,
            "time_delta_hours": time_delta,
            "time_delta_label": time_label,
            "category_match": cat_match,
            "category_label": cat_label,
            "text_similarity_percent": text_pct,
            "text_label": text_label,
            "dhash_distance": dhash_dist
        }
    }
