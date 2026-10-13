import { db } from '../db/index.js';

export const pincodeRoutingService = {
  /**
   * Resolves the authoritative Municipal Corporation from the Problem Location PIN Code.
   * Deterministic server-side routing rule.
   * @param {string} pincode 
   * @returns {object}
   */
  resolveMunicipality(pincode) {
    if (!pincode) {
      return {
        is_mapped: false,
        is_routing_review: true,
        reason: 'Problem Location PIN Code was not provided.'
      };
    }

    const cleanPin = String(pincode).trim();
    // Validate format: 6-digit numeric
    const pinRegex = /^[1-9][0-9]{5}$/;
    if (!pinRegex.test(cleanPin)) {
      return {
        is_mapped: false,
        is_routing_review: true,
        pincode: cleanPin,
        reason: 'Invalid PIN Code format. Must be a 6-digit valid postal code.'
      };
    }

    const match = db.findMunicipalityByPincode(cleanPin);

    if (match) {
      return {
        is_mapped: true,
        is_routing_review: false,
        pincode: cleanPin,
        municipality_id: match.municipality_id,
        municipality_name: match.municipality_name,
        municipality_code: match.municipality_code,
        state: match.state,
        district: match.district,
        ward_id: match.ward_id,
        ward_name: match.ward_name,
        locality_name: match.locality_name
      };
    }

    // Unmapped PIN enters the routing-review queue instead of being silently misrouted
    return {
      is_mapped: false,
      is_routing_review: true,
      pincode: cleanPin,
      municipality_id: null,
      municipality_name: 'Unassigned (Routing Review)',
      reason: `PIN Code ${cleanPin} is currently not registered under any active Municipal Corporation in FixItNow.`
    };
  }
};
