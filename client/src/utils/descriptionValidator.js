/**
 * Client-Side Description & Civic Intent Validator
 * Fast synchronous pre-check to reject meaningless random strings,
 * keyboard mashes, and non-civic text before moving to subsequent steps.
 */

const QWERTY_SEQUENCES = [
  'qwerty', 'wertyu', 'ertyui', 'rtyuio', 'tyuiop',
  'asdfgh', 'sdfghj', 'dfghjk', 'fghjkl',
  'zxcvbn', 'xcvbnm',
  '123456', '234567', '345678', '456789', '567890',
  'poiuyt', 'lkjhgf', 'mnbvcx', '654321', '098765'
];

const CIVIC_KEYWORDS = [
  'pothole', 'gaddha', 'gadde', 'crater', 'road', 'sadak', 'street', 'highway',
  'lane', 'footpath', 'sidewalk', 'pavement', 'crack', 'fissure', 'broken', 'damaged',
  'erosion', 'asphalt', 'bitumen', 'divider', 'garbage', 'litter', 'waste', 'trash',
  'dump', 'dustbin', 'bin', 'kachra', 'gandagi', 'debris', 'manhole', 'drain', 'sewer',
  'sewage', 'naali', 'nali', 'dhakkan', 'chamber', 'gutter', 'waterlogging', 'flooding',
  'waterlogged', 'stagnant', 'water', 'paani', 'pani', 'leak', 'pipe', 'pipeline',
  'streetlight', 'light', 'lamp', 'bulb', 'pole', 'khamba', 'batti', 'bijli', 'andhera'
];

const HINDI_DEVANAGARI_WORDS = [
  'सड़क', 'कचरा', 'गड्ढा', 'गड्ढे', 'पानी', 'नाली', 'लाइट', 'बिजली', 'खराब', 'टूटा',
  'गंदगी', 'जाम', 'जल', 'सीवर', 'पोल', 'खंभा', 'मैनहोल', 'ढक्कन', 'अंधेरा', 'कूड़ा'
];

export function validateCitizenDescription(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      isValid: false,
      errorCode: 'EMPTY_DESCRIPTION',
      reason: 'Please enter a description of the civic problem.'
    };
  }

  const clean = rawText.trim();
  if (clean.length < 6) {
    return {
      isValid: false,
      errorCode: 'TOO_SHORT',
      reason: 'Description is too short. Please describe the problem in more detail.'
    };
  }

  const lower = clean.toLowerCase();

  // 1. Keyboard mash check
  for (const seq of QWERTY_SEQUENCES) {
    if (lower.includes(seq)) {
      return {
        isValid: false,
        errorCode: 'KEYBOARD_MASH',
        reason: `Description contains random typing sequence ('${seq}'). Please enter an authentic civic complaint.`
      };
    }
  }

  // 2. Repeated characters
  if (/(.)\1{3,}/.test(lower)) {
    return {
      isValid: false,
      errorCode: 'REPEATED_CHARS',
      reason: 'Description contains excessive repetitive characters. Please describe the actual issue.'
    };
  }

  // 3. Meaningless alphanumeric tokens like 'et54t5', 'a1b2c3'
  const words = lower.match(/[a-zA-Z0-9\u0900-\u097F]+/g) || [];
  for (const w of words) {
    if (/[a-z]+[0-9]+[a-z]+/i.test(w) || /[0-9]+[a-z]+[0-9]+/i.test(w)) {
      return {
        isValid: false,
        errorCode: 'ALPHANUMERIC_GIBBERISH',
        reason: `Description contains meaningless random token '${w}'. Please provide an authentic civic complaint.`
      };
    }
    if (/^[a-z]+$/i.test(w) && w.length >= 5 && /[bcdfghjklmnpqrstvwxz]{5,}/i.test(w)) {
      return {
        isValid: false,
        errorCode: 'CONSONANT_GIBBERISH',
        reason: `Description contains unnatural character sequence '${w}'. Please enter valid words.`
      };
    }
  }

  // 4. Civic domain relevance
  const hasDevanagari = /[\u0900-\u097F]/.test(clean);
  let hasCivicTerm = CIVIC_KEYWORDS.some(k => new RegExp(`\\b${k}\\b`, 'i').test(lower));
  if (hasDevanagari && HINDI_DEVANAGARI_WORDS.some(h => clean.includes(h))) {
    hasCivicTerm = true;
  }

  if (words.length < 2 && !hasCivicTerm) {
    return {
      isValid: false,
      errorCode: 'INSUFFICIENT_WORDS',
      reason: 'Description must contain clear details about the civic defect.'
    };
  }

  if (!hasCivicTerm) {
    return {
      isValid: false,
      errorCode: 'NON_CIVIC_TEXT',
      reason: 'Description does not describe a municipal civic defect (e.g. pothole, garbage dump, broken streetlight, open manhole, waterlogging).'
    };
  }

  return {
    isValid: true,
    errorCode: null,
    reason: 'Valid civic complaint description.'
  };
}
