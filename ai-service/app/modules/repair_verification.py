"""
FixItNow AI Subsystem — Module F: Strict AI-Based Repair Verification & Officer Evidence Validation
Implements rigorous Before/After defect comparison, category-specific resolution auditing,
location consistency verification, and evidence quality auditing across 4 strict outcomes:
  1. VERIFIED_RESOLVED (Green): Original defect eliminated, repaired site verified.
  2. NOT_RESOLVED (Red): Original civic defect is still visible or defect persists.
  3. INSUFFICIENT_EVIDENCE (Amber): Evidence unrelated, blurry, non-civic, or location mismatch.
  4. NEEDS_MANUAL_REVIEW (Amber): Inconclusive/ambiguous (e.g. daytime streetlight electrical checks).
"""

import math
import logging
import re
from typing import Dict, Any, List, Optional
import cv2
import numpy as np
from PIL import Image

from .taxonomy import CANONICAL_CLASSES, CATEGORY_TAXONOMY, CLASS_MAP
from .yolo import run_yolo_detection
from .multilingual import classify_complaint

logger = logging.getLogger("fixitnow-ai-service.repair_verification")

DEFAULT_REPAIR_CONFIG = {
    "blur_min_laplacian_var": 35.0,
    "brightness_min": 30.0,
    "brightness_max": 245.0,
    "min_resolution_px": 120,
    "dhash_identical_max_dist": 5,
    "gps_match_max_meters": 45.0,
    "gps_warning_max_meters": 100.0
}

CLASS_DISPLAY_NAMES = {
    "pothole": "Pothole",
    "road_crack": "Road Crack",
    "surface_erosion": "Surface Erosion",
    "garbage_litter": "Garbage Accumulation",
    "stagnant_water": "Stagnant Water / Waterlogging",
    "open_manhole": "Open Manhole",
    "fault_streetlight": "Faulty Streetlight"
}

def validate_repair_image(img: Any, cfg: Dict[str, Any]) -> Dict[str, Any]:
    """Validates existence, format, dimensions, blur (Laplacian), and brightness."""
    if img is None:
        return {"valid": False, "reason": "Image is missing or null.", "is_blurry": False, "is_dark": False}

    try:
        if not isinstance(img, Image.Image):
            return {"valid": False, "reason": f"Unsupported image object type: {type(img)}", "is_blurry": False, "is_dark": False}

        w, h = img.size
        if w < cfg["min_resolution_px"] or h < cfg["min_resolution_px"]:
            return {"valid": False, "reason": f"Resolution too low ({w}x{h} < {cfg['min_resolution_px']}px).", "is_blurry": False, "is_dark": False}

        cv_img = cv2.cvtColor(np.array(img.convert("RGB")), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)

        blur_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        is_blurry = blur_var < cfg["blur_min_laplacian_var"]

        mean_brightness = float(np.mean(gray))
        is_dark = mean_brightness < cfg["brightness_min"]
        is_overexposed = mean_brightness > cfg["brightness_max"]

        return {
            "valid": True,
            "dimensions": (w, h),
            "blur_variance": round(blur_var, 2),
            "mean_brightness": round(mean_brightness, 2),
            "is_blurry": is_blurry,
            "is_dark": is_dark,
            "is_overexposed": is_overexposed,
            "quality_ok": not (is_blurry or is_dark or is_overexposed)
        }
    except Exception as e:
        return {"valid": False, "reason": f"Corrupted image: {str(e)}", "is_blurry": False, "is_dark": False}

def compute_dhash(img: Image.Image) -> Optional[np.ndarray]:
    """Computes a 64-bit difference hash."""
    try:
        gray = img.convert("L").resize((9, 8), Image.Resampling.BILINEAR)
        pixels = np.array(gray, dtype=np.int32)
        diff = pixels[:, :-1] > pixels[:, 1:]
        return diff.flatten()
    except Exception:
        return None

def dhash_distance(h1: Optional[np.ndarray], h2: Optional[np.ndarray]) -> Optional[int]:
    """Hamming distance between two 64-bit hashes."""
    if h1 is None or h2 is None:
        return None
    return int(np.count_nonzero(h1 != h2))

def haversine_m(lat1: Any, lon1: Any, lat2: Any, lon2: Any) -> Optional[float]:
    """Surface distance between two GPS coordinates in meters."""
    if any(c is None for c in [lat1, lon1, lat2, lon2]):
        return None
    try:
        lat1, lon1, lat2, lon2 = float(lat1), float(lon1), float(lat2), float(lon2)
        R = 6371000.0
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = math.sin(dphi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0)**2
        return round(2.0 * R * math.atan2(math.sqrt(a), math.sqrt(1.0 - a)), 2)
    except Exception:
        return None

def compute_scene_similarity(im1: Optional[Image.Image], im2: Optional[Image.Image]) -> float:
    """
    Computes visual context correlation between Before and After images.
    Returns normalized correlation in range [-1.0, 1.0].
    """
    if im1 is None or im2 is None:
        return 0.50
    try:
        np1 = np.array(im1.convert("RGB"))
        np2 = np.array(im2.convert("RGB"))
        hsv1 = cv2.cvtColor(np1, cv2.COLOR_RGB2HSV)
        hsv2 = cv2.cvtColor(np2, cv2.COLOR_RGB2HSV)
        hist1 = cv2.calcHist([hsv1], [0, 1], None, [30, 32], [0, 180, 0, 256])
        hist2 = cv2.calcHist([hsv2], [0, 1], None, [30, 32], [0, 180, 0, 256])
        cv2.normalize(hist1, hist1, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
        cv2.normalize(hist2, hist2, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
        corr = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
        return round(float(corr), 3)
    except Exception:
        return 0.50

def resolve_target_defect(
    complaint_category: Optional[str] = None,
    original_description: Optional[str] = None,
    target_class: Optional[str] = None,
    before_detections: Optional[List[Dict[str, Any]]] = None
) -> str:
    """
    Accurately infers the specific target defect class (one of the 7 canonical classes)
    from explicit target_class, before YOLO detections, or description keywords.
    """
    if target_class and target_class in CANONICAL_CLASSES:
        return target_class

    if before_detections and len(before_detections) > 0:
        c_name = before_detections[0].get("class_name")
        if c_name in CANONICAL_CLASSES:
            return c_name

    desc_lower = (original_description or "").lower()
    cat_lower = (complaint_category or "").lower()

    # Keyword rules for all 7 classes
    if re.search(r"\b(open\s*manhole|manhole|sewer\s*cover|drain\s*cover|gutter\s*cover|khula\s*manhole|dhakkan)\b", desc_lower):
        return "open_manhole"
    if re.search(r"\b(water\s*logging|waterlogging|stagnant\s*water|flood|water\s*logged|paani\s*bhara|jal\s*jamao)\b", desc_lower):
        return "stagnant_water"
    if re.search(r"\b(pothole|gaddha|crater|pit|hole\s*in\s*road)\b", desc_lower):
        return "pothole"
    if re.search(r"\b(crack|darar|fracture|crevice)\b", desc_lower):
        return "road_crack"
    if re.search(r"\b(erosion|eroded|broken\s*road|damaged\s*surface|tuta\s*road|kharab\s*sadak)\b", desc_lower):
        return "surface_erosion"
    if re.search(r"\b(garbage|trash|waste|kachra|dump|debris|litter|kuda)\b", desc_lower):
        return "garbage_litter"
    if re.search(r"\b(streetlight|street\s*light|lamp|pole|dark\s*street|batti|light\s*kharab)\b", desc_lower):
        return "fault_streetlight"

    # Fallback based on category
    if "solid waste" in cat_lower or "sanitation" in cat_lower:
        return "garbage_litter"
    if "street light" in cat_lower or "lighting" in cat_lower:
        return "fault_streetlight"
    if "drainage" in cat_lower or "sewer" in cat_lower:
        # Default Drainage to open_manhole if hole/cover mentioned, else stagnant_water
        if re.search(r"\b(cover|lid|hole|gutter)\b", desc_lower):
            return "open_manhole"
        return "stagnant_water"
    
    # Default Roads to pothole
    return "pothole"


QWERTY_SEQUENCES = [
    'qwerty', 'wertyu', 'ertyui', 'rtyuio', 'tyuiop',
    'asdfgh', 'sdfghj', 'dfghjk', 'fghjkl',
    'zxcvbn', 'xcvbnm',
    '123456', '234567', '345678', '456789', '567890'
]

GENERIC_USELESS = [
    'done', 'fixed', 'completed', 'ok done', 'work done', 'repaired', 'theek hai',
    'ho gaya', 'done sir', 'test', 'testing', 'solved', 'fine'
]

DEFECT_SPECIFIC_NOUNS = {
    'open_manhole': [
        'manhole', 'cover', 'covering', 'lid', 'cast iron', 'chamber',
        'sewer', 'drain', 'drainage', 'dhakkan', 'slab', 'gutter',
        'lohe ka dhakkan', 'jaali', 'grill', 'frame', 'मैनहोल', 'ढक्कन', 'कवर', 'सीवर', 'चेंबर', 'नाली'
    ],
    'garbage_litter': [
        'garbage', 'trash', 'waste', 'litter', 'dump', 'dumping', 'dustbin',
        'bin', 'tipper', 'loader', 'kachra', 'kachre', 'kuda', 'safai',
        'dumping ground', 'swachh', 'nagar nigam gaadi', 'कचरा', 'कूड़ा', 'सफाई', 'कचरा वाहन'
    ],
    'pothole': [
        'pothole', 'potholes', 'crater', 'pit', 'patch', 'bitumen', 'asphalt',
        'cold mix', 'hot mix', 'tar', 'gaddha', 'gaddhe', 'gadde', 'damar',
        'dāmar', 'गड्ढा', 'गड्ढे', 'डामर', 'तारकोल'
    ],
    'road_crack': [
        'crack', 'cracks', 'fissure', 'crevice', 'sealant', 'joint', 'darar',
        'daraar', 'दरार', 'दरारें'
    ],
    'surface_erosion': [
        'erosion', 'eroded', 'surface', 'gravel', 'moram', 'overlay', 'regraded',
        'kataw', 'sadak kataw', 'कटाव', 'सतह'
    ],
    'stagnant_water': [
        'waterlogging', 'waterlogged', 'stagnant', 'flood', 'flooding', 'drainage',
        'suction', 'super sucker', 'pump', 'pipe', 'pipeline', 'paani', 'pani',
        'jalbharao', 'jal jamao', 'जलभराव', 'जल जमाव'
    ],
    'fault_streetlight': [
        'streetlight', 'street light', 'lamp', 'bulb', 'led', 'fixture',
        'pole', 'wiring', 'wire', 'choke', 'fuse', 'phase', 'cable',
        'batti', 'khamba', 'taar', 'रोशनी', 'लाइट', 'स्ट्रीट लाइट', 'बल्ब', 'बत्ती', 'खंभा', 'तार'
    ]
}

def validate_officer_repair_notes(notes: Optional[str], target_defect: str, complaint_category: str = '', original_description: str = '') -> Dict[str, Any]:
    """
    Strictly verifies that the Field Officer's resolution notes describe genuine repair
    work and explicitly match the assigned civic defect / complaint category.
    Rejects gibberish, keyboard mashes, generic non-descriptive notes, and mismatched defects.
    """
    if not notes or not isinstance(notes, str) or not notes.strip():
        return {
            'is_valid': False,
            'code': 'MISSING_NOTES',
            'reason': 'Resolution description is required. Please describe the specific repair work done on site.'
        }

    clean_notes = notes.strip()
    notes_lower = clean_notes.lower()

    # 1. Alphanumeric gibberish tokens (e.g. 'et54t5')
    words = re.findall(r'[a-zA-Z0-9ऀ-ॿ]+', notes_lower)
    for w in words:
        if re.search(r'[a-z]+[0-9]+[a-z]+', w) or re.search(r'[0-9]+[a-z]+[0-9]+', w):
            return {
                'is_valid': False,
                'code': 'ALPHANUMERIC_GIBBERISH',
                'reason': f"Resolution description contains meaningless random token '{w}'. Please provide authentic repair notes."
            }
        if re.match(r'^[a-z]+$', w) and len(w) >= 5 and re.search(r'[bcdfghjklmnpqrstvwxz]{5,}', w):
            return {
                'is_valid': False,
                'code': 'CONSONANT_GIBBERISH',
                'reason': f"Resolution description contains unnatural character sequence '{w}'. Please enter valid words."
            }

    # 2. Minimum Length Check
    if len(clean_notes) < 8:
        return {
            'is_valid': False,
            'code': 'TOO_SHORT_NOTES',
            'reason': f"Resolution description is too brief ('{clean_notes}'). Please describe specific engineering actions taken on site."
        }

    # 3. Keyboard Mash Check
    for seq in QWERTY_SEQUENCES:
        if seq in notes_lower:
            return {
                'is_valid': False,
                'code': 'GIBBERISH_KEYBOARD_MASH',
                'reason': f"Resolution description contains random keyboard sequence ('{seq}'). Please enter genuine repair details."
            }

    # 4. Repeated Characters Check
    if re.search(r'(.){3,}', notes_lower):
        return {
            'is_valid': False,
            'code': 'REPEATED_CHARS',
            'reason': 'Resolution description contains excessive repetitive characters. Please enter genuine repair notes.'
        }

    # 5. Generic Useless Notes
    if notes_lower in GENERIC_USELESS or (len(words) <= 2 and all(w in ['done', 'fixed', 'ok', 'sir', 'work', 'theek', 'hai', 'gaya', 'completed'] for w in words)):
        return {
            'is_valid': False,
            'code': 'GENERIC_NON_DESCRIPTIVE_NOTES',
            'reason': f"Resolution description is too vague ('{clean_notes}'). Please describe the specific engineering actions or materials used (e.g., 'Installed new cast iron manhole cover and sealed frame')."
        }

    # 6. Target Defect and Conflict Matching
    target_nouns = DEFECT_SPECIFIC_NOUNS.get(target_defect, [])
    defect_name_clean = CLASS_DISPLAY_NAMES.get(target_defect, target_defect.replace('_', ' ').title())

    has_target_noun = any(re.search(r'\b' + re.escape(n) + r'\b', notes_lower) for n in target_nouns)

    # Check for presence of conflicting defect nouns
    conflict_found = None
    for other_defect, other_nouns in DEFECT_SPECIFIC_NOUNS.items():
        if other_defect == target_defect:
            continue
        # Also allow related road defects if target is pothole/crack/erosion
        if target_defect in ['pothole', 'road_crack', 'surface_erosion'] and other_defect in ['pothole', 'road_crack', 'surface_erosion']:
            continue
        for on in other_nouns:
            if re.search(r'\b' + re.escape(on) + r'\b', notes_lower):
                conflict_found = (CLASS_DISPLAY_NAMES.get(other_defect, other_defect), on)
                break
        if conflict_found:
            break

    # If conflicting defect noun is present and NO target noun is present -> STRICT REJECTION
    if conflict_found and not has_target_noun:
        conflict_class_name, conflict_word = conflict_found
        return {
            'is_valid': False,
            'code': 'RESOLUTION_DESCRIPTION_MISMATCH',
            'reason': f"Resolution Rejected: Repair description describes {conflict_class_name} ('{conflict_word}'), which does not match the assigned complaint defect '{defect_name_clean}'. Please provide notes matching the reported issue."
        }

    # If no target noun is present, check if original description words or category are matched
    if not has_target_noun:
        orig_words = [w for w in re.findall(r'[a-zA-Z0-9ऀ-ॿ]+', (original_description or '').lower()) if len(w) >= 4]
        has_orig_match = any(re.search(r'\b' + re.escape(ow) + r'\b', notes_lower) for ow in orig_words)
        if not has_orig_match:
            return {
                'is_valid': False,
                'code': 'RESOLUTION_DESCRIPTION_MISMATCH',
                'reason': f"Resolution Rejected: Repair description does not describe actions taken to resolve '{defect_name_clean}'. Please describe specific repair work done for {defect_name_clean}."
            }

    return {
        'is_valid': True,
        'code': 'VALID_RESOLUTION_NOTES',
        'reason': f"Repair description matches the assigned defect '{defect_name_clean}'."
    }

def verify_resolution_evidence(
    after_image: Optional[Image.Image],
    before_image: Optional[Image.Image] = None,
    complaint_category: Optional[str] = None,
    original_description: Optional[str] = None,
    target_class: Optional[str] = None,
    resolution_notes: Optional[str] = None,
    complaint_lat: Optional[float] = None,
    complaint_lng: Optional[float] = None,
    officer_lat: Optional[float] = None,
    officer_lng: Optional[float] = None,
    before_detections: Optional[List[Dict[str, Any]]] = None,
    config: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Core AI Verification Engine evaluating Field Officer's resolution proof.
    Enforces the 4 Strict Outcomes:
      - VERIFIED_RESOLVED
      - NOT_RESOLVED
      - INSUFFICIENT_EVIDENCE
      - NEEDS_MANUAL_REVIEW
    """
    cfg = config or DEFAULT_REPAIR_CONFIG
    failure_reasons: List[str] = []

    # 1. Missing Image Check
    if after_image is None:
        return {
            "status": "INSUFFICIENT_EVIDENCE",
            "outcome": "INSUFFICIENT_EVIDENCE",
            "is_valid": False,
            "can_submit": False,
            "code": "MISSING_IMAGE",
            "reason": "Resolution proof photograph is mandatory. Please capture a real-time photograph of the repaired site.",
            "badge_text": "AMBER — Evidence Rejected / Insufficient Evidence",
            "failure_reasons": ["Missing proof photograph."],
            "location_status": "UNVERIFIED",
            "distance_meters": None,
            "checks": {"image_valid": False, "description_valid": bool(resolution_notes and resolution_notes.strip())}
        }

    # 2. Resolve Target Defect & Category
    target_defect = resolve_target_defect(
        complaint_category=complaint_category,
        original_description=original_description,
        target_class=target_class,
        before_detections=before_detections
    )
    assigned_category = CATEGORY_TAXONOMY.get(target_defect, {}).get("category", complaint_category or "Roads & Potholes")
    defect_name_clean = CLASS_DISPLAY_NAMES.get(target_defect, target_defect.replace("_", " ").title())

    # 2.5 Strict Resolution Description & Complaint Matching Validation
    notes_val = validate_officer_repair_notes(
        notes=resolution_notes,
        target_defect=target_defect,
        complaint_category=assigned_category,
        original_description=original_description
    )
    if not notes_val.get("is_valid", False):
        return {
            "status": "INSUFFICIENT_EVIDENCE",
            "outcome": "INSUFFICIENT_EVIDENCE",
            "is_valid": False,
            "can_submit": False,
            "code": notes_val.get("code", "RESOLUTION_DESCRIPTION_MISMATCH"),
            "reason": notes_val.get("reason", "Repair description does not match assigned complaint."),
            "badge_text": "AMBER — Resolution Description Mismatches Complaint",
            "failure_reasons": [notes_val.get("reason", "Repair description does not match assigned complaint.")],
            "target_defect": target_defect,
            "assigned_category": assigned_category,
            "location_status": "UNVERIFIED",
            "distance_meters": None,
            "checks": {
                "image_valid": True,
                "description_valid": False,
                "description_matched": False
            }
        }

    # 3. Image Quality & Blur Checks
    img_val = validate_repair_image(after_image, cfg)
    if not img_val.get("valid", False):
        return {
            "status": "INSUFFICIENT_EVIDENCE",
            "outcome": "INSUFFICIENT_EVIDENCE",
            "is_valid": False,
            "can_submit": False,
            "code": "INVALID_IMAGE",
            "reason": f"Evidence Rejected: Image quality validation failed ({img_val.get('reason', 'Corrupted file')}). Please upload a clear photo.",
            "badge_text": "AMBER — Evidence Rejected / Insufficient Evidence",
            "failure_reasons": [img_val.get("reason", "Corrupted file")],
            "target_defect": target_defect,
            "assigned_category": assigned_category,
            "checks": {"image_valid": False}
        }

    if img_val.get("is_blurry", False):
        return {
            "status": "INSUFFICIENT_EVIDENCE",
            "outcome": "INSUFFICIENT_EVIDENCE",
            "is_valid": False,
            "can_submit": False,
            "code": "BLURRY_IMAGE",
            "reason": f"Evidence Rejected: Photographic evidence is excessively blurry (sharpness variance {img_val.get('blur_variance', 0):.1f} < {cfg['blur_min_laplacian_var']}). Please retake a sharp photograph.",
            "badge_text": "AMBER — Evidence Rejected / Insufficient Evidence",
            "failure_reasons": ["Excessively blurry photograph."],
            "target_defect": target_defect,
            "assigned_category": assigned_category,
            "checks": {"image_valid": True, "is_blurry": True}
        }

    if img_val.get("is_dark", False) or img_val.get("is_overexposed", False):
        light_issue = "too dark" if img_val.get("is_dark") else "washed out / overexposed"
        return {
            "status": "INSUFFICIENT_EVIDENCE",
            "outcome": "INSUFFICIENT_EVIDENCE",
            "is_valid": False,
            "can_submit": False,
            "code": "POOR_LIGHTING",
            "reason": f"Evidence Rejected: Photograph is {light_issue} (brightness {img_val.get('mean_brightness', 0):.1f}). Please capture a clearly lit photograph.",
            "badge_text": "AMBER — Evidence Rejected / Insufficient Evidence",
            "failure_reasons": [f"Poor lighting: {light_issue}."],
            "target_defect": target_defect,
            "assigned_category": assigned_category,
            "checks": {"image_valid": True, "is_dark": img_val.get("is_dark", False)}
        }

    # 4. Run YOLO on After Image (with OOD filter)
    y_after = run_yolo_detection(after_image, conf_threshold=0.15)

    if y_after.get("is_non_civic"):
        return {
            "status": "INSUFFICIENT_EVIDENCE",
            "outcome": "INSUFFICIENT_EVIDENCE",
            "is_valid": False,
            "can_submit": False,
            "code": "NON_CIVIC_IMAGE",
            "reason": f"Evidence Rejected: {y_after.get('flag_reason', 'Photograph depicts a non-civic scene, person, or blank surface instead of municipal infrastructure.')}",
            "badge_text": "AMBER — Evidence Rejected / Insufficient Evidence",
            "failure_reasons": [y_after.get("flag_reason", "Non-civic scene.")],
            "target_defect": target_defect,
            "assigned_category": assigned_category,
            "checks": {"image_valid": True, "is_non_civic": True}
        }

    # 5. Fraudulent Re-upload Detection (Identical photo check)
    if before_image is not None:
        h_before = compute_dhash(before_image)
        h_after = compute_dhash(after_image)
        h_dist = dhash_distance(h_before, h_after)
        if h_dist is not None and h_dist <= cfg["dhash_identical_max_dist"]:
            return {
                "status": "NOT_RESOLVED",
                "outcome": "NOT_RESOLVED",
                "is_valid": False,
                "can_submit": False,
                "code": "IDENTICAL_PHOTO_REUSE",
                "reason": "Resolution Rejected: Identical before-photograph was re-uploaded as resolution evidence. The reported defect remains unverified and unresolved.",
                "badge_text": "RED — Resolution Rejected. Unresolved Defect",
                "failure_reasons": ["Identical photograph to complaint re-uploaded as proof."],
                "target_defect": target_defect,
                "assigned_category": assigned_category,
                "checks": {"image_valid": True, "is_identical_photo": True}
            }

    # 6. Location Consistency Check (Real Haversine)
    gps_dist = haversine_m(complaint_lat, complaint_lng, officer_lat, officer_lng)
    location_status = "UNVERIFIED"
    if gps_dist is not None:
        if gps_dist <= cfg["gps_match_max_meters"]:
            location_status = "MATCHED_EXACT"
        elif gps_dist <= cfg["gps_warning_max_meters"]:
            location_status = "MATCHED_VICINITY"
        else:
            location_status = "LOCATION_MISMATCH"
            return {
                "status": "INSUFFICIENT_EVIDENCE",
                "outcome": "INSUFFICIENT_EVIDENCE",
                "is_valid": False,
                "can_submit": False,
                "code": "LOCATION_MISMATCH",
                "reason": f"Evidence Rejected: Resolution photo was captured {int(gps_dist)}m away from complaint site (> {int(cfg['gps_warning_max_meters'])}m threshold). Please capture evidence on-site.",
                "badge_text": "AMBER — Evidence Rejected / Insufficient Evidence",
                "failure_reasons": [f"Location Mismatch: Captured {int(gps_dist)}m away from complaint site."],
                "target_defect": target_defect,
                "assigned_category": assigned_category,
                "location_status": location_status,
                "distance_meters": gps_dist,
                "checks": {"image_valid": True, "location_status": location_status}
            }

    # 7. Defect Persistence Check (Does the original target defect still appear?)
    after_detections = y_after.get("detections", [])
    
    # Specific persistence thresholds per class
    thresh_map = {
        "pothole": 0.35,
        "road_crack": 0.28,
        "surface_erosion": 0.35,
        "garbage_litter": 0.28,
        "stagnant_water": 0.28,
        "open_manhole": 0.30,
        "fault_streetlight": 0.40
    }
    active_thresh = thresh_map.get(target_defect, 0.35)

    target_hits = [
        d for d in after_detections
        if d["class_name"] == target_defect and d.get("confidence", 0) >= active_thresh
    ]

    if target_hits:
        top_hit = max(target_hits, key=lambda x: x["confidence"])
        conf_pct = int(top_hit["confidence"] * 100)
        return {
            "status": "NOT_RESOLVED",
            "outcome": "NOT_RESOLVED",
            "is_valid": False,
            "can_submit": False,
            "code": "DEFECT_STILL_VISIBLE",
            "reason": f"Resolution Rejected: The original civic defect '{defect_name_clean}' is still visibly detected in the resolution photograph ({conf_pct}% confidence). Please complete the repair and upload fresh evidence.",
            "badge_text": "RED — Resolution Rejected. Defect Still Visible",
            "failure_reasons": [f"Original civic defect '{defect_name_clean}' is still visible ({conf_pct}% conf)."],
            "target_defect": target_defect,
            "assigned_category": assigned_category,
            "detected_category": top_hit.get("category"),
            "yolo_detections": target_hits,
            "yolo_count": len(target_hits),
            "location_status": location_status,
            "distance_meters": gps_dist,
            "checks": {
                "image_valid": True,
                "defect_persists": True,
                "location_status": location_status
            }
        }

    # 8. Cross-Defect Contradiction Check (CRITICAL: An unrelated damaged defect must not pass!)
    # E.g. Original is open_manhole, but after photo shows a cracked road or pothole
    conflicting_hits = [
        d for d in after_detections
        if d["class_name"] != target_defect and d.get("confidence", 0) >= 0.35
    ]

    if conflicting_hits:
        top_conflict = max(conflicting_hits, key=lambda x: x["confidence"])
        conflict_class_name = CLASS_DISPLAY_NAMES.get(top_conflict["class_name"], top_conflict["class_name"].replace("_", " ").title())
        conflict_conf_pct = int(top_conflict["confidence"] * 100)
        
        return {
            "status": "INSUFFICIENT_EVIDENCE",
            "outcome": "INSUFFICIENT_EVIDENCE",
            "is_valid": False,
            "can_submit": False,
            "code": "CROSS_DEFECT_MISMATCH",
            "reason": f"Evidence Rejected: Uploaded photograph depicts an active civic defect '{conflict_class_name}' ({conflict_conf_pct}% confidence) instead of proving resolution of the reported {defect_name_clean}. Evidence is inconsistent with the assigned complaint.",
            "badge_text": "AMBER — Evidence Rejected / Insufficient Evidence",
            "failure_reasons": [f"Photograph depicts active '{conflict_class_name}' ({conflict_conf_pct}%), unrelated to '{defect_name_clean}'."],
            "target_defect": target_defect,
            "assigned_category": assigned_category,
            "detected_category": top_conflict.get("category"),
            "yolo_detections": conflicting_hits,
            "yolo_count": len(conflicting_hits),
            "location_status": location_status,
            "distance_meters": gps_dist,
            "checks": {
                "image_valid": True,
                "defect_persists": False,
                "category_matched": False,
                "location_status": location_status
            }
        }

    # 9. Category-Specific Resolution Validation
    # Special Handling: FAULT_STREETLIGHT
    if target_defect == "fault_streetlight":
        return {
            "status": "NEEDS_MANUAL_REVIEW",
            "outcome": "NEEDS_MANUAL_REVIEW",
            "is_valid": True,
            "can_submit": True,
            "code": "STREETLIGHT_ELECTRICAL_CHECK_REQUIRED",
            "reason": "Municipal Engineer Review Required: Electrical functioning of street lighting cannot be conclusively established from a single daytime photograph. Forwarded to municipal electrical division for verification.",
            "badge_text": "AMBER — Municipal Engineer Review Required",
            "failure_reasons": [],
            "target_defect": target_defect,
            "assigned_category": assigned_category,
            "detected_category": assigned_category,
            "yolo_detections": [],
            "yolo_count": 0,
            "location_status": location_status,
            "distance_meters": gps_dist,
            "requires_manual_review": True,
            "checks": {
                "image_valid": True,
                "defect_persists": False,
                "location_status": location_status
            }
        }

    # Special Handling: OPEN_MANHOLE
    # An open manhole repair MUST show the manhole cover in place or the restored chamber.
    # If a before_image exists, check scene similarity to confirm officer is at the same spot!
    if target_defect == "open_manhole":
        if before_image is not None:
            sim = compute_scene_similarity(before_image, after_image)
            if sim < 0.15:
                return {
                    "status": "INSUFFICIENT_EVIDENCE",
                    "outcome": "INSUFFICIENT_EVIDENCE",
                    "is_valid": False,
                    "can_submit": False,
                    "code": "MANHOLE_LOCATION_UNVERIFIED",
                    "reason": "Evidence Rejected: Uploaded photograph does not match the original complaint location or show the repaired manhole cover. Please photograph the secured manhole lid at the reported site.",
                    "badge_text": "AMBER — Evidence Rejected / Insufficient Evidence",
                    "failure_reasons": ["Photo does not show the reported manhole structure or its repaired cover."],
                    "target_defect": target_defect,
                    "assigned_category": assigned_category,
                    "yolo_detections": [],
                    "yolo_count": 0,
                    "location_status": location_status,
                    "distance_meters": gps_dist,
                    "checks": {
                        "image_valid": True,
                        "defect_persists": False,
                        "scene_similarity": sim,
                        "location_status": location_status
                    }
                }
        else:
            # Without before-photo, zero detections of manhole alone is inconclusive
            # Forward for manual municipal engineer confirmation
            return {
                "status": "NEEDS_MANUAL_REVIEW",
                "outcome": "NEEDS_MANUAL_REVIEW",
                "is_valid": True,
                "can_submit": True,
                "code": "MANHOLE_MANUAL_CONFIRMATION_REQUIRED",
                "reason": "Municipal Engineer Review Required: Original citizen photo unavailable for before/after comparison. Forwarded for on-ground municipal engineer inspection.",
                "badge_text": "AMBER — Municipal Engineer Review Required",
                "failure_reasons": [],
                "target_defect": target_defect,
                "assigned_category": assigned_category,
                "yolo_detections": [],
                "yolo_count": 0,
                "location_status": location_status,
                "distance_meters": gps_dist,
                "requires_manual_review": True,
                "checks": {
                    "image_valid": True,
                    "defect_persists": False,
                    "location_status": location_status
                }
            }

    # Category Specific Success Descriptions:
    success_descriptions = {
        "garbage_litter": "Photographic evidence confirms garbage accumulation has been cleared and site verified clean.",
        "stagnant_water": "Photographic evidence confirms waterlogging has fully receded and drainage is restored.",
        "pothole": "Photographic evidence confirms pothole has been filled and road surface restored.",
        "road_crack": "Photographic evidence confirms road crack has been sealed and resurfaced.",
        "surface_erosion": "Photographic evidence confirms eroded road surface has been resurfaced.",
        "open_manhole": "Photographic evidence confirms open manhole has been properly covered and secured."
    }

    succ_text = success_descriptions.get(target_defect, f"Photographic evidence confirms {defect_name_clean} has been successfully repaired.")

    return {
        "status": "VERIFIED_RESOLVED",
        "outcome": "VERIFIED_RESOLVED",
        "is_valid": True,
        "can_submit": True,
        "code": "VERIFIED_RESOLVED",
        "reason": f"AI Evidence Verification Passed: {succ_text} Candidate for Municipal Approval.",
        "badge_text": "GREEN — AI Evidence Verification Passed. Candidate for Municipal Approval",
        "failure_reasons": [],
        "target_defect": target_defect,
        "assigned_category": assigned_category,
        "detected_category": assigned_category,
        "yolo_detections": [],
        "yolo_count": 0,
        "location_status": location_status,
        "distance_meters": gps_dist,
        "checks": {
            "image_valid": True,
            "defect_persists": False,
            "category_matched": True,
            "location_status": location_status,
            "distance_meters": gps_dist
        },
        "verification_score": 95 if location_status == "MATCHED_EXACT" else 85
    }

def verify_repair(
    before_image: Optional[Image.Image],
    after_image: Optional[Image.Image],
    before_metadata: Optional[Dict[str, Any]] = None,
    after_metadata: Optional[Dict[str, Any]] = None,
    target_class: Optional[str] = None,
    original_description: Optional[str] = None,
    resolution_description: Optional[str] = None,
    config: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Backward-compatible wrapper mapping into verify_resolution_evidence.
    """
    b_meta = before_metadata or {}
    a_meta = after_metadata or {}

    res = verify_resolution_evidence(
        after_image=after_image,
        before_image=before_image,
        complaint_category=b_meta.get("category"),
        original_description=original_description or b_meta.get("description"),
        target_class=target_class or b_meta.get("target_class"),
        resolution_notes=resolution_description or a_meta.get("notes"),
        complaint_lat=b_meta.get("lat"),
        complaint_lng=b_meta.get("lng"),
        officer_lat=a_meta.get("lat"),
        officer_lng=a_meta.get("lng"),
        config=config
    )

    # Return structure matching expected legacy fields while providing new 4-outcome fields
    res["decision"] = res["status"]
    res["recommendation"] = res["status"]
    res["decision_reasons"] = [res["reason"]]
    res["evidence"] = {
        "target_defect": res.get("target_defect"),
        "original_category": res.get("assigned_category"),
        "resolution_category": res.get("detected_category"),
        "after_defect_count": res.get("yolo_count", 0),
        "yolo_detections": res.get("yolo_detections", []),
        "gps_distance_m": res.get("distance_meters"),
        "location_status": res.get("location_status")
    }
    res["requires_manual_review"] = True  # Municipal admin final review is always required
    return res
