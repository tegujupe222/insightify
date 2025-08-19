const express = require('express');
const router = express.Router();
const { sql } = require('../database/connection');
const { verifyToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// GET /api/payments/bank-info - Get bank transfer information
router.get('/bank-info',
  asyncHandler(async (req, res) => {
    const bankInfo = {
      bankName: process.env.BANK_NAME || '神戸信用金庫',
      branch: process.env.BANK_BRANCH || '本店',
      accountType: process.env.BANK_ACCOUNT_TYPE || '普通',
      accountNumber: process.env.BANK_ACCOUNT_NUMBER || '0726786',
      accountHolder: process.env.BANK_ACCOUNT_HOLDER || 'ｲｶﾞｻｷ ｺﾞｳﾀ'
    };
    
    res.json({
      success: true,
      data: bankInfo
    });
  })
);

// POST /api/payments/bank-transfer - Create bank transfer payment
router.post('/bank-transfer',
  verifyToken,
  asyncHandler(async (req, res) => {
    const { plan, amount } = req.body;
    
    try {
      const result = await sql`
        INSERT INTO payments (
          user_id, amount, currency, status, payment_method, created_at
        ) VALUES (
          ${req.user.id}, ${amount}, 'JPY', 'pending', 'bank_transfer', NOW()
        ) RETURNING id, amount, status, created_at
      `;
      
      const payment = result.rows[0];
      
      logger.info(`Bank transfer payment created: ${payment.id} for user ${req.user.email}`);
      
      res.status(201).json({
        success: true,
        message: 'Bank transfer payment created successfully',
        data: {
          paymentId: payment.id,
          amount: payment.amount,
          status: payment.status,
          bankInfo: {
            bankName: process.env.BANK_NAME,
            branch: process.env.BANK_BRANCH,
            accountType: process.env.BANK_ACCOUNT_TYPE,
            accountNumber: process.env.BANK_ACCOUNT_NUMBER,
            accountHolder: process.env.BANK_ACCOUNT_HOLDER
          }
        }
      });
    } catch (error) {
      logger.error('Error creating bank transfer payment:', error);
      throw error;
    }
  })
);

module.exports = router;
