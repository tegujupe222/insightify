const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// POST /api/webhooks/stripe - Stripe webhook
router.post('/stripe',
  asyncHandler(async (req, res) => {
    try {
      const event = req.body;
      
      logger.info(`Stripe webhook received: ${event.type}`);
      
      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          // Handle successful payment
          break;
        case 'customer.subscription.created':
          // Handle subscription creation
          break;
        case 'customer.subscription.updated':
          // Handle subscription update
          break;
        case 'customer.subscription.deleted':
          // Handle subscription cancellation
          break;
        default:
          logger.info(`Unhandled Stripe event type: ${event.type}`);
      }
      
      res.json({ received: true });
    } catch (error) {
      logger.error('Error processing Stripe webhook:', error);
      res.status(400).json({ error: 'Webhook processing failed' });
    }
  })
);

module.exports = router;
