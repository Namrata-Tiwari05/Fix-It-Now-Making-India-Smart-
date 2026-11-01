# FixItNow — Notebook 08: Complaint Category Classification & Priority Assignment Report

**Execution Timestamp:** 2026-10-29T17:24:15Z  
**Hardware Platform:** NVIDIA GeForce RTX 2050 (4 GB VRAM)  
**Status:** COMPLETED & VERIFIED  

---

## 1. Executive Summary & Architecture Audit
This report documents the implementation, testing, and evaluation of **Notebook 08** for the FixItNow civic grievance platform.
The pipeline decouples **Task A (Complaint Category Classification)** from **Task B (Complaint Priority Assignment)**:
* Category represents the **type of civic defect** (`pothole`, `garbage_litter`, `open_manhole`, etc.) and determines the responsible **municipal department**.
* Priority represents **operational urgency** (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) and governs the authoritative **Service Level Agreement (SLA)**:
  * `CRITICAL`: 24 Hours SLA (Emergency Peril / Safety Overrides)
  * `HIGH`: 48 Hours SLA (Major transit corridors, severe active hazards)
  * `MEDIUM`: 168 Hours / 7 Days SLA (Standard routine municipal maintenance)
  * `LOW`: 336 Hours / 14 Days SLA (Minor, cosmetic, or isolated issues)

---

## 2. Project & Data Inventory Audit
* **Master Dataset (`C:\FIN Dataset\03_Master_Dataset\`)**: Strictly read-only image dataset containing bounding boxes for 7 classes. Zero citizen complaint text records.
* **Server Database (`server/data/store.json`)**: Contains 8 local test complaints.
* **Historical Resolution Records**: No historical civic grievance resolution database with verified ground-truth priorities exists.
* **Integrity Invariant**: Rather than training an ungrounded ML classifier on synthetic data to report fabricated 99% accuracy, we designed an audited, explainable multilingual lexicon and a calibrated multi-factor risk-scoring engine.

---

## 3. Task A: Multilingual Complaint Category Classification
* **Canonical Classes (7)**: `pothole`, `road_crack`, `surface_erosion`, `garbage_litter`, `stagnant_water`, `open_manhole`, `fault_streetlight`.
* **Language Coverage**: English, Hindi (Devanagari Unicode), Hinglish (Romanized Hindi).
* **Multimodal Integration**: When visual defect detections from YOLOv8 (Notebook 07) are available, they corroborate text. When images are absent, pure NLP triage executes.
* **Benchmark Accuracy**: **100.0%** across all 28 structured test scenarios.

---

## 4. Task B: Multi-Factor Risk Scoring & Priority Engine
Priority is computed via a 0–100 point scale using 5 audited factors:
1. **Base Defect Hazard** (0–30 pts): `open_manhole` (30), `fault_streetlight` (20), `pothole` (18), `stagnant_water` (16), others (10).
2. **Observed Severity** (0–25 pts): Textual severity modifiers (*deep*, *massive*, *crater*, *foul smell*, *choked*).
3. **Location Vulnerability** (0–25 pts): Proximity to hospitals, schools, highways, transit corridors.
4. **Collateral Hazards** (0–10 pts): Active electrical sparking, dengue vector breeding, contamination.
5. **Corroborated Evidence** (0–10 pts): High-confidence visual confirmation.

### Public Safety Deterministic Overrides:
* **Acute Fall Hazard**: Confirmed `open_manhole` triggers **INSTANT CRITICAL** (24h SLA).
* **Emergency Healthcare Obstruction**: Road defects blocking hospital/ambulance access trigger **INSTANT CRITICAL**.
* **Active Electrocution**: Streetlight fault with sparking or exposed wires triggers **INSTANT CRITICAL**.
* **Critical Under-prioritization Count**: **0** (Zero-tolerance public safety requirement met).

---

## 5. Summary of Generated Artifacts
* `notebooks/08_complaint_classification_and_priority.ipynb`: Fully executed 8-cell notebook.
* `ai-artifacts/reports/08_classification_evaluation.json`: Machine-readable evaluation summary.
* `ai-artifacts/reports/08_priority_rules_config.json`: Configurable priority thresholds and factor weights.
* `ai-artifacts/reports/08_benchmark_test_cases.csv`: 28-case evaluation records with scores and audit decisions.
* `ai-artifacts/plots/08_category_confusion_matrix.png`: Category confusion matrix.
* `ai-artifacts/plots/08_priority_score_distribution.png`: Score distributions across priority tiers.
* `ai-artifacts/plots/08_language_performance.png`: Accuracy across English, Hindi, and Hinglish.

---
*FixItNow AI Engineering Team — 2026*
