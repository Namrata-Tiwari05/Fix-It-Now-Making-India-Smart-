"""
Comprehensive Unit & Integration Test Suite for FixItNow FastAPI AI Microservice
Tests all modules: YOLOv8 defect detection, Multilingual NLP classifier (EN, HI, Hinglish),
Priority risk-scoring & safety overrides, Hybrid context matching, Duplicate screening,
and Advisory Before/After repair verification.
"""

import sys
import io
import json
from pathlib import Path
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "ai-service"))

# Ensure UTF-8 output
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient
import app.main as app_main

client = TestClient(app_main.app)

passed = 0
failed = 0

def test(name, condition, details=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"[PASS] {name} {details}")
    else:
        failed += 1
        print(f"[FAIL] {name} {details}")

def run_tests():
    global passed, failed
    print("=================================================================")
    print("🧪 FASTAPI AI MICROSERVICE SUITE (ALL MODULES & ENDPOINTS)")
    print("=================================================================\n")

    # 1. Health & Root Check
    res = client.get("/")
    test("1. GET / Root health", res.status_code == 200 and res.json()["status"] == "online", f"model: {res.json().get('active_model')}")

    # 2. Multilingual Classification (English, Hindi, Hinglish)
    res_en = client.post("/api/classify", json={"text": "Deep road pothole on main street causing vehicle damage"})
    data_en = res_en.json()
    test("2a. Multilingual Classify (English)", res_en.status_code == 200 and data_en["predicted_category"] == "pothole", f"dept: {data_en.get('municipal_department')}")

    res_hi = client.post("/api/classify", json={"text": "सड़क पर कचरा और कूड़ेदान का ढेर लगा हुआ है"})
    data_hi = res_hi.json()
    test("2b. Multilingual Classify (Hindi)", res_hi.status_code == 200 and data_hi["predicted_category"] == "garbage_litter", f"lang: {data_hi['supporting_evidence']['detected_language']}")

    res_hinglish = client.post("/api/classify", json={"text": "Street light pole kharab hai aur raat ko andhera rehta hai"})
    data_hinglish = res_hinglish.json()
    test("2c. Multilingual Classify (Hinglish)", res_hinglish.status_code == 200 and data_hinglish["predicted_category"] == "fault_streetlight", f"dept: {data_hinglish.get('municipal_department')}")

    # 2d. Negation handling
    res_neg = client.post("/api/classify", json={"text": "Road is clean now not a pothole anymore"})
    data_neg = res_neg.json()
    test("2d. Multilingual Classify (Negation)", res_neg.status_code == 200 and data_neg["supporting_evidence"]["is_negated"] is True)

    # 3. Priority Risk Scoring Engine
    res_pri = client.post("/api/priority", json={
        "description": "Deep open manhole near hospital road causing fatal fall risk",
        "category": "open_manhole",
        "landmark": "Near district hospital"
    })
    data_pri = res_pri.json()
    test("3a. Priority Engine (Critical Override)", res_pri.status_code == 200 and data_pri["priority_level"] == "CRITICAL" and data_pri["risk_score"] >= 80, f"score: {data_pri.get('risk_score')}")

    res_pri_low = client.post("/api/priority", json={
        "description": "Small hairline road crack in quiet colony lane",
        "category": "road_crack",
        "landmark": "Dead end alley"
    })
    data_pri_low = res_pri_low.json()
    test("3b. Priority Engine (Low/Medium Risk)", res_pri_low.status_code == 200 and data_pri_low["priority_level"] in ["LOW", "MEDIUM"], f"priority: {data_pri_low.get('priority_level')}")

    # 4. YOLOv8 Detection on real sample image
    test_img_path = PROJECT_ROOT / "uploads" / "complaints" / "evidence-1793281807651-463314646.jpg"
    if test_img_path.exists():
        with open(test_img_path, "rb") as f:
            res_det = client.post("/api/detect", files={"file": ("test.jpg", f, "image/jpeg")})
        data_det = res_det.json()
        test("4a. YOLO Detection (Real Image)", res_det.status_code == 200 and data_det["count"] > 0, f"count: {data_det.get('count')}, class: {data_det.get('primary_class')}")
    else:
        test("4a. YOLO Detection (Image Skip)", True, "File not present on path")

    # 4b. Invalid image error handling
    res_bad_img = client.post("/api/detect", files={"file": ("bad.bin", b"not-image", "application/octet-stream")})
    test("4b. Detection Error Handling (Bad Image)", res_bad_img.status_code == 400)

    # 5. Hybrid Match
    if test_img_path.exists():
        res_hm_match = client.post("/api/hybrid-match", json={
            "text": "Garbage dump and trash litter scattered along road",
            "image_path": str(test_img_path)
        })
        data_hm_match = res_hm_match.json()
        test("5a. Hybrid Match (Corroborated)", res_hm_match.status_code == 200 and data_hm_match["status"] == "MATCH", f"status: {data_hm_match.get('status')}")

        res_hm_mismatch = client.post("/api/hybrid-match", json={
            "text": "Street light lamp is broken and dark causing accidents",
            "image_path": str(test_img_path)
        })
        data_hm_mismatch = res_hm_mismatch.json()
        test("5b. Hybrid Match (Contradiction/Mismatch)", res_hm_mismatch.status_code == 200 and data_hm_mismatch["status"] in ["MISMATCH", "AMBIGUOUS"], f"status: {data_hm_mismatch.get('status')}")

    # 6. Duplicate Check
    res_dup = client.post("/api/duplicates/check", json={
        "new_complaint": {
            "id": "new-1",
            "description": "Deep dangerous pothole on highway road near petrol pump",
            "pincode": "273001",
            "lat": 26.7588,
            "lng": 83.3732
        },
        "candidates": [
            {
                "id": "cand-1",
                "complaint_number": "CMP-101",
                "description": "Deep road crater and pothole near petrol pump highway",
                "pincode": "273001",
                "lat": 26.7589,
                "lng": 83.3732,
                "status": "IN_PROGRESS"
            },
            {
                "id": "cand-2",
                "complaint_number": "CMP-102",
                "description": "Street light not glowing in colony park",
                "pincode": "273001",
                "lat": 26.7900,
                "lng": 83.3732,
                "status": "SUBMITTED"
            }
        ]
    })
    data_dup = res_dup.json()
    test("6. Duplicate Screening Check", res_dup.status_code == 200 and len(data_dup["duplicate_candidates"]) == 2, f"top candidate decision: {data_dup['duplicate_candidates'][0]['decision']}")

    # 7. Advisory Before/After Repair Verification
    if test_img_path.exists():
        res_rv_fraud = client.post("/api/verify-repair", json={
            "before_image_path": str(test_img_path),
            "after_image_path": str(test_img_path),
            "target_class": "garbage_litter",
            "before_metadata": {"created_at": "2026-10-26T10:00:00Z"},
            "after_metadata": {"created_at": "2026-10-27T10:00:00Z"}
        })
        data_rv_fraud = res_rv_fraud.json()
        test("7a. Repair Verification (Fraud Identical Photo)", res_rv_fraud.status_code == 200 and data_rv_fraud["decision"] == "NOT_RESOLVED", f"decision: {data_rv_fraud.get('decision')}")

        res_rv_missing = client.post("/api/verify-repair", json={
            "before_image_path": str(test_img_path),
            "after_image_path": None
        })
        data_rv_missing = res_rv_missing.json()
        test("7b. Repair Verification (Missing After Image)", res_rv_missing.status_code == 200 and data_rv_missing["decision"] == "INCONCLUSIVE", f"decision: {data_rv_missing.get('decision')}")

    # 8. Unified Triage Endpoint
    res_triage = client.post("/api/triage", json={
        "description": "सड़क पर खुला हुआ मैनहोल है बच्चे गिर सकते हैं",
        "pincode": "273001",
        "lat": 26.7588,
        "lng": 83.3732
    })
    data_triage = res_triage.json()
    test("8. Unified Triage (Hindi Critical)", res_triage.status_code == 200 and data_triage["priority"] == "CRITICAL" and data_triage["category"] == "Drainage & Sewerage", f"category: {data_triage.get('category')}, priority: {data_triage.get('priority')}")

    print(f"\n=================================================================")
    print(f"📊 SUMMARY: Passed: {passed} | Failed: {failed}")
    print(f"=================================================================")
    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()

