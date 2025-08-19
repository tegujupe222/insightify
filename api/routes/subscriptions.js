const express = require('express');
const router = express.Router();
const { sql } = require('../database/connection');
const { verifyToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// GET /api/subscriptions/pricing - Get pricing plans
router.get('/pricing',
  asyncHandler(async (req, res) => {
    const plans = [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        currency: 'JPY',
        features: ['1 website', '1,000 page views/month', 'Basic analytics', 'Email support']
      },
      {
        id: 'basic',
        name: 'Basic',
        price: 2000,
        currency: 'JPY',
        features: ['5 websites', '10,000 page views/month', 'Advanced analytics', 'Heatmaps', 'Email support']
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 5000,
        currency: 'JPY',
        features: ['Unlimited websites', '100,000 page views/month', 'All features', 'A/B testing', 'Priority support']
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 15000,
        currency: 'JPY',
        features: ['Unlimited everything', 'Custom integrations', 'Dedicated support', 'SLA guarantee']
      }
    ];
    
    res.json({
      success: true,
      data: { plans }
    });
  })
);

// GET /api/subscriptions/status - Get user subscription status
router.get('/status',
  verifyToken,
  asyncHandler(async (req, res) => {
    try {
      const result = await sql`
        SELECT subscription_status, subscription_plan, subscription_expires_at
        FROM users WHERE id = ${req.user.id}
      `;
      
      const subscription = result.rows[0];
      
      res.json({
        success: true,
        data: {
          status: subscription.subscription_status,
          plan: subscription.subscription_plan,
          expiresAt: subscription.subscription_expires_at
        }
      });
    } catch (error) {
      logger.error('Error getting subscription status:', error);
      throw error;
    }
  })
);

module.exports = router;
