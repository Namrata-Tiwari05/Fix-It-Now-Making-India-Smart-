import { errorResponse } from '../utils/response.js';

export const errorHandler = (err, req, res, next) => {
  console.error('[Unhandled Error]', err);

  if (err.name === 'ZodError') {
    return errorResponse(res, 'Validation error', 'VALIDATION_ERROR', 422, err.errors);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const code = err.code || 'INTERNAL_ERROR';

  return errorResponse(res, message, code, statusCode);
};
