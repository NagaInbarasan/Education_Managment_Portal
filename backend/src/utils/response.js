/**
 * Phazon Backend — Standardized API Response Helper
 */

'use strict';

function sendSuccess(res, data = null, message = 'Success', statusCode = 200, pagination = null) {
  const payload = {
    success: true,
    message,
    data,
  };
  if (pagination) payload.pagination = pagination;
  return res.status(statusCode).json(payload);
}

function sendError(res, message = 'Internal Server Error', statusCode = 500, errors = null) {
  const payload = {
    success: false,
    message,
  };
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
}

module.exports = {
  sendSuccess,
  sendError,
};
