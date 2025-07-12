import express from 'express';
import { PaymentService } from '../services/paymentService';
import { authenticateToken } from '../middleware/auth';
import { ApiResponse } from '../types';

const router = express.Router();

// Create bank transfer payment
router.post('/bank-transfer', authenticateToken, async (req, res) => {
  try {
    const { amount, description } = req.body;
    const userId = req.user!.userId;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    const payment = await PaymentService.createBankTransferPayment(
      amount,
      userId,
      description || 'Insightify Payment'
    );

    const response: ApiResponse = {
      success: true,
      data: payment,
      message: 'Bank transfer payment created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Bank transfer payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Create subscription for bank transfer
router.post('/subscription', authenticateToken, async (req, res) => {
  try {
    const { planType, amount } = req.body;
    const userId = req.user!.userId;

    if (!planType || !['monthly', 'yearly'].includes(planType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan type'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    const subscription = await PaymentService.createSubscription(userId, {
      userId,
      planType,
      amount
    });

    const response: ApiResponse = {
      success: true,
      data: subscription,
      message: 'Bank transfer subscription created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Subscription creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Create invoice for bank transfer
router.post('/invoice', authenticateToken, async (req, res) => {
  try {
    const { amount, description, metadata } = req.body;
    const userId = req.user!.userId;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    const invoice = await PaymentService.createInvoice(
      userId,
      amount,
      description || 'Insightify Invoice',
      metadata
    );

    const response: ApiResponse = {
      success: true,
      data: invoice,
      message: 'Bank transfer invoice created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Invoice creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get bank transfer information
router.get('/bank-info', async (req, res) => {
  try {
    const { getBankTransferInfo } = await import('../config/bankInfo');
    const bankInfo = getBankTransferInfo();

    const response: ApiResponse = {
      success: true,
      data: bankInfo,
      message: 'Bank transfer information retrieved successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Bank info error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router; 