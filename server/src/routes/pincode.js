import { Router } from 'express';
import { pincodeRoutingService } from '../services/routing/pincodeRouting.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = Router();

/**
 * GET /api/municipalities/by-pincode/:pincode
 * Server-side authoritative PIN lookup
 */
router.get('/:pincode', (req, res) => {
  const { pincode } = req.params;
  const result = pincodeRoutingService.resolveMunicipality(pincode);

  if (result.is_mapped) {
    return successResponse(res, result, 'Municipality identified');
  }

  return successResponse(res, result, 'Unmapped PIN: requires routing review', 200);
});

export default router;
