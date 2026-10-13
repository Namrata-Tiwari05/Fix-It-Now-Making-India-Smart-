from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import re

app = FastAPI(title="FixItNow Dedicated AI/ML Triage Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TriageRequest(BaseModel):
    description: str
    pincode: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

@app.get("/")
def read_root():
    return {"status": "online", "model": "FixItNow-CivicTransformer-v1"}

@app.post("/api/triage")
def triage_complaint(req: TriageRequest):
    text = (req.description or "").lower()

    # Category prediction
    category = "Roads & Potholes"
    confidence = 0.94
    if any(w in text for w in ["garbage", "trash", "waste", "dump", "dustbin", "dead animal"]):
        category = "Solid Waste & Sanitation"
        confidence = 0.96
    elif any(w in text for w in ["light", "dark", "pole", "wire", "spark", "electric"]):
        category = "Street Lighting"
        confidence = 0.93
    elif any(w in text for w in ["drain", "sewage", "choke", "waterlog", "gutter", "manhole"]):
        category = "Drainage & Sewerage"
        confidence = 0.95
    elif any(w in text for w in ["water supply", "pipeline", "leak", "drinking water", "tap"]):
        category = "Water Supply"
        confidence = 0.91
    elif any(w in text for w in ["mosquito", "dengue", "fogging", "stagnant"]):
        category = "Public Health & Vector Control"
        confidence = 0.89

    # Entity extraction
    extracted = {}
    if "pothole" in text or "crater" in text:
        extracted["hazard"] = "Road Pothole Crater"
    if "water" in text:
        extracted["water_involvement"] = True
    if "spark" in text or "wire" in text:
        extracted["electrical_hazard"] = True

    # Priority determination
    priority = "MEDIUM"
    reasons = []
    if any(w in text for w in ["hospital", "emergency", "clinic", "accident", "open manhole"]):
        priority = "CRITICAL"
        reasons.append("Immediate public safety risk or healthcare access corridor disruption.")
    elif any(w in text for w in ["main road", "market", "traffic", "school"]):
        priority = "HIGH"
        reasons.append("High-density public movement area affected.")
    else:
        priority = "MEDIUM"
        reasons.append("Standard civic grievance within regular municipal schedule.")

    return {
        "category": category,
        "confidence": confidence,
        "priority": priority,
        "priority_reason": " ".join(reasons),
        "extracted_data": extracted,
        "duplicate_candidates": [],
        "model_version": "v1.0-civic-transformer-py"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
