const express = require('express');
const router = express.Router();
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { sql } = require('../database/connection');
const { generateToken, generateApiKey, createRateLimiter } = require('../middleware/auth');
const { asyncHandler, validateRequest } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Rate limiting
const authLimiter = createRateLimiter(10, 15 * 60 * 1000); // 10 requests per 15 minutes

// Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(100).required(),
  password: Joi.string().min(8).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const googleAuthSchema = Joi.object({
  token: Joi.string().required()
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
});

// POST /api/auth/register - User registration
router.post('/register',
  authLimiter,
  validateRequest(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, name, password } = req.validatedBody;
    
    try {
      // Check if user already exists
      const existingUser = await sql`
        SELECT id FROM users WHERE email = ${email}
      `;

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'User already exists'
        });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Generate API key
      const apiKey = generateApiKey();

      // Create user
      const result = await sql`
        INSERT INTO users (email, name, api_key, created_at, updated_at)
        VALUES (${email}, ${name}, ${apiKey}, NOW(), NOW())
        RETURNING id, email, name, is_admin, subscription_status, subscription_plan
      `;

      const user = result.rows[0];

      // Generate JWT token
      const token = generateToken(user.id);
      const refreshToken = generateToken(user.id, '30d');

      logger.info(`New user registered: ${email}`);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            isAdmin: user.is_admin,
            subscriptionStatus: user.subscription_status,
            subscriptionPlan: user.subscription_plan
          },
          token,
          refreshToken,
          apiKey
        }
      });
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  })
);

// POST /api/auth/login - User login
router.post('/login',
  authLimiter,
  validateRequest(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.validatedBody;
    
    try {
      // Get user with password
      const result = await sql`
        SELECT id, email, name, password, is_admin, subscription_status, subscription_plan
        FROM users WHERE email = ${email}
      `;

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      const user = result.rows[0];

      // Check if user has password (Google OAuth users might not have password)
      if (!user.password) {
        return res.status(401).json({
          success: false,
          error: 'Please use Google OAuth to login'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Generate tokens
      const token = generateToken(user.id);
      const refreshToken = generateToken(user.id, '30d');

      // Update last login
      await sql`
        UPDATE users SET updated_at = NOW() WHERE id = ${user.id}
      `;

      logger.info(`User logged in: ${email}`);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            isAdmin: user.is_admin,
            subscriptionStatus: user.subscription_status,
            subscriptionPlan: user.subscription_plan
          },
          token,
          refreshToken
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  })
);

// POST /api/auth/google - Google OAuth authentication
router.post('/google',
  authLimiter,
  validateRequest(googleAuthSchema),
  asyncHandler(async (req, res) => {
    const { token } = req.validatedBody;
    
    try {
      // Verify Google token
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      const { email, name, picture, sub: googleId } = payload;

      // Check if user exists
      let result = await sql`
        SELECT id, email, name, is_admin, subscription_status, subscription_plan
        FROM users WHERE google_id = ${googleId} OR email = ${email}
      `;

      let user;

      if (result.rows.length > 0) {
        // Update existing user
        user = result.rows[0];
        await sql`
          UPDATE users 
          SET name = ${name}, avatar_url = ${picture}, google_id = ${googleId}, updated_at = NOW()
          WHERE id = ${user.id}
        `;
      } else {
        // Create new user
        const apiKey = generateApiKey();
        result = await sql`
          INSERT INTO users (email, name, avatar_url, google_id, api_key, created_at, updated_at)
          VALUES (${email}, ${name}, ${picture}, ${googleId}, ${apiKey}, NOW(), NOW())
          RETURNING id, email, name, is_admin, subscription_status, subscription_plan
        `;
        user = result.rows[0];

        logger.info(`New Google OAuth user: ${email}`);
      }

      // Generate tokens
      const jwtToken = generateToken(user.id);
      const refreshToken = generateToken(user.id, '30d');

      res.json({
        success: true,
        message: 'Google authentication successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: picture,
            isAdmin: user.is_admin,
            subscriptionStatus: user.subscription_status,
            subscriptionPlan: user.subscription_plan
          },
          token: jwtToken,
          refreshToken
        }
      });
    } catch (error) {
      logger.error('Google OAuth error:', error);
      return res.status(401).json({
        success: false,
        error: 'Invalid Google token'
      });
    }
  })
);

// POST /api/auth/refresh - Refresh JWT token
router.post('/refresh',
  validateRequest(refreshTokenSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.validatedBody;
    
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      
      // Get user
      const result = await sql`
        SELECT id, email, name, is_admin, subscription_status, subscription_plan
        FROM users WHERE id = ${decoded.userId}
      `;

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid refresh token'
        });
      }

      const user = result.rows[0];

      // Generate new tokens
      const newToken = generateToken(user.id);
      const newRefreshToken = generateToken(user.id, '30d');

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: newToken,
          refreshToken: newRefreshToken
        }
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }
  })
);

// GET /api/auth/me - Get current user
router.get('/me',
  asyncHandler(async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const result = await sql`
        SELECT id, email, name, avatar_url, is_admin, subscription_status, subscription_plan, created_at
        FROM users WHERE id = ${decoded.userId}
      `;

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token'
        });
      }

      const user = result.rows[0];

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatar_url,
            isAdmin: user.is_admin,
            subscriptionStatus: user.subscription_status,
            subscriptionPlan: user.subscription_plan,
            createdAt: user.created_at
          }
        }
      });
    } catch (error) {
      logger.error('Get current user error:', error);
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
  })
);

// POST /api/auth/logout - User logout
router.post('/logout',
  asyncHandler(async (req, res) => {
    // In a stateless JWT system, logout is handled client-side
    // But we can log the logout event
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        logger.info(`User logged out: ${decoded.userId}`);
      } catch (error) {
        // Token might be expired, which is fine for logout
      }
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });
  })
);

// POST /api/auth/change-password - Change password
router.post('/change-password',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user with password
      const result = await sql`
        SELECT id, email, password FROM users WHERE id = ${decoded.userId}
      `;

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token'
        });
      }

      const user = result.rows[0];

      // Check if user has password
      if (!user.password) {
        return res.status(400).json({
          success: false,
          error: 'Password change not available for OAuth users'
        });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await sql`
        UPDATE users SET password = ${hashedPassword}, updated_at = NOW() WHERE id = ${user.id}
      `;

      logger.info(`Password changed for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Change password error:', error);
      throw error;
    }
  })
);

// POST /api/auth/regenerate-api-key - Regenerate API key
router.post('/regenerate-api-key',
  asyncHandler(async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Generate new API key
      const newApiKey = generateApiKey();

      // Update user
      const result = await sql`
        UPDATE users SET api_key = ${newApiKey}, updated_at = NOW() WHERE id = ${decoded.userId}
        RETURNING id, email
      `;

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token'
        });
      }

      logger.info(`API key regenerated for user: ${result.rows[0].email}`);

      res.json({
        success: true,
        message: 'API key regenerated successfully',
        data: {
          apiKey: newApiKey
        }
      });
    } catch (error) {
      logger.error('Regenerate API key error:', error);
      throw error;
    }
  })
);

module.exports = router;
