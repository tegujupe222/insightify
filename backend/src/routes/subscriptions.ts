import express from 'express';
import { SubscriptionController } from '../controllers/subscriptionController';
import { authenticateToken, requireAdmin, requireUser } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/pricing', SubscriptionController.getPricing);
router.get('/bank-transfer-info', SubscriptionController.getBankTransferInfo);

// User routes (authenticated)
router.get('/user', authenticateToken, requireUser, SubscriptionController.getUserSubscription);
router.post('/upgrade', authenticateToken, requireUser, SubscriptionController.requestUpgrade);

// Admin routes
router.get('/pending', authenticateToken, requireAdmin, SubscriptionController.getPendingSubscriptions);
router.put('/:subscriptionId/confirm', authenticateToken, requireAdmin, SubscriptionController.confirmPayment);
router.put('/:subscriptionId/cancel', authenticateToken, requireAdmin, SubscriptionController.cancelSubscription);

export default router; 
