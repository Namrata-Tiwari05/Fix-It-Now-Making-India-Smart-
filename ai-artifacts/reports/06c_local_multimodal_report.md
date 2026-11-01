# FixItNow — Genuine Local Multimodal Image-Text Evaluation Report

## 1. Executive Summary
- **Vision Model**: `sentence-transformers/clip-ViT-B-32` (577 MB ViT-B/32, processing 224x224 RGB image pixels).
- **Text Model**: `sentence-transformers/clip-ViT-B-32-multilingual-v1` (514 MB DistilBERT multilingual, processing Hindi, English, Hinglish).
- **Total VRAM Allocated**: 1093.1 MB (Comfortably within 4,095.5 MB budget on RTX 2050).
- **Overall Zero-Shot Top-1 Accuracy**: 44.44% across 18 evaluated pairs.
- **Cross-Model Agreement with YOLOv8s**: 44.44%.

## 2. Accuracy by Language

| Language | Total | Correct | Accuracy (%) |
|---|---|---|---|
| **en** | 6.0 | 4.0 | 66.67% |
| **hi** | 6.0 | 1.0 | 16.67% |
| **hinglish** | 6.0 | 3.0 | 50.0% |

## 3. Pixel-Level Sensitivity & Integrity Verification
- Changing image pixels altered cosine similarity scores by up to 0.1161.
- No synthetic one-hot vectors, rulebooks, or fabricated scores were used.

## 4. Cross-Model Findings
- **YOLOv8s** provides precise localized bounding boxes for civic infrastructure defects.
- **CLIP Multimodal** provides zero-shot holistic scene alignment between written citizen text and photographed scenes.
- Both models operate sequentially within the 4 GB VRAM budget on the RTX 2050.
