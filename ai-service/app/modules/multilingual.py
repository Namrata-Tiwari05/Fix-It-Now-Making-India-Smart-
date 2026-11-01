"""
FixItNow AI Subsystem — Module B: Multilingual Complaint Classification
Supports English, Hindi (Devanagari Unicode), and Hinglish (Transliterated Roman).
Accurately categorizes Indian civic grievances across all 7 municipal departments.
"""

import re
import unicodedata
from typing import Dict, Any, List, Optional
from .taxonomy import CANONICAL_CLASSES, CATEGORY_TAXONOMY, SUBTYPE_TAXONOMY, CLASS_TO_SUBTYPE

# Comprehensive Multilingual Vocabulary Lexicon
VOCAB_LEXICON = {
    "pothole": {
        "en": [
            r"\bpotholes?\b", r"\bcraters?\b", r"\broad\s+(?:cavity|depression|damage|defect|breakage)\b",
            r"\bbroken\s+(?:road|street|pathway|pavement|asphalt)\b", r"\bbad\s+road\b",
            r"\bdeep\s+holes?\b", r"\bbumpy\s+road\b", r"\broad\s+potholes?\b", r"\bditch(?:es)?\b",
            r"\b(?:road|street|pavement|asphalt)\s+(?:is\s+)?(?:severely\s+)?(?:damaged|broken|destroyed|cracked|uneven)\b",
            r"\b(?:severely\s+)?damaged\s+(?:road|surface|street|asphalt)\b", r"\bbroken\s+asphalt\b",
            r"\blarge\s+pothole\b"
        ],
        "hi": [
            r"गड्ढा", r"गड्ढे", r"गड्ढों", r"गड्डा", r"गड्डे", r"खड्ड", r"खड्डे",
            r"टूटी\s*सड़क", r"खराब\s*सड़क", r"सड़क\s*टूटी", r"सड़क\s*खराब",
            r"सड़क\s*पर\s*(?:गड्ढा|गड्ढे|गड्डा|खड्डा)", r"धंसी\s*सड़क",
            r"सड़क\s*टूट\s*गई", r"टूट\s*गई"
        ],
        "hinglish": [
            r"\bgadd?h?[aeo](?:[ns]?|on)?\b", r"\bkhadd?[aeo](?:[ns]?|on)?\b",
            r"\bpotholes?\b", r"\bcraters?\b",
            r"\b(?:toot[ie]?|tut[ie]?|kharab|damaged|broken)\s+(?:sadak|road|raste?)\b",
            r"\b(?:sadak|road|raste?)\s+(?:toot[ie]?|tut[ie]?|kharab|damaged|broken)\b",
            r"\bsadak\s+(?:toot|tut)\s+(?:gay[ie]|hai)\b",
            r"\b(?:toot|tut)\s+gay[ie]\b",
            r"\bsadak\s+(?:pe|par|me)\s+(?:gaddh?|khadd?)[aeo]\b",
            r"\broad\s+(?:pe|par|me)\s+(?:gaddh?|khadd?)[aeo]\b",
            r"\bgaddh?[aeo]\s+(?:me|par|pe)\b",
            r"\bsadak\s+kharab\b", r"\broad\s+kharab\b"
        ]
    },
    "road_crack": {
        "en": [
            r"\bcracks?\b", r"\bfractures?\b", r"\bfissures?\b",
            r"\blongitudinal\s+cracks?\b", r"\broad\s+split\b", r"\bpavement\s+cracks?\b",
            r"\blong\s+cracks?\b", r"\bprominent\s+cracks?\b", r"\broad\s+crack(?:s)?\b"
        ],
        "hi": [
            r"दरार", r"दरारें", r"फटन", r"फटी\s*सड़क", r"चीरा", r"लंबी\s*दरार", r"बड़ी\s*दरार"
        ],
        "hinglish": [
            r"\bdara+r(?:[es]|en)?\b", r"\bcracks?\b", r"\bphatan\b", r"\bfatan\b",
            r"\bfissures?\b", r"\bsadak\s+(?:phat|fat)\s+gayi\b", r"\broad\s+crack(?:s)?\b",
            r"\blambi\s+dara+r\b", r"\bbadi\s+dara+r\b"
        ]
    },
    "surface_erosion": {
        "en": [
            r"\berosion\b", r"\beroded\b", r"\bgravel\b", r"\bpeeling\s+(?:asphalt|bitumen|tar|surface)\b",
            r"\bpeeled\b", r"\baggregate\b", r"\bchipping\b", r"\bcoarse\s+road\b", r"\bloose\s+gravel\b",
            r"\b(?:road|street|pavement|asphalt|surface)\s+(?:is\s+)?(?:severely\s+)?(?:damaged|broken|destroyed|deteriorating|uneven|eroded)\b",
            r"\b(?:severely\s+)?damaged\s+(?:road|surface|street|asphalt)\b", r"\broad\s+surface\b",
            r"\bbroken\s+asphalt\b", r"\buneven\s+surface\b", r"\bsurface\s+damage(?:d)?\b"
        ],
        "hi": [
            r"उखड़[ीाे]", r"गिट्टी", r"कंकड़", r"घिस\s*गई", r"डामर", r"रोड़ी", r"रोड़ी\s*बिखरी",
            r"सड़क\s*की\s*सतह", r"सतह\s*खराब", r"सतह\s*टूटी", r"डामर\s*उखड़ा"
        ],
        "hinglish": [
            r"\bghiss?\s+gay[ia]\b", r"\bukhda?\b", r"\bukhad\b", r"\bukhdi\b",
            r"\bkankar\b", r"\bgit+i\b", r"\bgravel\b", r"\berosion\b", r"\brodi\b",
            r"\bdamar\b", r"\broadi\s+bikhri\b",
            r"\broad\s+surface\b", r"\bsadak\s+ki\s+satah\b", r"\bsatah\s+kharab\b",
            r"\bseverely\s+damaged\b", r"\btoot\s+gayi\b"
        ]
    },
    "garbage_litter": {
        "en": [
            r"\bgarbage\b", r"\btrash\b", r"\bwaste\b", r"\blitter(?:ing)?\b",
            r"\bdump(?:ing|ed|s)?\b", r"\brubbish\b", r"\bdebris\b", r"\brefuse\b",
            r"\bdustbins?\b", r"\bfilth\b", r"\bstench\b", r"\bfoul\s+smell\b",
            r"\bplastic\s+waste\b", r"\buncleaned\b", r"\bdead\s+animal\b", r"\brefuse\s+pile\b"
        ],
        "hi": [
            r"कचरा", r"कचरे", r"कूड़ा", r"कूड़े", r"कूड़ेदान", r"गंदगी", r"मलबा",
            r"सड़ांध", r"बदबू", r"कूड़े\s*का\s*ढेर", r"कचरे\s*का\s*ढेर",
            r"सफाई\s*नहीं", r"झाड़ू\s*नहीं", r"कचरा\s*गाड़ी", r"डस्टबिन", r"सड़ा\s*हुआ", r"मरा\s*जानवर"
        ],
        "hinglish": [
            r"\bkachr?a\b", r"\bkachr?e\b", r"\bkachda\b", r"\bkood?a\b", r"\bkood?e\b",
            r"\bkuda\b", r"\bkude\b", r"\bdustbin\b", r"\btrash\b", r"\bgarbage\b",
            r"\bdump\b", r"\bbadb[ou]{1,2}\b", r"\bplastic\s+waste\b", r"\bgandag[ie]\b",
            r"\bgandg[ie]\b", r"\bsafai\s+nah[ie]\b", r"\bkachra\s+(?:phek|pada|dher)\b",
            r"\bkooda\s+pada\b", r"\bdead\s+animal\b", r"\bmara\s+janwar\b", r"\bsafai\b", r"\bsaaf\b", r"\bhta\s+diya\b", r"\bhata\s+diya\b", r"\buthwa\s+diya\b", r"\butha\s+liya\b", r"\bcleared\b", r"\bcleaned\b", r"\bsafai\b", r"\bsaaf\b", r"\bhta\s+diya\b", r"\bhata\s+diya\b", r"\buthwa\s+diya\b", r"\butha\s+liya\b", r"\bcleared\b", r"\bcleaned\b"
        ]
    },
    "open_manhole": {
        "en": [
            r"\bmanholes?\b", r"\bopen\s+manholes?\b", r"\buncovered\s+manholes?\b",
            r"\bopen\s+sewers?\b", r"\bmissing\s+(?:lids?|covers?)\b",
            r"\buncovered\s+(?:drains?|manholes?|sewers?)\b", r"\bgutter\s+(?:chambers?|covers?|lids?)\b",
            r"\bsewer\s+(?:holes?|chambers?|covers?)\b", r"\bbroken\s+(?:manhole|sewer\s+cover|drain\s+cover)\b",
            r"\bdeep\s+sewer\b", r"\bchamber\s+open\b", r"\bmanhole\s+(?:is\s+)?(?:present|open|uncovered|damaged)\b"
        ],
        "hi": [
            r"मैनहोल", r"खुला\s*सीवर", r"ढक्कन\s*गायब", r"खुला\s*मैनहोल",
            r"गटर\s*का\s*ढक्कन", r"खुला\s*गटर", r"सीवर\s*का\s*ढक्कन",
            r"ढक्कन\s*टूटा", r"नाली\s*का\s*ढक्कन", r"चैंबर\s*खुला", r"चैंबर\s*टूटा",
            r"सड़क\s*पर\s*खुला\s*मैनहोल"
        ],
        "hinglish": [
            r"\bmanholes?\b", r"\bkhula\s+sewer\b", r"\bdhakkan\s+gayab\b", r"\bdhakkan\s+toota\b",
            r"\btoota\s+dhakkan\b", r"\bkhula\s+manhole\b", r"\bopen\s+gutter\b", r"\bkhula\s+gatar\b",
            r"\bgutter\s+ka\s+dhakkan\b", r"\bsewer\s+ka\s+dhakkan\b", r"\bgatar\s+ka\s+dhakkan\b",
            r"\bchamber\s+(?:khula|toota|broken|open)\b", r"\bnaali\s+ka\s+dhakkan\b",
            r"\bkhul[ae]\s+manhole\b", r"\bopen\s+manhole\b"
        ]
    },
    "stagnant_water": {
        "en": [
            r"\bwater\s*log(?:ged|ging|s)?\b", r"\bstagnant(?:\s+water)?\b", r"\bpuddles?\b",
            r"\bwater\s+accumulat\w*\b", r"\bwater\s+fill\w*\b", r"\bwater\s+stand\w*\b",
            r"\bwater\s+pool\w*\b", r"\bflooded(?:\s+road|\s+street|\s+area)?\b", r"\bflooding\b",
            r"\bmosquito\s+hazards?\b", r"\bstanding\s+water\b", r"\bsewage(?:\s+water|\s+overflow)?\b",
            r"\bchoked?\s+drains?\b", r"\bblocked?\s+drains?\b", r"\bdrainage\s+(?:choke|blocked|choked|issue|problem|overflow)\b",
            r"\bsewer\s+(?:overflow|blocked|leak|burst)\b", r"\boverflowing\s+drain\b",
            r"\bchoked\s+gutter\b", r"\bdrainage\b", r"\bsewer\s+lines?\b"
        ],
        "hi": [
            r"जल\s*भराव", r"जल\s*जमाव", r"जलभराव", r"जल-?जमाव", r"जमा\s*हुआ\s*पानी",
            r"पानी\s*भरा", r"पानी\s*जमा", r"गंदा\s*पानी", r"मच्छर",
            r"गटर\s*का\s*पानी", r"नाली\s*जाम", r"नाला\s*चोक",
            r"नाली\s*चोक", r"नाला\s*जाम", r"सीवर\s*ब्लॉक", r"सीवर\s*ओवरफ्लो", r"कीचड़"
        ],
        "hinglish": [
            r"\bwater\s*log(?:ged|ging)?\b", r"\bwater\s+jama\b", r"\bwater\s+bhara\b",
            r"\bstagnant\b", r"\bganda\s+paani\b", r"\bganda\s+pani\b",
            r"\bpaani\s+jama\b", r"\bpani\s+jama\b", r"\bpaani\s+bhara\b", r"\bpani\s+bhara\b",
            r"\bkeechad\b", r"\bkeechar\b", r"\bjal-?jamao\b", r"\bjal\s*bharao\b",
            r"\bnaali\s+(?:choke|jam|block|overflow)\b", r"\bnala\s+(?:choke|jam|block|overflow)\b",
            r"\bdrainage\s+(?:choke|choked|block|blocked|overflow)\b",
            r"\bdrain\s+(?:choke|choked|block|blocked|overflow)\b",
            r"\bsewer\s+(?:line\s+)?(?:block|blocked|overflow|leak)\b", r"\bsewage\s+water\b",
            r"\bdrainage\s+choke\b", r"\bsewer\s+line\b"
        ]
    },
    "fault_streetlight": {
        "en": [
            r"\bstreet\s*lights?\b", r"\blamp\s*posts?\b", r"\bluminaire\b",
            r"\bdark\s+poles?\b", r"\bunlit\b", r"\bblack\s*spots?\b", r"\bbulb\s+fused?\b",
            r"\blight\s+(?:not\s+working|is\s+off|fused|broken|flickering|faulty)\b",
            r"\bpole\s+lights?\b", r"\bno\s+street\s*lights?\b", r"\bdarkness\b"
        ],
        "hi": [
            r"स्ट्रीट\s*लाइट", r"खंभा", r"बत्ती\s*खराब", r"लाइट\s*खराब",
            r"स्ट्रीट\s*लाइट\s*बंद", r"अंधेरा", r"बत्ती\s*गुल", r"स्ट्रीट\s*लाइटें",
            r"खंभे\s*की\s*लाइट", r"लाइट\s*नहीं\s*जल\s*रही", r"बल्ब\s*फ्यूज", r"अंधेरा\s*रहता\s*है", r"लाइट\s*बंद"
        ],
        "hinglish": [
            r"\bstreet\s*lights?\b",
            r"\blight\s+(?:kharab|band|off|nah[ie]\s+jal\s+rah[ie]|nah[ie]\s+chal\s+rah[ie]|fused?)\b",
            r"\bbatti\s+(?:band|kharab|gul)\b",
            r"\bandhera(?:\s+hai|\s+rehta\s+hai)?\b",
            r"\bpole\s+(?:ki\s+light|ka\s+bulb|light|pe\s+light|par\s+light)\b",
            r"\blamp\s*posts?\b", r"\bblack\s*spot\b", r"\bbulb\s+fuse\b",
            r"\blight\s+nah[ie]\s+jal\b"
        ]
    },
    "water_supply": {
        "en": [
            r"\bwater\s+supply\b", r"\bdrinking\s+water\b", r"\bpipeline(?:\s+leak|\s+burst)?\b",
            r"\btap\s+water\b", r"\bno\s+water\b", r"\bwater\s+leakage\b", r"\bwater\s+tanker\b",
            r"\bpipe\s+(?:leak|burst|broken)\b", r"\blow\s+water\s+pressure\b"
        ],
        "hi": [
            r"पेयजल", r"पाइपलाइन", r"पाइप\s*लीक", r"पाइप\s*फूटा", r"नल\s*में\s*पानी",
            r"पानी\s*की\s*सप्लाई", r"पानी\s*नहीं\s*आ\s*रहा", r"पानी\s*सप्लाई", r"पानी\s*का\s*नल", r"नल"
        ],
        "hinglish": [
            r"\bwater\s+supply\b", r"\bpaani\s+supply\b", r"\bpani\s+supply\b",
            r"\bdrinking\s+water\b", r"\bpipe\s+(?:leak|burst|phoota|toota)\b",
            r"\bpipeline\s+(?:leak|burst|tooti)\b",
            r"\bnal\s+(?:me|se|ka)?\b", r"\bnal\b",
            r"\bp[aa]ni\s+nah[ie]\s+(?:aa\s+raha|aata|mil\s+raha)?\b",
            r"\bp[aa]ni\s+band\b", r"\bpaani\s+tanker\b"
        ]
    },
    "public_health": {
        "en": [
            r"\bmosquito(?:es)?\b", r"\bdengue\b", r"\bmalaria\b", r"\bfogging\b",
            r"\bvector\b", r"\bepidemic\b", r"\bdead\s+animals?\b", r"\bdisinfection\b"
        ],
        "hi": [
            r"मच्छर", r"डेंगू", r"मलेरिया", r"फॉगिंग", r"कीटनाशक", r"छिड़काव", r"संक्रमण"
        ],
        "hinglish": [
            r"\bmachh?ar\b", r"\bdengue\b", r"\bmalaria\b", r"\bfogging\b",
            r"\bchhidkao\b", r"\bkeede\b", r"\bmachhar\s+bohot\b"
        ]
    },
    "encroachment": {
        "en": [
            r"\bencroach(?:ment|ing)?\b", r"\billegal\s+(?:shop|structure|construction|hawker)\b",
            r"\bblocked\s+footpath\b", r"\bunauthorized\s+construction\b"
        ],
        "hi": [
            r"अतिक्रमण", r"अवैध\s*कब्जा", r"फुटपाथ\s*कब्जा", r"रास्ता\s*बंद", r"अवैध\s*निर्माण"
        ],
        "hinglish": [
            r"\bencroachment\b", r"\bkabza\b", r"\bfootpath\s+kabza\b",
            r"\brasta\s+band\b", r"\billegal\s+dukaan\b", r"\bthele\s+wale\b"
        ]
    }
}

# Negation patterns
NEGATION_PATTERNS = [
    r"\bnot\s+a\b", r"\bno\s+issue\b", r"\bnever\b", r"\bworking\s+fine\b", r"\bworking\s+properly\b",
    r"\bno\s+problem\b", r"\bclean\s+now\b",
    r"नहीं\s+है", r"नहीं\s+था", r"मत\b", r"ठीक\s+है", r"कोई\s+समस्या\s+नहीं",
    r"\bnah[ie]\s+hai\b", r"\btheek\s+hai\b", r"\bproper\s+hai\b", r"\bkoi\s+dikkat\s+nahi\b"
]

# Uncertainty patterns
UNCERTAINTY_PATTERNS = [
    r"\bmaybe\b", r"\bpossibly\b", r"\bperhaps\b", r"\bnot\s+sure\b", r"\bunclear\b",
    r"शायद", r"लगता\s+है", r"हो\s+सकता\s+है",
    r"\bshayad\b", r"\blagta\s+hai\b", r"\bho\s+sakta\s+hai\b"
]

def classify_complaint(complaint_text: str, upstream_visual_evidence: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Evidence-driven multilingual complaint category classifier supporting English, Hindi, and Hinglish.
    Seamlessly integrates upstream YOLOv8 visual evidence when provided.
    """
    text_present = bool(complaint_text and isinstance(complaint_text, str) and complaint_text.strip())
    raw_text = complaint_text.strip() if text_present else ""

    # 1. Unicode NFKC Normalization
    norm_text = unicodedata.normalize("NFKC", raw_text)
    clean_text = " " + re.sub(r"\s+", " ", norm_text).lower() + " "

    # 2. Language Detection
    if not text_present:
        detected_lang = "None"
    elif bool(re.search(r"[\u0900-\u097F]", norm_text)):
        detected_lang = "Hindi"
    elif any(re.search(pat, clean_text) for pat in [
        r"\bhai\b", r"\bka\b", r"\bki\b", r"\bke\b", r"\bko\b", r"\bpar\b", r"\bpe\b",
        r"\bbohot\b", r"\braha\b", r"\brahe\b", r"\bhain\b", r"\bme\b", r"\bse\b",
        r"\bgaddh?[aeo]\b", r"\bkachr?[ae]\b", r"\bandhera\b", r"\btoot[ie]\b"
    ]):
        detected_lang = "Hinglish"
    else:
        detected_lang = "English"

    # 3. Negation & Uncertainty Check
    is_negated = any(re.search(p, clean_text) for p in NEGATION_PATTERNS) if text_present else False
    is_uncertain = any(re.search(p, clean_text) for p in UNCERTAINTY_PATTERNS) if text_present else False

    # 4. Keyword Pattern Matching
    class_hits = {}
    matched_evidence = {}

    if text_present:
        for cls_name, lang_dict in VOCAB_LEXICON.items():
            hits = 0
            ev_list = []
            for l_key, patterns in lang_dict.items():
                for pat in patterns:
                    matches = re.findall(pat, clean_text)
                    if matches:
                        hits += len(matches)
                        ev_list.extend(matches)
            if hits > 0:
                class_hits[cls_name] = hits
                matched_evidence[cls_name] = list(set(ev_list))

    # 5. Extract Upstream Visual Evidence if supplied
    visual_class = None
    visual_conf = 0.0
    visual_available = False

    if upstream_visual_evidence and isinstance(upstream_visual_evidence, dict):
        visual_class = upstream_visual_evidence.get("primary_class")
        visual_conf = float(upstream_visual_evidence.get("primary_confidence", 0.0))
        visual_available = bool(visual_class and visual_conf > 0.0)

    # 6. Resolve Final Predicted Category
    candidate_categories = []
    category_scores = {}
    predicted_class = None
    method = "multilingual_nlp_lexicon_v2"
    requires_review = False
    status = "CLASSIFIED"

    # Case A: Multimodal Corroboration (Text + Image)
    if class_hits and visual_available:
        sorted_hits = sorted(class_hits.items(), key=lambda x: x[1], reverse=True)
        top_text_class, top_count = sorted_hits[0]

        total_hits = sum(class_hits.values())
        for c_name, c_cnt in class_hits.items():
            category_scores[c_name] = round(c_cnt / total_hits, 3)

        # Check exact class or department corroboration
        text_dept = CATEGORY_TAXONOMY.get(top_text_class, {}).get("category")
        visual_dept = CATEGORY_TAXONOMY.get(visual_class, {}).get("category")

        if visual_class == top_text_class:
            predicted_class = top_text_class
            method = "fused_hybrid_corroborated"
            requires_review = is_uncertain or is_negated
            status = "CONFIRMED_HYBRID"
        elif text_dept == visual_dept:
            # Same municipal department! e.g., text says 'sadak kharab' / pothole and vision detects road_crack
            predicted_class = visual_class if visual_conf >= 0.45 else top_text_class
            method = "department_corroborated_hybrid"
            requires_review = False
            status = "CONFIRMED_HYBRID"
        elif visual_conf >= 0.60 and not (len(class_hits) == 1 and top_count >= 2):
            predicted_class = visual_class
            method = "visual_evidence_override"
            requires_review = True
            status = "CONTRADICTORY_EVIDENCE"
        else:
            predicted_class = top_text_class
            method = "text_priority_disagreement"
            requires_review = True
            status = "CONTRADICTORY_EVIDENCE"

    # Case B: Text Only (No Image or image has no detections)
    elif class_hits:
        sorted_hits = sorted(class_hits.items(), key=lambda x: x[1], reverse=True)
        top_text_class, top_count = sorted_hits[0]
        total_hits = sum(class_hits.values())
        for c_name, c_cnt in class_hits.items():
            category_scores[c_name] = round(c_cnt / total_hits, 3)

        predicted_class = top_text_class
        method = "text_only_multilingual_lexicon"
        requires_review = is_uncertain or is_negated or len(class_hits) > 1
        status = "MULTI_INTENT" if len(class_hits) > 1 else ("NEGATED_FLAG" if is_negated else "CLASSIFIED")

    # Case C: Visual Only (Empty Text or text had no keywords)
    elif visual_available:
        if text_present and not class_hits:
            predicted_class = visual_class
            category_scores[visual_class] = round(visual_conf * 0.5, 3)
            method = "visual_only_uninformative_text"
            requires_review = True
            status = "TEXT_LACKS_CIVIC_KEYWORDS"
        else:
            predicted_class = visual_class
            category_scores[visual_class] = round(visual_conf, 3)
            method = "visual_only_yolov8"
            requires_review = visual_conf < 0.45
            status = "CLASSIFIED_VISUAL_ONLY"

    # Case D: Uninformative / Empty
    else:
        # Default to most common civic maintenance (Roads & Potholes)
        predicted_class = "other"
        method = "uninformative_or_non_civic"
        requires_review = True
        status = "UNINFORMATIVE_OR_EMPTY"

    for c_name, sc in category_scores.items():
        candidate_categories.append({
            "class_name": c_name,
            "department": CATEGORY_TAXONOMY.get(c_name, {}).get("category", "Roads & Potholes"),
            "score": sc
        })
    candidate_categories.sort(key=lambda x: x["score"], reverse=True)

    subtype_key = CLASS_TO_SUBTYPE.get(predicted_class, "POTHOLE")
    subtype_info = SUBTYPE_TAXONOMY.get(subtype_key, {})
    dept_cat = subtype_info.get("department", CATEGORY_TAXONOMY.get(predicted_class, {}).get("category", "Roads & Potholes"))
    yolo_obj = subtype_info.get("yolo_object", predicted_class if predicted_class in CANONICAL_CLASSES else None)

    # Calibrated confidence calculation (Strictly bounded between 0.10 and 0.88, NEVER 1.0)
    if status == "UNINFORMATIVE_OR_EMPTY":
        conf = 0.10
    elif class_hits and predicted_class in class_hits:
        hit_cnt = class_hits[predicted_class]
        base_text_conf = min(0.82, 0.60 + 0.07 * min(3, hit_cnt))
        if is_uncertain:
            base_text_conf = max(0.35, base_text_conf - 0.20)
        if is_negated:
            base_text_conf = max(0.20, base_text_conf - 0.35)
        
        if visual_available and (visual_class == predicted_class or CATEGORY_TAXONOMY.get(visual_class, {}).get("category") == dept_cat):
            conf = min(0.88, round(0.50 * visual_conf + 0.50 * base_text_conf, 2))
        else:
            conf = round(base_text_conf, 2)
    elif visual_available:
        conf = min(0.85, round(visual_conf, 2))
    else:
        conf = 0.40

    return {
        "predicted_category": predicted_class,
        "issue_subtype": subtype_key,
        "municipal_department": dept_cat,
        "yolo_object": yolo_obj,
        "confidence": round(conf, 2),
        "candidate_categories": candidate_categories,
        "category_scores": category_scores,
        "classification_method": method,
        "supporting_evidence": {
            "detected_language": detected_lang,
            "matched_keywords": matched_evidence,
            "is_negated": is_negated,
            "is_uncertain": is_uncertain,
            "multiple_issues_mentioned": len(class_hits) > 1,
            "visual_corroborated": (visual_class == predicted_class) if visual_available else None,
            "visual_confidence": visual_conf if visual_available else None
        },
        "requires_manual_review": requires_review,
        "classification_status": status
    }
