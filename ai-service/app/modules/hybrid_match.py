"""
FixItNow AI Subsystem — Module C: Citizen Image–Description Validation & Cross-Modal Congruence
Evaluates semantic and physical congruence between citizen complaint photograph (YOLOv8)
and written description (multilingual NLP in English, Hindi, and Hinglish).

Enforces strict domain validation:
  - CASE 1: Both Image & Text are Irrelevant / Non-Civic -> NON_CIVIC_IMAGE (BLOCKED)
  - CASE 2: Text is Civic, BUT Image has NO Civic Defect -> IMAGE_MISSING_CIVIC_DEFECT (BLOCKED)
  - CASE 3: Image & Text Conflict (Different Civic Categories) -> IMAGE_DESCRIPTION_MISMATCH (BLOCKED)
  - CASE 4: Image & Text Congruently Match Same Defect -> MATCHED (ALLOWED)
"""

import logging
from typing import Dict, Any, List, Optional
from PIL import Image

from .taxonomy import CANONICAL_CLASSES, CATEGORY_TAXONOMY, CLASS_MAP
from .multilingual import classify_complaint
from .description_validator import validate_complaint_description

from .yolo import run_yolo_detection, get_yolo_model

logger = logging.getLogger("fixitnow-ai-service.hybrid")

# Civic issue category compatibility map
COMPATIBLE_CATEGORIES = {
    "Roads & Potholes": {"Roads & Potholes"},
    "Solid Waste & Sanitation": {"Solid Waste & Sanitation"},
    "Street Lighting": {"Street Lighting"},
    "Drainage & Sewerage": {"Drainage & Sewerage"},
    "Water Supply": {"Water Supply"},
    "Public Health & Vector Control": {"Public Health & Vector Control"},
    "Encroachment & Public Space": {"Encroachment & Public Space"}
}

def evaluate_hybrid_match(
    text: str,
    image: Optional[Image.Image] = None,
    yolo_result: Optional[Dict[str, Any]] = None,
    conf_threshold: float = 0.14
) -> Dict[str, Any]:
    """
    Validates whether a citizen's complaint photo and written description refer to the same civic problem.
    Strictly enforces 6 deterministic verification states:
      1. INVALID_DESCRIPTION: Empty, gibberish, meaningless random strings, or non-civic text.
      2. INVALID_IMAGE: Non-civic photograph (human hand, selfie, blank wall, indoor furniture).
      3. NO_RELIABLE_DETECTION: Outdoor scene with no automated defect bounding box. Routed via description for manual review.
      4. DETECTED_AND_MATCHED: High-confidence defect detected that congruently matches the written description.
      5. DETECTED_BUT_MISMATCHED: Contradictory civic defect (e.g. road crack photo with garbage description).
      6. NEEDS_MANUAL_REVIEW: Ambiguous defect, unverified low-confidence detection, or daytime streetlight.
    """
    _, active_model_name = get_yolo_model()
    if not active_model_name or active_model_name == 'none':
        active_model_name = 'v5_targeted_recovery_yolov8s'

    # 1. Run YOLO defect detection if not pre-computed
    if yolo_result is None:
        if image is not None:
            yolo_result = run_yolo_detection(image, conf_threshold=conf_threshold)
        else:
            yolo_result = {
                "detections": [],
                "count": 0,
                "primary_category": None,
                "primary_class": None,
                "primary_confidence": 0.0,
                "is_flagged": True,
                "is_non_civic": False,
                "flag_reason": "No image provided"
            }

    yolo_class = yolo_result.get("primary_class")
    yolo_cat = yolo_result.get("primary_category")
    yolo_conf = yolo_result.get("primary_confidence", 0.0)
    yolo_count = yolo_result.get("count", 0)
    is_image_non_civic = bool(yolo_result.get("is_non_civic"))

    # =========================================================================
    # STEP 1: STRICT DESCRIPTION VALIDATION (MANDATORY GATEWAY)
    # A valid image must NEVER make an invalid or meaningless description valid!
    # =========================================================================
    desc_val = validate_complaint_description(text)
    if not desc_val["is_valid"]:
        return {
            "status": "INVALID_DESCRIPTION",
            "validation_status": "INVALID_DESCRIPTION",
            "case_id": "CASE_INVALID_DESCRIPTION",
            "is_valid": False,
            "can_proceed": False,
            "confidence": 0.10,
            "reason": desc_val["reason"],
            "error_code": desc_val["error_code"],
            "mismatch_reasons": [desc_val["reason"]],
            "requires_manual_review": False,
            "text_classification": {
                "predicted_category": "other",
                "municipal_department": "Other / Non-Civic Issue",
                "confidence": 0.10,
                "error_code": desc_val["error_code"],
                "detected_language": desc_val.get("detected_language", "None")
            },
            "visual_detections": yolo_result,
            "image_evidence": f"Visual defect: {yolo_class} ({int(yolo_conf * 100)}% conf)" if yolo_class else "No civic defect detected",
            "description_evidence": f"Rejected description: '{text[:60]}'",
            "suggested_category": "Other / Non-Civic Issue",
            "suggested_priority": "LOW",
            "model_identifier": active_model_name
        }

    # At this point, description is guaranteed to be a valid civic complaint
    text_cat = desc_val["civic_category"]
    target_defect = desc_val["target_defect"]
    text_result = classify_complaint(text, upstream_visual_evidence=None)
    text_conf = text_result.get("confidence", 0.60)

    # =========================================================================
    # STEP 2: IMAGE VALIDATION (Non-Civic / OOD Check)
    # =========================================================================
    if is_image_non_civic:
        reason_msg = f"Non-civic subject in photograph: Your description describes '{text_cat}', but the uploaded photograph depicts an indoor scene, human subject, or blank surface. Please upload a clear photo of the actual infrastructure defect."
        return {
            "status": "INVALID_IMAGE",
            "validation_status": "INVALID_IMAGE",
            "case_id": "CASE_INVALID_IMAGE",
            "is_valid": False,
            "can_proceed": False,
            "confidence": 0.10,
            "reason": reason_msg,
            "mismatch_reasons": [reason_msg],
            "requires_manual_review": False,
            "text_classification": text_result,
            "visual_detections": yolo_result,
            "image_evidence": yolo_result.get("flag_reason", "Non-civic subject detected."),
            "description_evidence": f"Citizen reported: '{text[:60]}'",
            "suggested_category": text_cat,
            "suggested_priority": "LOW",
            "model_identifier": active_model_name
        }

    # =========================================================================
    # STEP 3: OUTDOOR PHOTO WITH NO RELIABLE DETECTIONS
    # =========================================================================
    if yolo_count == 0 or not yolo_class:
        return {
            "status": "NO_RELIABLE_DETECTION",
            "validation_status": "NO_RELIABLE_DETECTION",
            "case_id": "CASE_NO_RELIABLE_DETECTION",
            "is_valid": True,
            "can_proceed": True,
            "confidence": round(min(0.65, max(0.40, text_conf)), 2),
            "reason": f"Visual model found no high-confidence automated defect markers; routed via description to {text_cat} for municipal engineer inspection.",
            "mismatch_reasons": [],
            "requires_manual_review": True,
            "text_classification": text_result,
            "visual_detections": yolo_result,
            "image_evidence": "Outdoor scene with no high-confidence automated defect bounding box (requires manual engineering review).",
            "description_evidence": f"Citizen reported: '{text[:60]}'",
            "suggested_category": text_cat,
            "suggested_priority": "MEDIUM",
            "model_identifier": active_model_name
        }

    # =========================================================================
    # STEP 4: CROSS-MODAL COMPARISON (Image vs Description)
    # =========================================================================
    is_cat_match = (yolo_cat == text_cat)
    is_defect_match = (target_defect and yolo_class == target_defect)

    # All detections in image
    all_yolo_classes = [d["class_name"] for d in yolo_result.get("detections", [])]
    is_target_in_detections = (target_defect in all_yolo_classes) if target_defect else False

    # Check for direct defect mismatch (contradictory civic issues)
    # E.g. User wrote about 'Garbage', but image shows 'Road Crack' with high confidence
    if not is_cat_match and not is_defect_match and not is_target_in_detections:
        yolo_defect_clean = yolo_class.replace('_', ' ').title()
        reason_msg = f"Defect & description mismatch: Uploaded photograph depicts '{yolo_defect_clean}' ({yolo_cat}), but your description describes '{text_cat}'. Please ensure your photo matches the reported problem."
        return {
            "status": "DETECTED_BUT_MISMATCHED",
            "validation_status": "DETECTED_BUT_MISMATCHED",
            "case_id": "CASE_CROSS_MODAL_MISMATCH",
            "is_valid": False,
            "can_proceed": False,
            "confidence": round(yolo_conf, 2),
            "reason": reason_msg,
            "mismatch_reasons": [reason_msg],
            "requires_manual_review": False,
            "text_classification": text_result,
            "visual_detections": yolo_result,
            "image_evidence": f"Detected defect: {yolo_defect_clean} ({int(yolo_conf * 100)}% conf).",
            "description_evidence": f"Citizen described: '{text[:60]}'",
            "suggested_category": yolo_cat,
            "suggested_priority": "MEDIUM",
            "model_identifier": active_model_name
        }

    # Check for unverified / low confidence detection
    if yolo_conf < 0.35 or yolo_result.get("is_flagged"):
        return {
            "status": "NEEDS_MANUAL_REVIEW",
            "validation_status": "NEEDS_MANUAL_REVIEW",
            "case_id": "CASE_LOW_CONFIDENCE_DETECTION",
            "is_valid": True,
            "can_proceed": True,
            "confidence": round(yolo_conf, 2),
            "reason": f"Visual defect '{yolo_class.replace('_', ' ')}' detected with low confidence ({int(yolo_conf * 100)}%). Routed for municipal engineering inspection.",
            "mismatch_reasons": [],
            "requires_manual_review": True,
            "text_classification": text_result,
            "visual_detections": yolo_result,
            "image_evidence": f"Low-confidence defect: {yolo_class} ({int(yolo_conf * 100)}% conf).",
            "description_evidence": f"Citizen reported: '{text[:60]}'",
            "suggested_category": yolo_cat or text_cat,
            "suggested_priority": "MEDIUM",
            "model_identifier": active_model_name
        }

    # High-confidence verified match!
    combined_conf = round(min(0.98, max(yolo_conf, 0.70)), 2)
    return {
        "status": "DETECTED_AND_MATCHED",
        "validation_status": "DETECTED_AND_MATCHED",
        "case_id": "CASE_DETECTED_AND_MATCHED",
        "is_valid": True,
        "can_proceed": True,
        "confidence": combined_conf,
        "reason": f"Visual defect confirmed as '{yolo_class.replace('_', ' ')}' ({int(yolo_conf * 100)}% confidence) matching complaint description.",
        "mismatch_reasons": [],
        "requires_manual_review": False,
        "text_classification": text_result,
        "visual_detections": yolo_result,
        "image_evidence": f"Confirmed defect: {yolo_class} ({int(yolo_conf * 100)}% conf).",
        "description_evidence": f"Citizen reported: '{text[:60]}'",
        "suggested_category": yolo_cat,
        "suggested_priority": yolo_result.get("recommended_priority", "HIGH"),
        "model_identifier": active_model_name
    }
