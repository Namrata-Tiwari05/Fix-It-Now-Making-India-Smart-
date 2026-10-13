import { Router } from 'express';
import { successResponse, errorResponse } from '../utils/response.js';

const router = Router();

/**
 * GET /api/location/reverse-geocode?lat=...&lng=...
 * Reverse geocode geographical coordinates to PIN, state, district, and address
 */
router.get('/reverse-geocode', async (req, res, next) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return errorResponse(res, 'Latitude and Longitude are required.', 'MISSING_COORDINATES', 400);
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return errorResponse(res, 'Invalid numerical coordinates provided.', 'INVALID_COORDINATES', 400);
    }

    // 1. Primary: Query OpenStreetMap Nominatim with custom User-Agent
    try {
      const osmRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'FixItNowCivicDispatch/1.0 (support@fixitnow.org)'
          }
        }
      );

      if (osmRes.ok) {
        const osmData = await osmRes.json();
        const addr = osmData.address || {};

        const pincode = addr.postcode ? addr.postcode.replace(/\D/g, '').slice(0, 6) : '';
        const state = addr.state || '';
        const district = addr.state_district || addr.county || addr.city || addr.town || addr.district || '';
        const street = [addr.road, addr.suburb, addr.neighbourhood, addr.residential].filter(Boolean).join(', ');
        const landmark = addr.amenity || addr.building || addr.commercial || addr.shop || addr.place || '';

        if (pincode || state || district) {
          return successResponse(res, {
            pincode,
            state,
            district,
            address: street || osmData.display_name?.split(',').slice(0, 3).join(', ') || '',
            landmark,
            lat: latitude,
            lng: longitude,
            provider: 'osm_nominatim'
          }, 'Location reverse-geocoded successfully');
        }
      }
    } catch (osmErr) {
      console.warn('[Location Reverse Geocode Nominatim error]', osmErr.message);
    }

    // 2. Fallback: Query BigDataCloud reverse geocode client API
    try {
      const bdcRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );

      if (bdcRes.ok) {
        const bdcData = await bdcRes.json();
        const pincode = bdcData.postcode ? bdcData.postcode.replace(/\D/g, '').slice(0, 6) : '';
        const state = bdcData.principalSubdivision || '';
        const district = bdcData.localityInfo?.administrative?.[2]?.name || bdcData.city || bdcData.locality || '';
        const street = [bdcData.locality, bdcData.city].filter(Boolean).join(', ');

        return successResponse(res, {
          pincode,
          state,
          district,
          address: street || '',
          landmark: '',
          lat: latitude,
          lng: longitude,
          provider: 'bigdatacloud'
        }, 'Location reverse-geocoded successfully');
      }
    } catch (bdcErr) {
      console.warn('[Location Reverse Geocode BDC error]', bdcErr.message);
    }

    return errorResponse(res, 'Could not resolve address details for the given coordinates.', 'GEOCODE_FAILED', 502);
  } catch (err) {
    next(err);
  }
});

export default router;
