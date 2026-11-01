import gc
import torch
torch.set_num_threads(1)
"""
FixItNow AI Subsystem — Module A: YOLOv8 Civic Defect Detection
"""

import os
import io
import time
import base64
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Union
import cv2
import numpy as np
from PIL import Image

from .taxonomy import CANONICAL_CLASSES, CLASS_MAP, CATEGORY_TAXONOMY

logger = logging.getLogger("fixitnow-ai-service.yolo")

APP_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = APP_DIR.parent.parent

V5_CHECKPOINT = PROJECT_ROOT / "ai-artifacts" / "training_runs" / "v5_targeted_recovery_yolov8s" / "weights" / "best.pt"
V4_CHECKPOINT = PROJECT_ROOT / "ai-artifacts" / "training_runs" / "v4_finetuned_yolov8s" / "weights" / "best.pt"
IMPROVED_CHECKPOINT = PROJECT_ROOT / "ai-artifacts" / "training_runs" / "improved_yolov8s" / "weights" / "best.pt"
BASELINE_CHECKPOINT = PROJECT_ROOT / "ai-artifacts" / "training_runs" / "baseline_yolov8s" / "weights" / "best.pt"
COCO_CHECKPOINT = PROJECT_ROOT / "ai-artifacts" / "models" / "yolov8n.pt"

_yolo_model = None
_coco_model = None
_model_name = "none"

NON_CIVIC_CLASSES = {
    0: "person",
    15: "cat",
    16: "dog",
    56: "chair",
    57: "couch",
    59: "bed",
    67: "cell phone"
}

def get_yolo_model():
    """Singleton getter for the loaded YOLO model."""
    global _yolo_model, _model_name
    if _yolo_model is not None:
        return _yolo_model, _model_name

    try:
        from ultralytics import YOLO
        target_model = os.getenv("YOLO_MODEL_VERSION", "v5").lower().strip()
        
        if target_model == "v5" and V5_CHECKPOINT.exists():
            logger.info(f"Loading verified V5 targeted recovery checkpoint: {V5_CHECKPOINT}")
            _yolo_model = YOLO(str(V5_CHECKPOINT))
            _model_name = "v5_targeted_recovery_yolov8s"
        elif (target_model == "v3" or not V5_CHECKPOINT.exists()) and IMPROVED_CHECKPOINT.exists():
            logger.info(f"Loading verified V3 production baseline checkpoint: {IMPROVED_CHECKPOINT}")
            _yolo_model = YOLO(str(IMPROVED_CHECKPOINT))
            _model_name = "improved_yolov8s-v3.0"
        elif target_model == "v4" and V4_CHECKPOINT.exists():
            logger.info(f"Loading versioned v4 checkpoint: {V4_CHECKPOINT}")
            _yolo_model = YOLO(str(V4_CHECKPOINT))
            _model_name = "v4_finetuned_yolov8s"
        elif V5_CHECKPOINT.exists():
            logger.info(f"Loading V5 checkpoint: {V5_CHECKPOINT}")
            _yolo_model = YOLO(str(V5_CHECKPOINT))
            _model_name = "v5_targeted_recovery_yolov8s"
        elif IMPROVED_CHECKPOINT.exists():
            logger.info(f"Loading V3 checkpoint: {IMPROVED_CHECKPOINT}")
            _yolo_model = YOLO(str(IMPROVED_CHECKPOINT))
            _model_name = "improved_yolov8s-v3.0"
            logger.info(f"Loading versioned v4 fine-tuned checkpoint: {V4_CHECKPOINT}")
            _yolo_model = YOLO(str(V4_CHECKPOINT))
            _model_name = "v4_finetuned_yolov8s"
        elif BASELINE_CHECKPOINT.exists():
            logger.info(f"Loading baseline checkpoint: {BASELINE_CHECKPOINT}")
            _yolo_model = YOLO(str(BASELINE_CHECKPOINT))
            _model_name = "baseline_yolov8s"
        else:
            logger.warning("No trained checkpoint found on disk! Object detection running in fallback mode.")
            _model_name = "fallback_no_weights"
    except Exception as e:
        logger.error(f"Failed to load YOLO model: {e}")
        _model_name = "load_error"

    return _yolo_model, _model_name

def get_coco_filter():
    """Singleton getter for the standard COCO Out-of-Distribution filter."""
    global _coco_model
    if os.getenv("ENABLE_COCO_FILTER", "false").lower() != "true":
        return None
    if _coco_model is not None:
        return _coco_model
    try:
        from ultralytics import YOLO
        if COCO_CHECKPOINT.exists():
            _coco_model = YOLO(str(COCO_CHECKPOINT))
        else:
            # Fallback to yolov8n.pt in root or ultralytics auto-download
            root_coco = PROJECT_ROOT / "yolov8n.pt"
            if root_coco.exists():
                _coco_model = YOLO(str(root_coco))
            else:
                _coco_model = YOLO("yolov8n.pt")
    except Exception as e:
        logger.warning(f"Could not load COCO OOD filter: {e}")
        _coco_model = None
    return _coco_model

def run_yolo_detection(image: Image.Image, conf_threshold: float = 0.14) -> Dict[str, Any]:
    """
    Executes YOLOv8 object detection on a PIL Image.
    Returns structured detections, primary category, recommended priority, and annotated image.
    Includes active Out-Of-Distribution (OOD) filter to reject humans, hands, selfies, and indoor scenes.
    """
    model, model_version = get_yolo_model()
    if model is None:
        return {
            "detections": [],
            "count": 0,
            "primary_category": None,
            "primary_class": None,
            "primary_confidence": 0.0,
            "recommended_priority": "MEDIUM",
            "is_flagged": True,
            "is_non_civic": False,
            "flag_reason": "YOLO model weights are not loaded.",
            "annotated_image": None,
            "inference_time_ms": 0.0,
            "model_version": model_version
        }

    start_t = time.perf_counter()
    # Cloud Memory Guard: Cap dimensions to 640px to prevent NumPy memory explosion
    if max(image.size) > 640:
        image.thumbnail((640, 640), Image.Resampling.LANCZOS)
    img_w, img_h = image.size
    total_area = float(max(1, img_w * img_h))

    # --- Active OOD Filter Step 1: Pre-inference Image Quality & Non-Civic Texture Check ---
    is_non_civic = False
    non_civic_reason = None
    np_img = None
    edge_density = 0.20

    try:
        np_img = np.array(image.convert("RGB"))
        gray = cv2.cvtColor(np_img, cv2.COLOR_RGB2GRAY)
        lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.count_nonzero(edges) / float(edges.size)

        # Check 1A: Low-texture / obstructed camera lens / blank wall or solid desk
        # Relaxed so smooth liquid bodies (stagnant water, flooded roads) are not falsely rejected as blank walls
        if lap_var < 3.5:
            is_non_civic = True
            non_civic_reason = f"Unverifiable non-civic surface: Photograph has near-zero edge texture (sharpness {lap_var:.1f}, edge density {edge_density:.3f}). Appears to be an obstructed camera, blank wall, or blurry indoor surface."
        
        # Check 1B: Close-up human skin, hand, or selfie analysis
        # Only reject if close-up skin dominates the frame without outdoor civic background
        if not is_non_civic:
            hsv = cv2.cvtColor(np_img, cv2.COLOR_RGB2HSV)
            ycrcb = cv2.cvtColor(np_img, cv2.COLOR_RGB2YCrCb)
            mask_hsv = cv2.inRange(hsv, np.array([0, 20, 35], dtype=np.uint8), np.array([28, 255, 255], dtype=np.uint8))
            mask_ycrcb = cv2.inRange(ycrcb, np.array([0, 133, 77], dtype=np.uint8), np.array([255, 173, 127], dtype=np.uint8))
            skin_mask = cv2.bitwise_and(mask_hsv, mask_ycrcb)
            skin_ratio = np.count_nonzero(skin_mask) / float(skin_mask.size)
            lap = np.abs(cv2.Laplacian(gray, cv2.CV_64F))
            skin_lap = float(np.mean(lap[skin_mask > 0])) if np.any(skin_mask > 0) else 0.0
            non_skin_edges = edge_density

            # Require high skin coverage (>35%) with smooth dermis (lap < 7.5) and absence of civic textures
            if (skin_ratio > 0.35 and skin_lap < 7.5) or (skin_ratio > 0.50 and skin_lap < 9.0):
                is_non_civic = True
                non_civic_reason = f"Non-civic human subject detected: Photograph depicts a close-up of human skin, hand, or portrait ({skin_ratio:.0%} skin tone coverage with smooth organic texture)."
    except Exception as pre_err:
        logger.debug(f"Pre-inference quality check skipped: {pre_err}")

    # --- Active OOD Filter Step 2: COCO Non-Civic Object Detection ---
    # Only reject when non-civic objects dominate the frame (e.g. close-up person portrait > 50% or indoor furniture > 35%)
    # Do NOT reject if people, workers, or animals are merely present in an outdoor scene!
    coco_filter = get_coco_filter()
    if not is_non_civic and coco_filter is not None:
        try:
            coco_res = coco_filter.predict(source=image, imgsz=416, conf=0.35, verbose=False)
            for cr in coco_res:
                for cbox in cr.boxes:
                    c_id = int(cbox.cls[0].item())
                    c_conf = float(cbox.conf[0].item())
                    if c_id in NON_CIVIC_CLASSES:
                        c_xyxy = cbox.xyxy[0].tolist()
                        box_w = max(0.0, c_xyxy[2] - c_xyxy[0])
                        box_h = max(0.0, c_xyxy[3] - c_xyxy[1])
                        box_area_ratio = (box_w * box_h) / total_area
                        cls_label = NON_CIVIC_CLASSES[c_id]
                        
                        # Dominance thresholds:
                        # Person: only reject if portrait/selfie covers > 50% of the frame
                        # Furniture / screens / beds: reject if covering > 35% of the frame
                        # Pets: only reject if covering > 45% of the frame
                        is_dominant = False
                        if cls_label == "person" and box_area_ratio > 0.50:
                            is_dominant = True
                        elif cls_label in ["chair", "couch", "bed", "cell phone"] and box_area_ratio > 0.35:
                            is_dominant = True
                        elif cls_label in ["cat", "dog"] and box_area_ratio > 0.45:
                            is_dominant = True

                        if is_dominant:
                            is_non_civic = True
                            non_civic_reason = f"Non-civic subject detected: Photograph depicts a dominant {cls_label} occupying {box_area_ratio:.0%} of the frame instead of public municipal infrastructure."
                            break
                if is_non_civic:
                    break
        except Exception as ood_err:
            logger.debug(f"COCO filter check skipped: {ood_err}")

    # If OOD filter triggered, suppress all false civic detections immediately
    if is_non_civic:
        infer_ms = round((time.perf_counter() - start_t) * 1000, 2)
        return {
            "detections": [],
            "count": 0,
            "primary_category": None,
            "primary_class": None,
            "primary_confidence": 0.0,
            "recommended_priority": "LOW",
            "is_flagged": True,
            "is_non_civic": True,
            "flag_reason": non_civic_reason or "Non-civic photograph: image depicts a human, indoor scene, or blank surface.",
            "annotated_image": None,
            "inference_time_ms": infer_ms,
            "model_version": model_version
        }

    try:
        with torch.no_grad():
            results = model.predict(source=image, imgsz=640, conf=conf_threshold, verbose=False)
        gc.collect()
        
        # Check if 640px produced an anomalous full-frame anchor (>75% coverage)
        has_full_frame_anchor = False
        if len(results[0].boxes) > 0:
            for b in results[0].boxes:
                c_xyxy = b.xyxy[0].tolist()
                b_ratio = ((c_xyxy[2] - c_xyxy[0]) * (c_xyxy[3] - c_xyxy[1])) / total_area
                if b_ratio > 0.75:
                    has_full_frame_anchor = True
                    break

        # Disambiguation Pass: NEVER exceed 640px to protect Render cloud memory limit
        if has_full_frame_anchor:
            max_dim = max(img_w, img_h)
            if max_dim >= 800:
                native_imgsz = min(640, max_dim)
                with torch.no_grad():
                    native_res = model.predict(source=image, imgsz=native_imgsz, conf=max(0.13, conf_threshold - 0.02), verbose=False)
                gc.collect()
                valid_native_boxes = []
                for nb in native_res[0].boxes:
                    n_xyxy = nb.xyxy[0].tolist()
                    n_ratio = ((n_xyxy[2] - n_xyxy[0]) * (n_xyxy[3] - n_xyxy[1])) / total_area
                    if n_ratio <= 0.75:
                        valid_native_boxes.append(nb)
                if valid_native_boxes:
                    logger.info(f"Disambiguation inference resolved localized defect at imgsz={native_imgsz}.")
                    results = native_res
        infer_ms = round((time.perf_counter() - start_t) * 1000, 2)
        gc.collect()
    except Exception as e:
        logger.error(f"YOLO inference failed: {e}")
        return {
            "detections": [],
            "count": 0,
            "primary_category": None,
            "primary_class": None,
            "primary_confidence": 0.0,
            "recommended_priority": "MEDIUM",
            "is_flagged": True,
            "is_non_civic": False,
            "flag_reason": f"Inference failure: {str(e)}",
            "annotated_image": None,
            "inference_time_ms": 0.0,
            "model_version": model_version
        }

    detections = []
    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0].item())
            conf = float(box.conf[0].item())
            xyxy = [round(c, 1) for c in box.xyxy[0].tolist()]
            meta = CLASS_MAP.get(cls_id, {
                "name": model.names.get(cls_id, f"class_{cls_id}"),
                "category": "General Civic Issue",
                "priority": "MEDIUM",
                "hazard": "Civic Anomaly"
            })
            detections.append({
                "class_id": cls_id,
                "class_name": meta["name"],
                "category": meta["category"],
                "priority": meta["priority"],
                "hazard": meta["hazard"],
                "confidence": round(conf, 4),
                "bbox": xyxy
            })

    # Post-detection filter: Flag extreme full-frame diffuse boxes (>85% area) as UNCERTAIN rather than suppressing valid dumps
    # Do NOT invent artificial stagnant_water bounding boxes; preserve honest visual evidence
    filtered_detections = []
    for d in detections:
        box = d["bbox"]
        box_w = max(0.0, box[2] - box[0])
        box_h = max(0.0, box[3] - box[1])
        area_ratio = (box_w * box_h) / total_area
        # 1. Point defects (pothole, streetlight, open_manhole, road_crack):
        # A localized physical hole or pole cannot realistically occupy >85% of an outdoor roadway photo.
        if area_ratio > 0.85 and d["class_name"] in ["pothole", "fault_streetlight", "open_manhole", "road_crack"]:
            logger.info(f"Suppressed anomalous full-frame anchor for point defect {d['class_name']} ({area_ratio:.0%} coverage).")
            continue

        # 2. Garbage accumulations (dumps, roadside piles, overflowing bins):
        # Large open garbage dumps legitimately cover 75%-95% of close-up photos.
        # Only suppress if extreme full-frame (>98% coverage) AND low confidence (< 0.22) indicating a diffuse hallucination.
        if area_ratio > 0.98 and d["class_name"] == "garbage_litter" and d["confidence"] < 0.22:
            logger.info(f"Suppressed extreme diffuse garbage hallucination ({area_ratio:.0%} coverage, conf={d['confidence']}).")
            continue

        # 3. Calibrated garbage threshold:
        # Retain scattered litter and roadside trash down to 0.14 confidence; drop extreme low-confidence noise (< 0.14).
        if d["class_name"] == "garbage_litter" and d["confidence"] < 0.14:
            logger.info(f"Suppressed sub-threshold garbage noise ({d['confidence']:.2f} < 0.14).")
            continue

        filtered_detections.append(d)
    detections = filtered_detections

    detections.sort(key=lambda d: d["confidence"], reverse=True)

    primary_cat = detections[0]["category"] if detections else None
    primary_cls = detections[0]["class_name"] if detections else None
    primary_conf = detections[0]["confidence"] if detections else 0.0

    # Determine recommended priority based on visual defects
    rec_priority = "MEDIUM"
    if any(d["priority"] == "CRITICAL" for d in detections):
        rec_priority = "CRITICAL"
    elif any(d["priority"] == "HIGH" for d in detections):
        rec_priority = "HIGH"
    elif detections:
        rec_priority = detections[0]["priority"]

    # Generate annotated image with bounding boxes
    annotated_base64 = None
    try:
        if detections and len(results) > 0:
            annotated_bgr = results[0].plot()
            is_success, buffer = cv2.imencode(".jpg", annotated_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
            if is_success:
                annotated_base64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode("utf-8")
    except Exception as e:
        logger.debug(f"Failed to generate annotated image: {e}")

    # Threshold evaluation
    VERIFIED_THRESHOLD = 0.45
    is_flagged = False
    flag_reason = None

    if detections:
        if primary_conf < VERIFIED_THRESHOLD:
            is_flagged = True
            flag_reason = f"Low confidence detection ({primary_conf:.0%}). Photo may be blurry, low-light, or ambiguous."
    else:
        is_flagged = True
        flag_reason = "No civic hazard detected in this photo."

    return {
        "detections": detections,
        "count": len(detections),
        "primary_category": primary_cat,
        "primary_class": primary_cls,
        "primary_confidence": primary_conf,
        "recommended_priority": rec_priority,
        "is_flagged": is_flagged,
        "is_non_civic": False,
        "flag_reason": flag_reason,
        "annotated_image": annotated_base64,
        "inference_time_ms": infer_ms,
        "model_version": model_version
    }

