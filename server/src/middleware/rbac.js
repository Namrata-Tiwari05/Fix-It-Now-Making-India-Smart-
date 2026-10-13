export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Role '${req.user.role}' is not authorized for this resource. Required: [${roles.join(', ')}]`
        }
      });
    }

    next();
  };
};

export const requireMunicipality = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }

  // Master admin has global view access
  if (req.user.role === 'master_admin') {
    return next();
  }

  if (req.user.role === 'municipal_admin' || req.user.role === 'field_officer') {
    if (!req.user.municipality_id) {
      return res.status(403).json({
        success: false,
        error: { code: 'NO_MUNICIPALITY_ASSIGNED', message: 'User is not associated with any Municipal Corporation.' }
      });
    }

    // Prevent unauthorized cross-municipality data access
    const requestedMuni = req.query.municipality_id || req.body?.municipality_id;
    if (requestedMuni && requestedMuni !== req.user.municipality_id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN_CROSS_MUNICIPALITY', message: 'Access denied: You are not authorized to view or modify records belonging to another Municipal Corporation.' }
      });
    }
  }

  next();
};
