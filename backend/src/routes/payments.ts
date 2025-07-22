import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { SubscriptionModel } from '../models/Subscription';
import { EmailService } from '../services/emailService';
import { UserModel } from '../models/User';

const router = Router();

// 銀行振込リクエスト
router.post('/bank-transfer', authenticateToken, async(req, res) => {
  try {
    const { planType, amount } = req.body;
    const userId = (req as any).user.id;

    // サブスクリプション作成
    const subscription = await SubscriptionModel.create({
      userId,
      planType,
      amount
    });

    // 確認メール送信
    await EmailService.sendPaymentConfirmed(userId, subscription.id);

    res.json({
      success: true,
      data: subscription,
      message: 'Bank transfer request created successfully'
    });
  } catch (error) {
    console.error('Error creating bank transfer request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create bank transfer request'
    });
  }
});

// サブスクリプション作成
router.post('/subscription', authenticateToken, async(req, res) => {
  try {
    const { planType, amount } = req.body;
    const userId = (req as any).user.id;

    // 既存のサブスクリプションをキャンセル（簡略化）
    // await SubscriptionModel.cancelActiveSubscriptions(userId);

    // 新しいサブスクリプション作成
    const subscription = await SubscriptionModel.create({
      userId,
      planType,
      amount
    });

    // ユーザーのサブスクリプション状態を更新
    await UserModel.updateSubscriptionStatus(userId, 'pending', planType);

    res.json({
      success: true,
      data: subscription,
      message: 'Subscription created successfully'
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create subscription'
    });
  }
});

// 請求書生成
router.post('/invoice', authenticateToken, async(req, res) => {
  try {
    const { subscriptionId } = req.body;
    const userId = (req as any).user.id;

    const subscription = await SubscriptionModel.findById(subscriptionId);
    if (!subscription || subscription.userId !== userId) {
      res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
      return;
    }

    // 請求書生成（簡略化）
    const invoice = {
      id: `INV-${Date.now()}`,
      subscriptionId,
      amount: subscription.amount,
      status: 'pending',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7日後
    };

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate invoice'
    });
  }
});

export default router; 
