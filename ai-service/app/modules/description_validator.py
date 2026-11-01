"""
FixItNow AI Subsystem — Strict Complaint Description & Civic Intent Validator
Validates whether a citizen's complaint description is meaningful, non-gibberish,
and describes an actionable civic/municipal infrastructure problem.

Supports:
  - English
  - Hindi (Devanagari)
  - Hinglish (Latin-script transliterated Hindi)

Rejects:
  - Empty or whitespace-only text
  - Meaningless random strings (e.g. 'et54t5', 'abcxyz')
  - QWERTY keyboard mashes (e.g. 'qwerty', 'asdfgh', '123456')
  - Alphanumeric noise tokens with interleaved digits
  - Long consonant sequences without vowels
  - Non-civic random sentences (e.g. 'random unrelated text', 'I love ice cream')
"""

import re
from typing import Dict, Any, Optional

QWERTY_SEQUENCES = [
    'qwerty', 'wertyu', 'ertyui', 'rtyuio', 'tyuiop',
    'asdfgh', 'sdfghj', 'dfghjk', 'fghjkl',
    'zxcvbn', 'xcvbnm',
    '123456', '234567', '345678', '456789', '567890',
    'poiuyt', 'lkjhgf', 'mnbvcx', '654321', '098765'
]

# Core civic defect nouns in English and Hinglish
CIVIC_DEFECT_KEYWORDS = {
    # Roads & Potholes
    'pothole', 'potholes', 'gaddha', 'gaddhe', 'gadde', 'gadda', 'crater', 'craters',
    'road', 'roads', 'sadak', 'street', 'streets', 'highway', 'lane', 'footpath', 'sidewalk',
    'pavement', 'crack', 'cracks', 'fissure', 'fissures', 'broken', 'damaged', 'erosion',
    'asphalt', 'bitumen', 'divider', 'gutter', 'gutters', 'tar',
    
    # Solid Waste & Sanitation
    'garbage', 'litter', 'waste', 'trash', 'dump', 'dumping', 'dustbin', 'dustbins',
    'bin', 'bins', 'kachra', 'kachre', 'gandagi', 'debris', 'filth', 'rubbish',
    
    # Drainage & Sewerage
    'manhole', 'manholes', 'drain', 'drains', 'drainage', 'sewer', 'sewage',
    'naali', 'nali', 'naliya', 'naliyan', 'dhakkan', 'chamber', 'gutter', 'gutters',
    
    # Water Supply & Waterlogging
    'waterlogging', 'waterlogged', 'water', 'flooding', 'flooded', 'stagnant',
    'paani', 'pani', 'leak', 'leakage', 'pipe', 'pipeline', 'jal', 'jamao', 'kichad',
    
    # Street Lighting & Electricity
    'streetlight', 'streetlights', 'light', 'lights', 'lamp', 'lamps', 'bulb', 'bulbs',
    'pole', 'poles', 'khamba', 'khambe', 'batti', 'bijli', 'andhera', 'darkness', 'fuse'
}

# Actionable descriptors and civic problem verbs
CIVIC_PROBLEM_DESCRIPTORS = {
    'kharab', 'toota', 'tuta', 'jama', 'bhara', 'gaya', 'hua', 'hai', 'hain', 'pada',
    'danger', 'dangerous', 'overflow', 'overflowing', 'choked', 'blocked', 'smell',
    'problem', 'problems', 'causing', 'deep', 'large', 'severe', 'uncovered', 'open',
    'pedestrians', 'accident', 'safety', 'dumped', 'repair', 'broken', 'damaged',
    'hazard', 'hazardous', 'falling', 'dark', 'andhera', 'complaint', 'fix', 'clean',
    'unattended', 'stench', 'foul', 'risk'
}

# Hindi Devanagari civic words
HINDI_DEVANAGARI_CIVIC = [
    'सड़क', 'कचरा', 'गड्ढा', 'गड्ढे', 'पानी', 'नाली', 'नालियां', 'लाइट', 'बिजली',
    'खराब', 'टूटा', 'टूटी', 'गंदगी', 'जाम', 'जल', 'सीवर', 'पोल', 'खंभा',
    'मैनहोल', 'ढक्कन', 'अंधेरा', 'कूड़ा', 'सफाई', 'जलभराव', 'गड्ढे'
]

def validate_complaint_description(text: str) -> Dict[str, Any]:
    """
    Strictly validates a complaint description.
    Returns:
      is_valid: bool
      status: 'VALID_DESCRIPTION' or 'INVALID_DESCRIPTION'
      error_code: str or None
      reason: str
      detected_language: str
      civic_category: str or None
      target_defect: str or None
    """
    if not text or not isinstance(text, str):
        return {
            'is_valid': False,
            'status': 'INVALID_DESCRIPTION',
            'error_code': 'EMPTY_DESCRIPTION',
            'reason': 'Complaint description is empty. Please describe the civic issue in words.',
            'detected_language': 'None',
            'civic_category': None,
            'target_defect': None
        }

    clean_text = text.strip()
    if len(clean_text) < 6:
        return {
            'is_valid': False,
            'status': 'INVALID_DESCRIPTION',
            'error_code': 'TOO_SHORT',
            'reason': 'Description is too short. Please provide clear details about the civic defect.',
            'detected_language': 'None',
            'civic_category': None,
            'target_defect': None
        }

    t_lower = clean_text.lower()

    # 1. Keyboard mash sequences (e.g. 'qwerty', 'asdfgh', '123456')
    for seq in QWERTY_SEQUENCES:
        if seq in t_lower:
            return {
                'is_valid': False,
                'status': 'INVALID_DESCRIPTION',
                'error_code': 'GIBBERISH_KEYBOARD_MASH',
                'reason': f"Description contains random keyboard typing sequence ('{seq}'). Please enter a real civic complaint.",
                'detected_language': 'Gibberish',
                'civic_category': None,
                'target_defect': None
            }

    # 2. Repeated character bursts (e.g. 'aaaaaa', 'xxxxxx', '......')
    if re.search(r'(.)\1{3,}', t_lower):
        return {
            'is_valid': False,
            'status': 'INVALID_DESCRIPTION',
            'error_code': 'REPEATED_CHARS',
            'reason': 'Description contains excessive repetitive characters. Please enter a genuine problem description.',
            'detected_language': 'Gibberish',
            'civic_category': None,
            'target_defect': None
        }

    # Tokenize words (English, digits, and Devanagari script)
    words = re.findall(r'[a-zA-Z0-9\u0900-\u097F]+', t_lower)
    if not words:
        return {
            'is_valid': False,
            'status': 'INVALID_DESCRIPTION',
            'error_code': 'NO_ALPHANUMERIC_WORDS',
            'reason': 'Description contains no readable words. Please enter meaningful text.',
            'detected_language': 'None',
            'civic_category': None,
            'target_defect': None
        }

    # 3. Check individual tokens for alphanumeric noise or unnatural consonant sequences
    for w in words:
        # Meaningless alphanumeric tokens like 'et54t5', 'a1b2c3', 'x9y8z7'
        if re.search(r'[a-z]+[0-9]+[a-z]+', w) or re.search(r'[0-9]+[a-z]+[0-9]+', w):
            return {
                'is_valid': False,
                'status': 'INVALID_DESCRIPTION',
                'error_code': 'ALPHANUMERIC_GIBBERISH',
                'reason': f"Description contains meaningless random token '{w}'. Please provide an authentic civic complaint.",
                'detected_language': 'Gibberish',
                'civic_category': None,
                'target_defect': None
            }
        # Long consonant streak without vowels (e.g. 'asdfgh', 'abcxyz', 'bcdfgh')
        # Only check Latin words of length >= 5
        if re.match(r'^[a-z]+$', w) and len(w) >= 5:
            if re.search(r'[bcdfghjklmnpqrstvwxz]{5,}', w):
                return {
                    'is_valid': False,
                    'status': 'INVALID_DESCRIPTION',
                    'error_code': 'CONSONANT_GIBBERISH',
                    'reason': f"Description contains unnatural character sequence '{w}'. Please enter valid words.",
                    'detected_language': 'Gibberish',
                    'civic_category': None,
                    'target_defect': None
                }

    # 4. Single-word rejection if not a recognized civic defect
    has_devanagari = bool(re.search(r'[\u0900-\u097F]', clean_text))
    has_civic_term = any(re.search(r'\b' + re.escape(k) + r'\b', t_lower) for k in CIVIC_DEFECT_KEYWORDS)
    if has_devanagari and any(h in clean_text for h in HINDI_DEVANAGARI_CIVIC):
        has_civic_term = True

    if len(words) < 2 and not has_civic_term:
        return {
            'is_valid': False,
            'status': 'INVALID_DESCRIPTION',
            'error_code': 'INSUFFICIENT_WORDS',
            'reason': 'Description is too brief or meaningless. Please describe the specific issue (e.g. pothole, garbage, streetlight).',
            'detected_language': 'English' if not has_devanagari else 'Hindi',
            'civic_category': None,
            'target_defect': None
        }

    # 5. Civic Domain Relevance Verification
    # Even if grammatically valid (e.g. 'random unrelated text', 'hello how are you'), does it describe a civic issue?
    if not has_civic_term:
        return {
            'is_valid': False,
            'status': 'INVALID_DESCRIPTION',
            'error_code': 'NON_CIVIC_TEXT',
            'reason': 'Description does not describe an actionable municipal or civic infrastructure issue. Please describe a problem such as a pothole, road damage, garbage, waterlogging, or streetlight issue.',
            'detected_language': 'Hindi' if has_devanagari else 'English',
            'civic_category': None,
            'target_defect': None
        }

    # Determine Language and Target Category for Valid Description
    lang = 'Hindi' if has_devanagari else ('Hinglish' if any(h in t_lower for h in ['sadak', 'kachra', 'gaddha', 'paani', 'kharab', 'hai', 'bahut', 'bada', 'pada']) else 'English')

    # Helper for whole-word keyword matching
    def matches_any(keywords):
        return any(re.search(r'\b' + re.escape(kw) + r'\b', t_lower) for kw in keywords)

    # Resolve target defect
    target_defect = None
    civic_cat = 'General Civic Issue'
    if matches_any(['garbage', 'litter', 'waste', 'trash', 'dump', 'kachra', 'gandagi', 'dustbin', 'bin']) or (has_devanagari and any(h in clean_text for h in ['कचरा', 'कूड़ा', 'गंदगी', 'सफाई'])):
        target_defect = 'garbage_litter'
        civic_cat = 'Solid Waste & Sanitation'
    elif matches_any(['pothole', 'gaddha', 'crater', 'gadde']) or (has_devanagari and any(h in clean_text for h in ['गड्ढा', 'गड्ढे'])):
        target_defect = 'pothole'
        civic_cat = 'Roads & Potholes'
    elif matches_any(['crack', 'cracks', 'fissure', 'broken road']) or (has_devanagari and any(h in clean_text for h in ['दरार', 'टूटी सड़क'])):
        target_defect = 'road_crack'
        civic_cat = 'Roads & Potholes'
    elif matches_any(['manhole', 'drain', 'sewer', 'sewage', 'dhakkan', 'chamber', 'naali', 'nali']) or (has_devanagari and any(h in clean_text for h in ['मैनहोल', 'नाली', 'सीवर', 'ढक्कन'])):
        target_defect = 'open_manhole'
        civic_cat = 'Drainage & Sewerage'
    elif matches_any(['waterlogging', 'flooding', 'stagnant', 'waterlogged', 'paani', 'pani', 'bhar gaya']) or (has_devanagari and any(h in clean_text for h in ['जलभराव', 'पानी भरा', 'जल जमाव'])):
        target_defect = 'stagnant_water'
        civic_cat = 'Drainage & Sewerage'
    elif matches_any(['streetlight', 'street light', 'lamp', 'bulb', 'pole', 'khamba', 'batti', 'andhera']) or (has_devanagari and any(h in clean_text for h in ['लाइट', 'खंभा', 'अंधेरा', 'बत्ती'])):
        target_defect = 'fault_streetlight'
        civic_cat = 'Street Lighting'
    elif matches_any(['erosion', 'surface', 'asphalt']) or (has_devanagari and any(h in clean_text for h in ['कटाव', 'सड़क'])):
        target_defect = 'surface_erosion'
        civic_cat = 'Roads & Potholes'

    return {
        'is_valid': True,
        'status': 'VALID_DESCRIPTION',
        'error_code': None,
        'reason': 'Description describes a verified civic defect.',
        'detected_language': lang,
        'civic_category': civic_cat,
        'target_defect': target_defect
    }
