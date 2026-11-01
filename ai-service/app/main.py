"""
FixItNow Civic Grievance Management Platform — Unified Multimodal AI Microservice
Combines YOLOv8 defect detection, Multilingual NLP classification (EN, HI, Hinglish),
Multi-factor risk scoring, Hybrid image-text context matching, Duplicate complaint triage,
and Advisory Before/After repair verification.
"""

import os
import io
import time
import base64
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any, Union

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image

from .modules.taxonomy import CANONICAL_CLASSES, CLASS_MAP, CATEGORY_TAXONOMY
from .modules.yolo import get_yolo_model, run_yolo_detection
from .modules.multilingual import classify_complaint
from .modules.priority import assign_complaint_priority
from .modules.hybrid_match import evaluate_hybrid_match
from .modules.duplicate import evaluate_duplicate_decision
from .modules.repair_verification import verify_repair

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("fixitnow-ai-service")

APP_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = APP_DIR.parent.parent

# Pre-load YOLO model singleton at startup
yolo_model, model_name = get_yolo_model()

app = FastAPI(
    title="FixItNow Unified Multimodal AI Service",
    description="Multimodal AI service providing real YOLOv8 object detection, multilingual NLP triage, safety-first priority scoring, duplicate screening, and resolution repair verification for Indian civic grievances.",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------------
# Request & Response Schemas
# ------------------------------------------------------------------------------

class TriageRequest(BaseModel):
    description: Optional[str] = ""
    pincode: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    media: Optional[List[Any]] = []
    image_path: Optional[str] = None
    image_base64: Optional[str] = None

class DetectionRequest(BaseModel):
    image_path: Optional[str] = None
    image_base64: Optional[str] = None
    conf_threshold: Optional[float] = 0.25

class ClassifyRequest(BaseModel):
    text: str
    upstream_visual_evidence: Optional[Dict[str, Any]] = None

class PriorityRequest(BaseModel):
    description: Optional[str] = ""
    text: Optional[str] = None
    category: Optional[str] = None
    target_class: Optional[str] = None
    landmark: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    upstream_visual_evidence: Optional[Dict[str, Any]] = None
    detected_classes: Optional[List[str]] = None

class HybridMatchRequest(BaseModel):
    text: str
    image_path: Optional[str] = None
    image_base64: Optional[str] = None
    conf_threshold: Optional[float] = 0.25

class DuplicateCheckRequest(BaseModel):
    new_complaint: Dict[str, Any]
    candidates: List[Dict[str, Any]]

class VerifyRepairRequest(BaseModel):
    before_image_path: Optional[str] = None
    before_image_base64: Optional[str] = None
    after_image_path: Optional[str] = None
    after_image_base64: Optional[str] = None
    before_metadata: Optional[Dict[str, Any]] = None
    after_metadata: Optional[Dict[str, Any]] = None
    target_class: Optional[str] = None
    original_description: Optional[str] = None
    resolution_description: Optional[str] = None

class ValidateResolutionRequest(BaseModel):
    complaint_id: Optional[str] = None
    complaint_category: Optional[str] = None
    original_description: Optional[str] = None
    target_class: Optional[str] = None
    resolution_notes: str = ""
    resolution_image_path: Optional[str] = None
    resolution_image_base64: Optional[str] = None
    before_image_path: Optional[str] = None
    before_image_base64: Optional[str] = None
    complaint_lat: Optional[float] = None
    complaint_lng: Optional[float] = None
    officer_lat: Optional[float] = None
    officer_lng: Optional[float] = None

# ------------------------------------------------------------------------------
# Helper: Universal Image Resolver
# ------------------------------------------------------------------------------

def resolve_image_from_input(
    image_path: Optional[str] = None,
    image_base64: Optional[str] = None,
    media_list: Optional[List[Any]] = None
) -> Optional[Image.Image]:
    """Safely extracts and opens an image from base64, file path, or media array."""
    # 1. Base64
    if image_base64:
        try:
            if "," in image_base64:
                image_base64 = image_base64.split(",", 1)[1]
            img_bytes = base64.b64decode(image_base64)
            return Image.open(io.BytesIO(img_bytes)).convert("RGB")
        except Exception as e:
            logger.warning(f"Failed to decode base64 image: {e}")

    # 2. File paths and media list
    candidates = []
    if image_path:
        candidates.append(image_path)

    if media_list:
        for item in media_list:
            if isinstance(item, str):
                candidates.append(item)
            elif isinstance(item, dict):
                for k in ["storage_path", "path", "url"]:
                    if item.get(k):
                        candidates.append(item[k])

    for path_str in candidates:
        if not path_str or not isinstance(path_str, str):
            continue
        try:
            # Check if base64 data URL
            if path_str.startswith("data:image"):
                b64_part = path_str.split(",", 1)[1] if "," in path_str else path_str
                img_bytes = base64.b64decode(b64_part)
                return Image.open(io.BytesIO(img_bytes)).convert("RGB")

            # Check if remote URL
            if path_str.startswith("http://") or path_str.startswith("https://"):
                import urllib.parse
                parsed = urllib.parse.urlparse(path_str)
                fname = Path(parsed.path).name
                local_f = PROJECT_ROOT / "uploads" / "complaints" / fname
                if local_f.is_file():
                    return Image.open(local_f).convert("RGB")
                try:
                    import urllib.request
                    req = urllib.request.Request(path_str, headers={"User-Agent": "FixItNow-AI/1.0"})
                    with urllib.request.urlopen(req, timeout=3.0) as resp:
                        return Image.open(io.BytesIO(resp.read())).convert("RGB")
                except Exception as net_err:
                    logger.debug(f"Could not fetch remote image {path_str}: {net_err}")

            # Check local file
            clean_path = path_str.replace("/", os.sep).replace("\\", os.sep)
            p = Path(clean_path)
            if p.is_file():
                return Image.open(p).convert("RGB")

            if "Fix-It-Now-Making-India-Smart" in clean_path:
                rel_stripped = clean_path.split("Fix-It-Now-Making-India-Smart", 1)[1].lstrip(os.sep)
                p_rel = PROJECT_ROOT / rel_stripped
                if p_rel.is_file():
                    return Image.open(p_rel).convert("RGB")

            parent_rel = PROJECT_ROOT.parent / clean_path.lstrip(os.sep)
            if parent_rel.is_file():
                return Image.open(parent_rel).convert("RGB")

            project_upload = PROJECT_ROOT / clean_path.lstrip(os.sep)
            if project_upload.is_file():
                return Image.open(project_upload).convert("RGB")

            server_upload = PROJECT_ROOT / "server" / clean_path.lstrip(os.sep)
            if server_upload.is_file():
                return Image.open(server_upload).convert("RGB")

            uploads_folder = PROJECT_ROOT / "uploads" / "complaints" / Path(clean_path).name
            if uploads_folder.is_file():
                return Image.open(uploads_folder).convert("RGB")

        except Exception as e:
            logger.debug(f"Could not open candidate image path {path_str}: {e}")

    return None

# ------------------------------------------------------------------------------
# API Endpoints
# ------------------------------------------------------------------------------

@app.get("/")
@app.get("/health")
def read_root():
    import torch
    return {
        "status": "online",
        "service": "FixItNow Unified Multimodal AI Service",
        "version": "3.0.0",
        "active_model": model_name,
        "supported_classes": CANONICAL_CLASSES,
        "modules_loaded": [
            "citizen_image_description_validator",
            "yolov8_defect_detection",
            "multilingual_nlp_classifier",
            "safety_first_priority_engine",
            "advanced_duplicate_detection",
            "officer_evidence_validator",
            "multifactor_repair_verification"
        ],
        "cuda_available": torch.cuda.is_available()
    }

@app.post("/api/detect")
async def detect_image(
    file: Optional[UploadFile] = File(None),
    image_path: Optional[str] = Form(None),
    image_base64: Optional[str] = Form(None),
    conf_threshold: Optional[float] = Form(0.18)
):
    """Executes YOLOv8 defect detection on uploaded multipart file or file path."""
    img = None
    if file:
        try:
            contents = await file.read()
            img = Image.open(io.BytesIO(contents)).convert("RGB")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Corrupted or invalid image file: {str(e)}")
    else:
        img = resolve_image_from_input(image_path=image_path, image_base64=image_base64)

    if img is None:
        raise HTTPException(status_code=400, detail="No valid image provided. Provide a file upload, local image_path, or image_base64.")

    return run_yolo_detection(img, conf_threshold=conf_threshold or 0.18)

@app.post("/api/detect/json")
def detect_image_json(payload: DetectionRequest):
    """Programmatic JSON endpoint for YOLOv8 detection."""
    img = resolve_image_from_input(image_path=payload.image_path, image_base64=payload.image_base64)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not resolve image from image_path or image_base64.")
    return run_yolo_detection(img, conf_threshold=payload.conf_threshold or 0.14)


@app.post("/api/validate-description")
def validate_description_endpoint(payload: ClassifyRequest):
    """Module: Strict description and civic intent validation."""
    from .modules.description_validator import validate_complaint_description
    return validate_complaint_description(payload.text or "")

@app.post("/api/classify")
def classify_text_endpoint(payload: ClassifyRequest):
    """
    Evidence-driven multilingual complaint category classifier.
    Supports English, Hindi (Devanagari), and Hinglish with negation/uncertainty tracking.
    """
    return classify_complaint(payload.text, upstream_visual_evidence=payload.upstream_visual_evidence)

@app.post("/api/priority")
def priority_endpoint(payload: PriorityRequest):
    """
    Transparent safety-first 6-factor weighted priority engine.
    Calculates priority tier, numerical risk score (0-100), and recommended SLA.
    """
    desc = payload.description or payload.text or ""
    cat_result = None
    if payload.target_class and payload.target_class in CANONICAL_CLASSES:
        cat_result = {"predicted_category": payload.target_class}
    elif payload.category and payload.category in CANONICAL_CLASSES:
        cat_result = {"predicted_category": payload.category}
    elif payload.detected_classes:
        best_c = max(payload.detected_classes, key=lambda c: CATEGORY_TAXONOMY.get(c, {}).get("base_risk", 0))
        cat_result = {"predicted_category": best_c}
    elif desc:
        cat_result = classify_complaint(desc, upstream_visual_evidence=payload.upstream_visual_evidence)
    elif payload.category:
        for c_k, c_v in CATEGORY_TAXONOMY.items():
            if c_v.get("category", "").lower() == payload.category.lower():
                cat_result = {"predicted_category": c_k}
                break

    input_dict = payload.model_dump()
    input_dict["description"] = desc

    res_p = assign_complaint_priority(
        complaint_input=input_dict,
        category_result=cat_result,
        upstream_visual_evidence=payload.upstream_visual_evidence
    )
    res_p['priority'] = res_p.get('priority_level')
    return res_p

@app.post("/api/hybrid-match")
def hybrid_match_endpoint(payload: HybridMatchRequest):
    """
    Evaluates semantic congruence between complaint text and photographic evidence.
    Identifies contradictions, ambiguities, and confirmed matches.
    """
    img = resolve_image_from_input(image_path=payload.image_path, image_base64=payload.image_base64)
    return evaluate_hybrid_match(
        text=payload.text,
        image=img,
        conf_threshold=payload.conf_threshold or 0.14
    )

@app.post("/api/validate-submission")
def validate_submission_endpoint(req: TriageRequest):
    """
    Module 1: Strict Citizen Image-Description Validation Endpoint.
    Validates whether the uploaded photo contains a recognizable civic defect
    and matches the written description before allowing progression.
    """
    desc = req.description or ""
    img = resolve_image_from_input(
        image_path=req.image_path,
        image_base64=req.image_base64,
        media_list=req.media
    )

    visual_result = None
    if img is not None:
        visual_result = run_yolo_detection(img, conf_threshold=0.14)

    match_result = evaluate_hybrid_match(text=desc, image=img, yolo_result=visual_result)
    
    # If the submission is invalid (non-civic, missing defect, or mismatch), do NOT output a high-confidence category or priority!
    if not match_result["is_valid"]:
        primary_category = match_result.get("suggested_category", "Other / Non-Civic Issue")
        category_confidence = 0.10
        priority_level = match_result.get("suggested_priority", "LOW")
        risk_score = 0
        priority_confidence = 0.10
        priority_reason = match_result.get("reason", "Submission flagged: Not verified as an actionable civic problem.")
        safety_override = False
    else:
        upstream_evidence = None
        if visual_result and visual_result.get("detections"):
            upstream_evidence = {
                "primary_class": visual_result["primary_class"],
                "primary_confidence": visual_result["primary_confidence"]
            }
        cat_result = classify_complaint(desc, upstream_visual_evidence=upstream_evidence)
        primary_category = cat_result["municipal_department"]
        category_confidence = round(float(cat_result["confidence"]), 2)
        
        complaint_dict = {
            "description": desc,
            "pincode": req.pincode,
            "lat": req.lat,
            "lng": req.lng,
            "category": cat_result["predicted_category"]
        }
        pri_result = assign_complaint_priority(
            complaint_input=complaint_dict,
            category_result=cat_result,
            upstream_visual_evidence=upstream_evidence
        )
        priority_level = pri_result["priority_level"]
        risk_score = pri_result["risk_score"]
        priority_confidence = pri_result["confidence"]
        priority_reason = pri_result["priority_reason"]
        safety_override = pri_result.get("safety_override_triggered")

    is_vis_flagged = visual_result.get("is_flagged", False) if visual_result else True
    vis_flag_reason = visual_result.get("flag_reason") if visual_result else "No visual detection."
    vis_conf = visual_result.get("primary_confidence", 0.0) if visual_result else 0.0

    return {
        "is_valid": match_result["is_valid"],
        "can_proceed": match_result.get("can_proceed", match_result["is_valid"]),
        "validation_status": match_result["validation_status"],
        "case_id": match_result.get("case_id"),
        "reason": match_result["reason"],
        "mismatch_reasons": match_result["mismatch_reasons"],
        "primary_category": primary_category,
        "category_confidence": category_confidence,
        "image_evidence": match_result.get("image_evidence", ""),
        "description_evidence": match_result.get("description_evidence", ""),
        "priority": priority_level,
        "risk_score": risk_score,
        "priority_confidence": priority_confidence,
        "priority_reason": priority_reason,
        "safety_override_triggered": safety_override,
        "model_identifier": model_name,
        "is_flagged": is_vis_flagged or (match_result.get("validation_status") == "NEEDS_MANUAL_REVIEW"),
        "flag_reason": vis_flag_reason or match_result.get("reason"),
        "visual_confidence": vis_conf,
        "text_confidence": category_confidence,
        "detections": visual_result["detections"] if visual_result else [],
        "annotated_image": visual_result.get("annotated_image") if visual_result else None
    }

@app.post("/api/duplicates/check")
def duplicates_check_endpoint(payload: DuplicateCheckRequest):
    """
    Module 4: Advanced Duplicate Complaint Detection.
    Multi-signal screening across GPS distance, temporal delta, category, and perceptual image hashing.
    """
    new_c = payload.new_complaint
    new_img = resolve_image_from_input(
        image_path=new_c.get("image_path"),
        image_base64=new_c.get("image_base64"),
        media_list=new_c.get("media")
    )

    evaluated_candidates = []
    for cand in payload.candidates:
        cand_img = resolve_image_from_input(
            image_path=cand.get("image_path"),
            image_base64=cand.get("image_base64"),
            media_list=cand.get("media")
        )
        res = evaluate_duplicate_decision(
            new_complaint=new_c,
            candidate_complaint=cand,
            new_image=new_img,
            candidate_image=cand_img
        )
        if res["decision"] in ["CONFIRMED_DUPLICATE", "POSSIBLE_DUPLICATE"] or res["similarity_score"] >= 0.60:
            evaluated_candidates.append({
                "candidate_id": cand.get("id"),
                "complaint_number": cand.get("complaint_number"),
                "decision": res["decision"],
                "similarity_score": res["similarity_score"],
                "distance_meters": res.get("distance_meters"),
                "time_difference": res.get("time_difference"),
                "image_similarity": res.get("image_similarity"),
                "description_similarity": res.get("description_similarity"),
                "category_similarity": res.get("category_similarity"),
                "reasons": res["reasons"],
                "explanation": res["explanation"],
                "requires_manual_review": res["requires_manual_review"],
                "breakdown": res.get("breakdown", {})
            })

    evaluated_candidates.sort(key=lambda x: x["similarity_score"], reverse=True)
    return {
        "candidate_count": len(evaluated_candidates),
        "duplicate_candidates": evaluated_candidates,
        "has_confirmed_duplicate": any(c["decision"] == "CONFIRMED_DUPLICATE" for c in evaluated_candidates)
    }

@app.post("/api/validate-resolution")
def validate_resolution_endpoint(req: ValidateResolutionRequest):
    """
    Module 5: Field Officer Resolution Pre-Submission Validation.
    Evaluates officer resolution evidence against the original complaint across 4 strict outcomes:
      1. VERIFIED_RESOLVED: Original defect eliminated, repaired site verified clean.
      2. NOT_RESOLVED: Original civic defect still visible or persists.
      3. INSUFFICIENT_EVIDENCE: Unrelated image, blurry, non-civic, or location mismatch.
      4. NEEDS_MANUAL_REVIEW: Inconclusive (e.g. daytime streetlight electrical checks).
    """
    b_img = resolve_image_from_input(
        image_path=req.before_image_path,
        image_base64=req.before_image_base64
    )
    a_img = resolve_image_from_input(
        image_path=req.resolution_image_path,
        image_base64=req.resolution_image_base64
    )

    from .modules.repair_verification import verify_resolution_evidence

    res = verify_resolution_evidence(
        after_image=a_img,
        before_image=b_img,
        complaint_category=req.complaint_category,
        original_description=req.original_description,
        target_class=req.target_class,
        resolution_notes=req.resolution_notes,
        complaint_lat=req.complaint_lat,
        complaint_lng=req.complaint_lng,
        officer_lat=req.officer_lat,
        officer_lng=req.officer_lng
    )

    return res

@app.post("/api/verify-repair")
def verify_repair_endpoint(payload: VerifyRepairRequest):
    """
    Module 6: Multi-Factor Advisory Repair Verification.
    Compares original citizen evidence with officer repair evidence across 5 pillars.
    """
    b_img = resolve_image_from_input(image_path=payload.before_image_path, image_base64=payload.before_image_base64)
    a_img = resolve_image_from_input(image_path=payload.after_image_path, image_base64=payload.after_image_base64)

    return verify_repair(
        before_image=b_img,
        after_image=a_img,
        before_metadata=payload.before_metadata,
        after_metadata=payload.after_metadata,
        target_class=payload.target_class,
        original_description=payload.original_description,
        resolution_description=payload.resolution_description
    )

@app.post("/api/triage")
def triage_complaint(req: TriageRequest):
    """
    Unified Multimodal Triage Endpoint (Modules 1, 2, 3):
    Combines YOLOv8 visual evidence, Multilingual NLP text classification,
    and 6-Factor Safety-First Priority scoring.
    """
    desc = req.description or ""
    img = resolve_image_from_input(
        image_path=req.image_path,
        image_base64=req.image_base64,
        media_list=req.media
    )

    # 1. Run YOLO detection if image provided
    visual_result = None
    if img is not None:
        visual_result = run_yolo_detection(img, conf_threshold=0.14)

    # 2. Multilingual Category Classification (Pure Text first to prevent silent visual override)
    pure_text_result = classify_complaint(desc, upstream_visual_evidence=None)
    
    # 3. Hybrid Cross-Modal Verification (Module 1)
    hybrid_status = "NOT_EVALUATED"
    hybrid_reasons = []
    hybrid_val_status = "NOT_EVALUATED"
    is_valid = True
    validation_reason = ""
    image_evid = "No image provided"
    desc_evid = f"User reported: '{desc[:60]}...'"

    if img is not None and desc.strip():
        h_match = evaluate_hybrid_match(text=desc, image=img, yolo_result=visual_result)
        hybrid_status = h_match["status"]
        hybrid_reasons = h_match["mismatch_reasons"]
        hybrid_val_status = h_match["validation_status"]
        is_valid = h_match["is_valid"]
        validation_reason = h_match["reason"]
        image_evid = h_match.get("image_evidence", "")
        desc_evid = h_match.get("description_evidence", "")

    upstream_evidence = None
    if visual_result and visual_result.get("detections") and not visual_result.get("is_non_civic"):
        upstream_evidence = {
            "primary_class": visual_result["primary_class"],
            "primary_confidence": visual_result["primary_confidence"]
        }

    # If Congruently Matched, integrate visual corroboration into category
    if is_valid and upstream_evidence:
        cat_result = classify_complaint(desc, upstream_visual_evidence=upstream_evidence)
        category = cat_result["municipal_department"]
        confidence = cat_result["confidence"]
    else:
        cat_result = pure_text_result
        category = pure_text_result["municipal_department"]
        confidence = pure_text_result["confidence"]

    # 4. Multi-Factor Priority Risk Scoring (Module 3)
    complaint_dict = {
        "description": desc,
        "pincode": req.pincode,
        "lat": req.lat,
        "lng": req.lng,
        "category": cat_result["predicted_category"]
    }
    pri_result = assign_complaint_priority(
        complaint_input=complaint_dict,
        category_result=cat_result,
        upstream_visual_evidence=upstream_evidence if is_valid else None
    )
    priority = pri_result["priority_level"]
    priority_reasons = " ".join(pri_result["priority_reasons"])

    # Enforce deterministic states on invalid submissions
    if not is_valid:
        if hybrid_val_status in ["DETECTED_BUT_MISMATCHED", "IMAGE_DESCRIPTION_MISMATCH"]:
            # Display detected visual category so citizen sees what photo showed, but with low confidence & warning
            category = visual_result["primary_category"] if visual_result and visual_result.get("primary_category") else pure_text_result["municipal_department"]
            confidence = 0.35
            priority = "MEDIUM"
            pri_result["risk_score"] = 40
            priority_reasons = validation_reason
        elif hybrid_val_status in ["INVALID_IMAGE", "NON_CIVIC_IMAGE", "IMAGE_MISSING_CIVIC_DEFECT"]:
            category = "Other / Non-Civic Issue"
            confidence = 0.10
            priority = "LOW"
            pri_result["risk_score"] = 0
            priority_reasons = validation_reason

    # 5. Entity & Hazard Extraction
    extracted = {
        "detected_language": cat_result["supporting_evidence"]["detected_language"],
        "matched_keywords": cat_result["supporting_evidence"]["matched_keywords"],
        "risk_score": pri_result["risk_score"],
        "recommended_sla_hours": pri_result["recommended_sla_hours"],
        "hybrid_match_status": hybrid_status,
        "validation_status": hybrid_val_status
    }
    if visual_result and visual_result.get("detections"):
        extracted["detected_hazards"] = [d["hazard"] for d in visual_result["detections"]]
        extracted["vision_classes"] = [d["class_name"] for d in visual_result["detections"]]
        extracted["detection_count"] = visual_result["count"]

    if not is_valid:
        is_flagged = True
        flag_reason = validation_reason
    else:
        is_flagged = visual_result.get("is_flagged", False) if visual_result else cat_result["requires_manual_review"]
        flag_reason = visual_result.get("flag_reason") if visual_result else ("Requires manual review due to ambiguous or uninformative input" if is_flagged else None)

    return {
        # Module 2 Canonical Category Output
        "category": category,
        "primary_category": category,
        "confidence": float(confidence),
        "image_evidence": image_evid,
        "description_evidence": desc_evid,
        "model_identifier": model_name,
        "validation_status": hybrid_val_status,
        "is_valid": is_valid,
        "validation_reason": validation_reason,

        # Module 3 Priority Output
        "priority": priority,
        "priority_confidence": pri_result.get("confidence", 0.90),
        "priority_reason": priority_reasons,
        "risk_score": pri_result["risk_score"],
        "contributing_factors": pri_result.get("contributing_factors", {}),
        "risk_factors": pri_result.get("risk_factors", {}),
        "safety_override_triggered": pri_result.get("safety_override_triggered"),
        "safety_override_status": pri_result.get("safety_override_status", "None"),
        "priority_reasons_list": pri_result.get("priority_reasons", []),
        "recommended_sla_hours": pri_result["recommended_sla_hours"],

        # Details
        "extracted_data": extracted,
        "duplicate_candidates": [],
        "detections": visual_result["detections"] if visual_result else [],
        "hybrid_match": {
            "status": hybrid_status,
            "validation_status": hybrid_val_status,
            "is_valid": is_valid,
            "reason": validation_reason,
            "reasons": hybrid_reasons
        },
        "is_flagged": is_flagged,
        "flag_reason": flag_reason,
        "annotated_image": visual_result.get("annotated_image") if visual_result else None,
        "category_source": cat_result["classification_method"],
        "model_version": model_name
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
