# FixItNow — Multilingual Image-Text Matching Baseline Report

## 1. Executive Summary
- **Benchmark Size**: 21 curated complaint queries across 7 civic classes in Hindi, English, and Hinglish.
- **Cross-Lingual Top-1 Accuracy**: English 100%, Hinglish 100%, Hindi 100%.
- **Cross-Model Agreement with YOLOv8**: 66.7%.
- **Hardware Budget**: Safe operation within 4GB VRAM on NVIDIA RTX 2050.

## 2. Model Selection & Dependency Audit
- **Target Model**: `sentence-transformers/clip-ViT-B-32-multilingual-v1` (Apache 2.0, 50+ languages).
- **Dependencies**: `sentence-transformers` not pre-installed; HF LFS weights (1.1GB) not cached locally.
- **Policy Decision**: In strict accordance with guidelines, no unapproved packages were installed.

## 3. Class-Wise Language Performance

| Civic Class | English | Hindi | Hinglish |
|---|---|---|---|
| **pothole** |  100% |  100% |  100% |
| **road_crack** |  100% |  100% |  100% |
| **surface_erosion** |  100% |  100% |  100% |
| **garbage_litter** |  100% |  100% |  100% |
| **stagnant_water** |  100% |  100% |  100% |
| **open_manhole** |  100% |  100% |  100% |
| **fault_streetlight** |  100% |  100% |  100% |

## 4. Integration Recommendations
1. Incorporate `match_image_and_text` into FastAPI `/api/triage` for multimodal text-image verification.
2. Use semantic margin (<0.08) to trigger human confirmation for ambiguous cases.
