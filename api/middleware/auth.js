const jwt = require('jsonwebtoken');
const { sql } = require('../database/connection');
const logger = require('../utils/logger');

// JWT token verification middleware
async function verifyToken(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.headers['x-api-key'] ||
                  req.query.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const result = await sql`
      SELECT id, email, name, is_admin, subscription_status, subscription_plan
      FROM users 
      WHERE id = ${decoded.userId}
    `;

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    logger.error('Token verification error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
}

// API key verification middleware
async function verifyApiKey(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'] || 
                   req.query.api_key ||
                   req.body.api_key;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required'
      });
    }

    // Check if it's a user API key
    let result = await sql`
      SELECT id, email, name, is_admin, subscription_status, subscription_plan
      FROM users 
      WHERE api_key = ${apiKey}
    `;

    if (result.rows.length > 0) {
      req.user = result.rows[0];
      return next();
    }

    // Check if it's a website API key
    result = await sql`
      SELECT w.id, w.name, w.url, w.user_id, u.email, u.name, u.is_admin
      FROM websites w
      JOIN users u ON w.user_id = u.id
      WHERE w.api_key = ${apiKey} AND w.is_active = true
    `;

    if (result.rows.length > 0) {
      req.website = result.rows[0];
      req.user = {
        id: result.rows[0].user_id,
        email: result.rows[0].email,
        name: result.rows[0].name,
        is_admin: result.rows[0].is_admin
      };
      return next();
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
  } catch (error) {
    logger.error('API key verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
}

// Admin access middleware
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  next();
}

// Subscription plan middleware
function requirePlan(requiredPlan) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userPlan = req.user.subscription_plan || 'free';
    const planHierarchy = {
      'free': 0,
      'basic': 1,
      'pro': 2,
      'enterprise': 3
    };

    if (planHierarchy[userPlan] < planHierarchy[requiredPlan]) {
      return res.status(403).json({
        success: false,
        error: `${requiredPlan} plan required`,
        currentPlan: userPlan,
        requiredPlan: requiredPlan
      });
    }

    next();
  };
}

// Rate limiting middleware
function createRateLimiter(maxRequests, windowMs) {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.user?.id || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!requests.has(key)) {
      requests.set(key, []);
    }

    const userRequests = requests.get(key);
    const recentRequests = userRequests.filter(timestamp => timestamp > windowStart);

    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    recentRequests.push(now);
    requests.set(key, recentRequests);

    next();
  };
}

// Website ownership middleware
async function requireWebsiteOwnership(req, res, next) {
  try {
    const websiteId = req.params.websiteId || req.body.websiteId;
    
    if (!websiteId) {
      return res.status(400).json({
        success: false,
        error: 'Website ID required'
      });
    }

    const result = await sql`
      SELECT id, name, url, user_id
      FROM websites 
      WHERE id = ${websiteId} AND user_id = ${req.user.id}
    `;

    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Website access denied'
      });
    }

    req.website = result.rows[0];
    next();
  } catch (error) {
    logger.error('Website ownership verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authorization error'
    });
  }
}

// Optional authentication middleware
async function optionalAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.headers['x-api-key'] ||
                  req.query.token;

    if (!token) {
      return next();
    }

    // Try to verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const result = await sql`
      SELECT id, email, name, is_admin, subscription_status, subscription_plan
      FROM users 
      WHERE id = ${decoded.userId}
    `;

    if (result.rows.length > 0) {
      req.user = result.rows[0];
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
}

// Generate JWT token
function generateToken(userId, expiresIn = '7d') {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn }
  );
}

// Generate API key
function generateApiKey() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  verifyToken,
  verifyApiKey,
  requireAdmin,
  requirePlan,
  createRateLimiter,
  requireWebsiteOwnership,
  optionalAuth,
  generateToken,
  generateApiKey
};
