"""
FixItNow AI Subsystem — Canonical Taxonomy and Mappings
Covers canonical YOLO defect classes plus municipal civic grievance departments.
"""

# Canonical 7 classes trained in YOLOv8
CANONICAL_CLASSES = [
    "pothole",
    "road_crack",
    "surface_erosion",
    "garbage_litter",
    "stagnant_water",
    "open_manhole",
    "fault_streetlight"
]

# Canonical 7 Municipal Departments
MUNICIPAL_DEPARTMENTS = [
    "Roads & Potholes",
    "Solid Waste & Sanitation",
    "Street Lighting",
    "Drainage & Sewerage",
    "Water Supply",
    "Public Health & Vector Control",
    "Encroachment & Public Space"
]

# Canonical Subtypes mapping to Department & YOLO Object
SUBTYPE_TAXONOMY = {
    "POTHOLE": {
        "subtype": "POTHOLE",
        "department": "Roads & Potholes",
        "yolo_object": "pothole",
        "hazard_label": "Road Pothole / Crater",
        "base_risk": 18
    },
    "ROAD_CRACK": {
        "subtype": "ROAD_CRACK",
        "department": "Roads & Potholes",
        "yolo_object": "road_crack",
        "hazard_label": "Structural Road Crack",
        "base_risk": 10
    },
    "SURFACE_EROSION": {
        "subtype": "SURFACE_EROSION",
        "department": "Roads & Potholes",
        "yolo_object": "surface_erosion",
        "hazard_label": "Road Surface Erosion",
        "base_risk": 10
    },
    "GARBAGE_ACCUMULATION": {
        "subtype": "GARBAGE_ACCUMULATION",
        "department": "Solid Waste & Sanitation",
        "yolo_object": "garbage_litter",
        "hazard_label": "Garbage Dump / Littering",
        "base_risk": 12
    },
    "WATERLOGGING": {
        "subtype": "WATERLOGGING",
        "department": "Drainage & Sewerage",
        "yolo_object": "stagnant_water",
        "hazard_label": "Stagnant Water / Vector Breeding Hazard",
        "base_risk": 16
    },
    "OPEN_MANHOLE": {
        "subtype": "OPEN_MANHOLE",
        "department": "Drainage & Sewerage",
        "yolo_object": "open_manhole",
        "hazard_label": "Open Manhole / Severe Fall Hazard",
        "base_risk": 30
    },
    "FAULTY_STREETLIGHT": {
        "subtype": "FAULTY_STREETLIGHT",
        "department": "Street Lighting",
        "yolo_object": "fault_streetlight",
        "hazard_label": "Faulty Streetlight / Dark Safety Zone",
        "base_risk": 20
    },
    "PIPELINE_LEAKAGE": {
        "subtype": "PIPELINE_LEAKAGE",
        "department": "Water Supply",
        "yolo_object": None,
        "hazard_label": "Drinking Water Disruption / Pipeline Leak",
        "base_risk": 15
    },
    "MOSQUITO_BREEDING": {
        "subtype": "MOSQUITO_BREEDING",
        "department": "Public Health & Vector Control",
        "yolo_object": None,
        "hazard_label": "Vector Breeding / Epidemic Public Hazard",
        "base_risk": 16
    },
    "ENCROACHMENT": {
        "subtype": "ENCROACHMENT",
        "department": "Encroachment & Public Space",
        "yolo_object": None,
        "hazard_label": "Public Corridor Encroachment",
        "base_risk": 12
    },
    "NON_CIVIC_ANOMALY": {
        "subtype": "NON_CIVIC_ANOMALY",
        "department": "Other / Non-Civic Issue",
        "yolo_object": None,
        "hazard_label": "Unclassified / Non-Civic Submission",
        "base_risk": 0
    }
}

# Mapping from internal class name or keyword category to Subtype
CLASS_TO_SUBTYPE = {
    "pothole": "POTHOLE",
    "road_crack": "ROAD_CRACK",
    "surface_erosion": "SURFACE_EROSION",
    "garbage_litter": "GARBAGE_ACCUMULATION",
    "stagnant_water": "WATERLOGGING",
    "open_manhole": "OPEN_MANHOLE",
    "fault_streetlight": "FAULTY_STREETLIGHT",
    "water_supply": "PIPELINE_LEAKAGE",
    "public_health": "MOSQUITO_BREEDING",
    "encroachment": "ENCROACHMENT",
    "other": "NON_CIVIC_ANOMALY"
}

# Municipal department and category mapping
CATEGORY_TAXONOMY = {
    "pothole": {
        "category": "Roads & Potholes",
        "base_risk": 18,
        "hazard_label": "Road Pothole / Crater",
        "description": "Depression or hole in roadway pavement causing vehicle damage or accident"
    },
    "road_crack": {
        "category": "Roads & Potholes",
        "base_risk": 10,
        "hazard_label": "Structural Road Crack",
        "description": "Longitudinal, transverse, or fatigue fissures in road surface"
    },
    "surface_erosion": {
        "category": "Roads & Potholes",
        "base_risk": 10,
        "hazard_label": "Road Surface Erosion",
        "description": "Loss of aggregate, peeling bitumen, or exposed road sub-base"
    },
    "garbage_litter": {
        "category": "Solid Waste & Sanitation",
        "base_risk": 10,
        "hazard_label": "Garbage Dump / Littering",
        "description": "Accumulation of refuse, solid waste, plastic litter, or decomposing organic matter"
    },
    "stagnant_water": {
        "category": "Drainage & Sewerage",
        "base_risk": 16,
        "hazard_label": "Stagnant Water / Vector Breeding Hazard",
        "description": "Waterlogging, standing sewage puddle, choked runoff causing health/skid risk"
    },
    "open_manhole": {
        "category": "Drainage & Sewerage",
        "base_risk": 30,
        "hazard_label": "Open Manhole / Severe Fall Hazard",
        "description": "Missing, broken, or dislodged sewer/drain cover presenting fatal fall hazard"
    },
    "fault_streetlight": {
        "category": "Street Lighting",
        "base_risk": 20,
        "hazard_label": "Faulty Streetlight / Dark Safety Zone",
        "description": "Non-functional streetlight luminaire, fused bulb, dark black spot, or electrical fault"
    },
    "water_supply": {
        "category": "Water Supply",
        "base_risk": 15,
        "hazard_label": "Drinking Water Disruption / Pipeline Leak",
        "description": "Potable water supply interruption, broken pipe, leaking valve, or contaminated tap supply"
    },
    "public_health": {
        "category": "Public Health & Vector Control",
        "base_risk": 15,
        "hazard_label": "Vector Breeding / Epidemic Public Hazard",
        "description": "Mosquito infestation, dengue/malaria outbreak, dead animal, or sanitary disinfection need"
    },
    "encroachment": {
        "category": "Encroachment & Public Space",
        "base_risk": 12,
        "hazard_label": "Public Corridor Encroachment",
        "description": "Illegal blockage of public road, footpath, or unauthorized structure on municipal easement"
    },
    "other": {
        "category": "Other / Non-Civic Issue",
        "base_risk": 0,
        "hazard_label": "Unclassified / Non-Civic Submission",
        "description": "General non-civic inquiry or unrecognized defect"
    }
}

# Fast lookup for YOLO class index to metadata
CLASS_MAP = {
    0: {"name": "pothole", "category": "Roads & Potholes", "priority": "HIGH", "hazard": "Road Pothole / Crater"},
    1: {"name": "road_crack", "category": "Roads & Potholes", "priority": "MEDIUM", "hazard": "Road Structural Crack"},
    2: {"name": "surface_erosion", "category": "Roads & Potholes", "priority": "MEDIUM", "hazard": "Road Surface Erosion"},
    3: {"name": "garbage_litter", "category": "Solid Waste & Sanitation", "priority": "MEDIUM", "hazard": "Garbage Dump / Littering"},
    4: {"name": "stagnant_water", "category": "Drainage & Sewerage", "priority": "HIGH", "hazard": "Stagnant Water / Vector Breeding Hazard"},
    5: {"name": "open_manhole", "category": "Drainage & Sewerage", "priority": "CRITICAL", "hazard": "Open Manhole / Severe Fall Hazard"},
    6: {"name": "fault_streetlight", "category": "Street Lighting", "priority": "HIGH", "hazard": "Faulty Streetlight / Dark Safety Zone"}
}
