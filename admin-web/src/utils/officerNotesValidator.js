/**
 * FixItNow — Field Officer Resolution Notes & Defect Congruence Validator
 * Ensures officer notes are non-gibberish and describe actions matching the assigned complaint.
 */

const QWERTY_SEQUENCES = [
  'qwerty', 'wertyu', 'ertyui', 'rtyuio', 'tyuiop',
  'asdfgh', 'sdfghj', 'dfghjk', 'fghjkl',
  'zxcvbn', 'xcvbnm',
  '123456', '234567', '345678', '456789', '567890'
];

const GENERIC_USELESS = [
  'done', 'fixed', 'completed', 'ok done', 'work done', 'repaired', 'theek hai',
  'ho gaya', 'done sir', 'test', 'testing', 'solved', 'fine'
];

const DEFECT_SPECIFIC_NOUNS = {
  open_manhole: [
    'manhole', 'cover', 'covering', 'lid', 'cast iron', 'chamber',
    'sewer', 'drain', 'drainage', 'dhakkan', 'slab', 'gutter',
    'lohe ka dhakkan', 'jaali', 'grill', 'frame', 'मैनहोल', 'ढक्कन', 'कवर', 'सीवर', 'चेंबर', 'नाली'
  ],
  garbage_litter: [
    'garbage', 'trash', 'waste', 'litter', 'dump', 'dumping', 'dustbin',
    'bin', 'tipper', 'loader', 'kachra', 'kachre', 'kuda', 'safai',
    'dumping ground', 'swachh', 'nagar nigam gaadi', 'कचरा', 'कूड़ा', 'सफाई', 'कचरा वाहन'
  ],
  pothole: [
    'pothole', 'potholes', 'crater', 'pit', 'patch', 'bitumen', 'asphalt',
    'cold mix', 'hot mix', 'tar', 'gaddha', 'gaddhe', 'gadde', 'damar',
    'dāmar', 'गड्ढा', 'गड्ढे', 'डामर', 'तारकोल'
  ],
  road_crack: [
    'crack', 'cracks', 'fissure', 'crevice', 'sealant', 'joint', 'darar',
    'daraar', 'दरार', 'दरारें'
  ],
  surface_erosion: [
    'erosion', 'eroded', 'surface', 'gravel', 'moram', 'overlay', 'regraded',
    'kataw', 'sadak kataw', 'कटाव', 'सतह'
  ],
  stagnant_water: [
    'waterlogging', 'waterlogged', 'stagnant', 'flood', 'flooding', 'drainage',
    'suction', 'super sucker', 'pump', 'pipe', 'pipeline', 'paani', 'pani',
    'jalbharao', 'jal jamao', 'जलभराव', 'जल जमाव'
  ],
  fault_streetlight: [
    'streetlight', 'street light', 'lamp', 'bulb', 'led', 'fixture',
    'pole', 'wiring', 'wire', 'choke', 'fuse', 'phase', 'cable',
    'batti', 'khamba', 'taar', 'रोशनी', 'लाइट', 'स्ट्रीट लाइट', 'बल्ब', 'बत्ती', 'खंभा', 'तार'
  ]
};

const CLASS_DISPLAY = {
  pothole: 'Pothole',
  road_crack: 'Road Crack',
  surface_erosion: 'Surface Erosion',
  garbage_litter: 'Garbage Accumulation',
  stagnant_water: 'Stagnant Water / Waterlogging',
  open_manhole: 'Open Manhole',
  fault_streetlight: 'Faulty Streetlight'
};

export function inferDefectFromTask(task) {
  if (!task) return 'pothole';
  if (task.target_class && DEFECT_SPECIFIC_NOUNS[task.target_class]) {
    return task.target_class;
  }
  const text = `${task.category || ''} ${task.description || ''}`.toLowerCase();
  if (/\b(manhole|dhakkan|sewer cover|drain cover)\b/i.test(text)) return 'open_manhole';
  if (/\b(waterlogging|waterlogged|stagnant|paani|jal)\b/i.test(text)) return 'stagnant_water';
  if (/\b(garbage|kachra|waste|trash|dump|safai)\b/i.test(text)) return 'garbage_litter';
  if (/\b(streetlight|street light|bulb|pole|khamba|batti)\b/i.test(text)) return 'fault_streetlight';
  if (/\b(crack|darar)\b/i.test(text)) return 'road_crack';
  if (/\b(erosion|kataw)\b/i.test(text)) return 'surface_erosion';
  return 'pothole';
}

export function validateOfficerResolutionNotes(notes, task) {
  if (!notes || typeof notes !== 'string' || !notes.trim()) {
    return {
      isValid: false,
      code: 'MISSING_NOTES',
      reason: 'Please describe the engineering repairs or actions completed on ground.'
    };
  }

  const clean = notes.trim();
  const lower = clean.toLowerCase();

  // 1. Alphanumeric gibberish tokens (e.g. 'et54t5')
  const words = lower.match(/[a-zA-Z0-9\u0900-\u097F]+/g) || [];
  for (const w of words) {
    if (/[a-z]+[0-9]+[a-z]+/i.test(w) || /[0-9]+[a-z]+[0-9]+/i.test(w)) {
      return {
        isValid: false,
        code: 'ALPHANUMERIC_GIBBERISH',
        reason: `Notes contain meaningless random characters ('${w}'). Please enter genuine repair details.`
      };
    }
    if (/^[a-z]+$/i.test(w) && w.length >= 5 && /[bcdfghjklmnpqrstvwxz]{5,}/i.test(w)) {
      return {
        isValid: false,
        code: 'CONSONANT_GIBBERISH',
        reason: `Notes contain unnatural character sequence ('${w}'). Please enter valid words.`
      };
    }
  }

  // 2. Minimum length
  if (clean.length < 8) {
    return {
      isValid: false,
      code: 'TOO_SHORT_NOTES',
      reason: `Description is too brief ('${clean}'). Please describe specific engineering actions taken on site.`
    };
  }

  // 3. Keyboard mash
  for (const seq of QWERTY_SEQUENCES) {
    if (lower.includes(seq)) {
      return {
        isValid: false,
        code: 'GIBBERISH_KEYBOARD_MASH',
        reason: `Description contains keyboard mash sequence ('${seq}'). Please enter authentic repair notes.`
      };
    }
  }

  // 4. Repeated characters
  if (/(.)\1{3,}/.test(lower)) {
    return {
      isValid: false,
      code: 'REPEATED_CHARS',
      reason: 'Description contains excessive repetitive characters. Please enter genuine repair notes.'
    };
  }

  // 5. Generic useless notes
  if (GENERIC_USELESS.includes(lower) || (words.length <= 2 && words.every(w => ['done', 'fixed', 'ok', 'sir', 'work', 'theek', 'hai', 'gaya', 'completed'].includes(w)))) {
    return {
      isValid: false,
      code: 'GENERIC_NON_DESCRIPTIVE_NOTES',
      reason: `Description is too vague ('${clean}'). Please describe the specific engineering actions or materials used.`
    };
  }

  // 6. Target defect matching
  const targetDefect = inferDefectFromTask(task);
  const targetNouns = DEFECT_SPECIFIC_NOUNS[targetDefect] || [];
  const defectNameClean = CLASS_DISPLAY[targetDefect] || targetDefect;

  const hasTargetNoun = targetNouns.some(n => new RegExp(`\\b${n}\\b`, 'i').test(lower));

  // Check for presence of conflicting defect nouns
  let conflictFound = null;
  for (const [otherDefect, otherNouns] of Object.entries(DEFECT_SPECIFIC_NOUNS)) {
    if (otherDefect === targetDefect) continue;
    if (['pothole', 'road_crack', 'surface_erosion'].includes(targetDefect) && ['pothole', 'road_crack', 'surface_erosion'].includes(otherDefect)) {
      continue;
    }
    for (const on of otherNouns) {
      if (new RegExp(`\\b${on}\\b`, 'i').test(lower)) {
        conflictFound = { className: CLASS_DISPLAY[otherDefect] || otherDefect, word: on };
        break;
      }
    }
    if (conflictFound) break;
  }

  if (conflictFound && !hasTargetNoun) {
    return {
      isValid: false,
      code: 'RESOLUTION_DESCRIPTION_MISMATCH',
      reason: `Repair notes describe ${conflictFound.className} ('${conflictFound.word}'), which does NOT match the assigned defect (${defectNameClean}). Please describe the repair of ${defectNameClean}.`
    };
  }

  if (!hasTargetNoun) {
    const origWords = ((task?.description || '') + ' ' + (task?.category || '')).toLowerCase().match(/[a-zA-Z0-9\u0900-\u097F]+/g) || [];
    const significant = origWords.filter(w => w.length >= 4);
    const hasOrigMatch = significant.some(ow => new RegExp(`\\b${ow}\\b`, 'i').test(lower));
    if (!hasOrigMatch) {
      return {
        isValid: false,
        code: 'RESOLUTION_DESCRIPTION_MISMATCH',
        reason: `Repair notes do not describe actions resolving '${defectNameClean}'. Please describe specific repair work done for ${defectNameClean}.`
      };
    }
  }

  return {
    isValid: true,
    code: 'VALID_RESOLUTION_NOTES',
    reason: `Repair notes match assigned defect '${defectNameClean}'.`
  };
}

