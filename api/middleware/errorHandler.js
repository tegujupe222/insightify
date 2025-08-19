const logger = require('../utils/logger');

// Error handler middleware
function errorHandler(err, req, res, next) {
  // Log the error
  logger.logError(err, req);

  // Default error response
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details = null;

  // Handle different types of errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = err.details || err.message;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Not Found';
  } else if (err.name === 'ConflictError') {
    statusCode = 409;
    message = 'Conflict';
  } else if (err.name === 'RateLimitError') {
    statusCode = 429;
    message = 'Too Many Requests';
  } else if (err.code === '23505') { // PostgreSQL unique constraint violation
    statusCode = 409;
    message = 'Resource already exists';
  } else if (err.code === '23503') { // PostgreSQL foreign key constraint violation
    statusCode = 400;
    message = 'Invalid reference';
  } else if (err.code === '42P01') { // PostgreSQL undefined table
    statusCode = 500;
    message = 'Database configuration error';
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Service temporarily unavailable';
  } else if (err.code === 'ENOTFOUND') {
    statusCode = 503;
    message = 'External service unavailable';
  }

  // Create error response
  const errorResponse = {
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // Add details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.details = details || err.message;
    errorResponse.stack = err.stack;
  }

  // Add request ID if available
  if (req.id) {
    errorResponse.requestId = req.id;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
}

// Async error wrapper
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Custom error classes
class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

class NotFoundError extends Error {
  constructor(message = 'Not Found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends Error {
  constructor(message = 'Conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

class RateLimitError extends Error {
  constructor(message = 'Too Many Requests') {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Request validation middleware
function validateRequest(schema) {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body);
      
      if (error) {
        throw new ValidationError('Request validation failed', error.details);
      }
      
      req.validatedBody = value;
      next();
    } catch (err) {
      next(err);
    }
  };
}

// Query validation middleware
function validateQuery(schema) {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.query);
      
      if (error) {
        throw new ValidationError('Query validation failed', error.details);
      }
      
      req.validatedQuery = value;
      next();
    } catch (err) {
      next(err);
    }
  };
}

// Params validation middleware
function validateParams(schema) {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.params);
      
      if (error) {
        throw new ValidationError('Parameter validation failed', error.details);
      }
      
      req.validatedParams = value;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  errorHandler,
  asyncHandler,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  validateRequest,
  validateQuery,
  validateParams
};
