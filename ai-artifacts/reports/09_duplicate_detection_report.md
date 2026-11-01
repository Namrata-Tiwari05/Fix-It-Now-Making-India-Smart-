# FixItNow — Notebook 09: Duplicate Complaint Detection Report

**Execution Timestamp:** 2026-10-29T17:42:50Z  
**Hardware Platform:** NVIDIA GeForce RTX 2050 (4 GB VRAM)  
**Status:** COMPLETED & VERIFIED  

---

## 1. Executive Summary & Incident-Level Duplicate Principles
This report documents the implementation, evaluation, and production inference interface for **Notebook 09: Duplicate Complaint Detection** in FixItNow.
* **Incident-Level Duplication vs Category Match**: In civic management, two reports of potholes 500m apart on the same road are distinct hazards and must never be merged. True duplicates refer to the **exact same physical defect**.
* **Four Operational States**:
  * `DUPLICATE`: Corroborated evidence confirming same physical incident.
  * `POSSIBLE_DUPLICATE`: Moderate similarity or missing location evidence; safely routed for human verification (`requires_manual_review = True`).
  * `NEW_COMPLAINT`: Distinct physical incidents (distance > 150m, distinct defects, or re-occurrence of a resolved ticket).
  * `INSUFFICIENT_EVIDENCE`: Inadequate data to make a reliable decision.

---

## 2. Component Implementation & Multimodal Signals
1. **Component A (Multilingual Text Similarity)**:
   * Composite word-token and character 3-gram Jaccard matching.
   * Handles English, Hindi (Devanagari Unicode), and Hinglish transliterations.
   * Filters common civic stopwords to avoid spurious duplicate triggers.
2. **Component B (Dual Image Similarity)**:
   * **dHash (Difference Hash)**: 64-bit gradient hash measuring Hamming distance (0 to 64). Instantly detects identical, recompressed, or resized copies ($H \le 6$).
   * **Visual Embeddings**: 512-dimensional normalized embeddings extracted via cached `clip-ViT-B-32` for defect appearance comparison.
3. **Component C (Geospatial Matching)**:
   * Haversine great-circle surface distance in meters.
   * Calibrated thresholds: $\le 30$m (same spot), $30-75$m (immediate vicinity), $> 150$m (distant cutoff override).
4. **Component D (Temporal Proximity & Lifecycle)**:
   * Timestamp difference in hours.
   * If existing ticket is `RESOLVED` or `CLOSED` (> 14 days), treated as a re-occurrence/new issue.
5. **Component E (Candidate Retrieval)**:
   * Pincode, geofence, and active ticket filtering to scale retrieval efficiently.

---

## 3. Systematic Benchmark Evaluation Results (N = 14 Scenarios)
* **Overall Decision Concordance**: **78.6%** (11/14)
* **False Duplicate Merge Count**: **0** (Zero-tolerance public safety requirement met)
* **Manual Review Routing Rate**: **42.9%** (6/14)
* **Decisions Distribution**:
  * `NEW_COMPLAINT`: 5
  * `POSSIBLE_DUPLICATE`: 4
  * `DUPLICATE`: 4
  * `INSUFFICIENT_EVIDENCE`: 1

---

## 4. Summary of Generated Artifacts
* `notebooks/09_duplicate_complaint_detection.ipynb`: Fully executed 10-cell notebook.
* `ai-artifacts/reports/09_duplicate_detection_evaluation.json`: Machine-readable evaluation summary.
* `ai-artifacts/reports/09_duplicate_detection_config.json`: Configurable threshold settings.
* `ai-artifacts/reports/09_duplicate_detection_test_cases.csv`: 14-scenario evaluation records.
* `ai-artifacts/plots/09_decision_breakdown.png`: Decision state distribution.
* `ai-artifacts/plots/09_distance_vs_similarity_scatter.png`: Geographic distance vs text similarity scatter plot.
* `ai-artifacts/plots/09_similarity_distributions.png`: Observed similarity score boxplots.

---
*FixItNow AI Engineering Team — 2026*
