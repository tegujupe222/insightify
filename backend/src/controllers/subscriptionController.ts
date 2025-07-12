import { Request, Response } from 'express';
import { SubscriptionModel } from '../models/Subscription';
import { UserModel } from '../models/User';
import { EmailNotificationModel } from '../models/EmailNotification';
import { getSubscriptionPricing, getEmailTemplates } from '../utils/adminUtils';
import { ApiResponse } from '../types';
import { getBankTransferInfo } from '../config/bankInfo';

export class SubscriptionController {
  // Get subscription pricing
  static async getPricing(req: Request, res: Response) {
    try {
      const pricing = getSubscriptionPricing();
      
      const response: ApiResponse = {
        success: true,
        data: pricing,
        message: 'Subscription pricing retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Get pricing error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Request subscription upgrade
  static async requestUpgrade(req: Request, res: Response) {
    try {
      const { planType } = req.body;
      const userId = req.user!.userId;

      if (!planType || !['monthly', 'yearly'].includes(planType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid plan type'
        });
      }

      const pricing = getSubscriptionPricing();
      const amount = pricing[planType as keyof typeof pricing].price;

      // Create subscription request
      const subscription = await SubscriptionModel.create({
        userId,
        planType,
        amount
      });

      // Update user status to pending
      await UserModel.updateSubscriptionStatus(userId, 'pending', planType);

      // Send email notification
      const templates = getEmailTemplates();
      const template = templates.subscription_requested;
      
      await EmailNotificationModel.create({
        userId,
        type: 'subscription_requested',
        subject: template.subject,
        content: template.content(req.user!.email, planType, amount, subscription.invoiceNumber)
      });

      const response: ApiResponse = {
        success: true,
        data: {
          subscription: {
            id: subscription.id,
            planType: subscription.planType,
            amount: subscription.amount,
            invoiceNumber: subscription.invoiceNumber,
            status: subscription.status
          }
        },
        message: 'Subscription request created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Request upgrade error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get bank transfer information
  static async getBankTransferInfo(req: Request, res: Response) {
    try {
      const bankInfo = getBankTransferInfo();
      
      const response: ApiResponse = {
        success: true,
        data: bankInfo,
        message: 'Bank transfer information retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Get bank transfer info error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get user's subscription status
  static async getUserSubscription(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const user = await UserModel.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const subscriptions = await SubscriptionModel.findByUserId(userId);

      const response: ApiResponse = {
        success: true,
        data: {
          user: {
            subscriptionStatus: user.subscriptionStatus,
            subscriptionPlan: user.subscriptionPlan,
            monthlyPageViews: user.monthlyPageViews,
            pageViewsLimit: user.pageViewsLimit,
            subscriptionStartDate: user.subscriptionStartDate,
            subscriptionEndDate: user.subscriptionEndDate
          },
          subscriptions
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get user subscription error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Admin: Get all pending subscriptions
  static async getPendingSubscriptions(req: Request, res: Response) {
    try {
      const subscriptions = await SubscriptionModel.findPendingSubscriptions();
      
      // Get user details for each subscription
      const subscriptionsWithUsers = await Promise.all(
        subscriptions.map(async (sub) => {
          const user = await UserModel.findById(sub.userId);
          return {
            ...sub,
            user: user ? {
              id: user.id,
              email: user.email,
              role: user.role
            } : null
          };
        })
      );

      const response: ApiResponse = {
        success: true,
        data: subscriptionsWithUsers,
        message: 'Pending subscriptions retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Get pending subscriptions error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Admin: Confirm payment
  static async confirmPayment(req: Request, res: Response) {
    try {
      const { subscriptionId } = req.params;
      const adminUserId = req.user!.userId;

      const subscription = await SubscriptionModel.findById(subscriptionId);
      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found'
        });
      }

      if (subscription.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Subscription is not pending'
        });
      }

      // Update subscription status
      await SubscriptionModel.updateStatus(subscriptionId, 'paid', adminUserId);

      // Update user subscription status
      await UserModel.updateSubscriptionStatus(subscription.userId, 'premium', subscription.planType);

      // Send confirmation email
      const templates = getEmailTemplates();
      const template = templates.payment_confirmed;
      
      await EmailNotificationModel.create({
        userId: subscription.userId,
        type: 'payment_confirmed',
        subject: template.subject,
        content: template.content(subscription.userId, subscription.planType)
      });

      // Send activation email
      const activationTemplate = templates.subscription_activated;
      await EmailNotificationModel.create({
        userId: subscription.userId,
        type: 'subscription_activated',
        subject: activationTemplate.subject,
        content: activationTemplate.content(subscription.userId)
      });

      const response: ApiResponse = {
        success: true,
        data: {
          subscription: {
            id: subscription.id,
            status: 'paid',
            paymentConfirmedAt: new Date()
          }
        },
        message: 'Payment confirmed successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Confirm payment error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Admin: Cancel subscription
  static async cancelSubscription(req: Request, res: Response) {
    try {
      const { subscriptionId } = req.params;

      const subscription = await SubscriptionModel.findById(subscriptionId);
      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found'
        });
      }

      // Update subscription status
      await SubscriptionModel.updateStatus(subscriptionId, 'cancelled');

      // Update user subscription status back to free
      await UserModel.updateSubscriptionStatus(subscription.userId, 'free');

      const response: ApiResponse = {
        success: true,
        data: {
          subscription: {
            id: subscription.id,
            status: 'cancelled'
          }
        },
        message: 'Subscription cancelled successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Cancel subscription error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
} 