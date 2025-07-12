import express from 'express';
import { PaymentService } from '../services/paymentService';
import { authenticateToken, requireUser } from '../middleware/auth';
import { ApiResponse } from '../types';

const router = express.Router();

// Create payment intent
router.post('/create-payment-intent', authenticateToken, requireUser, async (req, res) => {
  try {
    const { amount, currency = 'jpy' } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required'
      });
    }

    const paymentIntent = await PaymentService.createPaymentIntent(amount, currency);
    
    const response: ApiResponse = {
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      },
      message: 'Payment intent created successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment intent'
    });
  }
});

// Confirm payment
router.post('/confirm-payment', authenticateToken, requireUser, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    
    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment intent ID is required'
      });
    }

    const paymentIntent = await PaymentService.confirmPayment(paymentIntentId);
    
    const response: ApiResponse = {
      success: true,
      data: {
        status: paymentIntent.status,
        paymentIntentId: paymentIntent.id
      },
      message: 'Payment confirmed successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm payment'
    });
  }
});

// Create bank transfer payment
router.post('/bank-transfer', authenticateToken, requireUser, async (req, res) => {
  try {
    const { amount, customerId, description } = req.body;
    
    if (!amount || !customerId || !description) {
      return res.status(400).json({
        success: false,
        error: 'Amount, customer ID, and description are required'
      });
    }

    const result = await PaymentService.createBankTransferPayment(amount, customerId, description);
    
    const response: ApiResponse = {
      success: true,
      data: {
        paymentIntentId: result.paymentIntent.id,
        clientSecret: result.paymentIntent.client_secret,
        bankAccount: result.bankAccount
      },
      message: 'Bank transfer payment created successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Create bank transfer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create bank transfer payment'
    });
  }
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!endpointSecret) {
      console.error('Stripe webhook secret not configured');
      return res.status(400).json({ error: 'Webhook secret not configured' });
    }

    // Verify webhook signature
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    let event;
    
    try {
      event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Handle the event
    await PaymentService.handleWebhookEvent(event);
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Get payment methods for customer
router.get('/payment-methods/:customerId', authenticateToken, requireUser, async (req, res) => {
  try {
    const { customerId } = req.params;
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    });
    
    const response: ApiResponse = {
      success: true,
      data: paymentMethods.data,
      message: 'Payment methods retrieved successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment methods'
    });
  }
});

// Create customer
router.post('/customers', authenticateToken, requireUser, async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const customer = await PaymentService.createCustomer(email, name);
    
    const response: ApiResponse = {
      success: true,
      data: {
        customerId: customer.id,
        email: customer.email,
        name: customer.name
      },
      message: 'Customer created successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create customer'
    });
  }
});

export default router; 