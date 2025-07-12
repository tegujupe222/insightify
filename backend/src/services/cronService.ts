import { UserModel } from '../models/User';
import { EmailNotificationModel } from '../models/EmailNotification';
import { EmailService } from './emailService';
import { getEmailTemplates } from '../utils/adminUtils';

export class CronService {
  // Reset monthly page views for all users
  static async resetMonthlyPageViews(): Promise<void> {
    try {
      console.log('🔄 Starting monthly page views reset...');
      
      await UserModel.resetMonthlyPageViews();
      
      console.log('✅ Monthly page views reset completed');
    } catch (error) {
      console.error('❌ Failed to reset monthly page views:', error);
      throw error;
    }
  }

  // Check and handle expired subscriptions
  static async handleExpiredSubscriptions(): Promise<void> {
    try {
      console.log('🔄 Checking for expired subscriptions...');
      
      const now = new Date();
      const users = await UserModel.findAll();
      
      for (const user of users) {
        if (user.subscriptionStatus === 'premium' && user.subscriptionEndDate) {
          const endDate = new Date(user.subscriptionEndDate);
          
          if (endDate < now) {
            // Subscription has expired
            await UserModel.updateSubscriptionStatus(user.id, 'free');
            
            // Send expiration notification
            await this.sendExpirationNotification(user.email);
            
            console.log(`✅ Subscription expired for user: ${user.email}`);
          }
        }
      }
      
      console.log('✅ Expired subscriptions check completed');
    } catch (error) {
      console.error('❌ Failed to handle expired subscriptions:', error);
      throw error;
    }
  }

  // Send upgrade recommendations to users near limit
  static async sendUpgradeRecommendations(): Promise<void> {
    try {
      console.log('🔄 Sending upgrade recommendations...');
      
      const usersNearLimit = await UserModel.getUsersNearLimit(0.8);
      const templates = getEmailTemplates();
      const template = templates.upgrade_recommended;
      
      let sentCount = 0;
      
      for (const user of usersNearLimit) {
        // Check if we already sent a recommendation recently (within 7 days)
        const recentNotifications = await EmailNotificationModel.findByUserId(user.id);
        const hasRecentRecommendation = recentNotifications.some(
          n => n.type === 'upgrade_recommended' && 
               new Date(n.sentAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
        );

        if (!hasRecentRecommendation) {
          // Create notification record
          const notification = await EmailNotificationModel.create({
            userId: user.id,
            type: 'upgrade_recommended',
            subject: template.subject,
            content: template.content(user.email, user.monthlyPageViews)
          });

          // Send email
          const success = await EmailService.sendUpgradeRecommendation(user.email, user.monthlyPageViews);
          
          if (success) {
            sentCount++;
            console.log(`✅ Upgrade recommendation sent to: ${user.email}`);
          } else {
            console.log(`❌ Failed to send upgrade recommendation to: ${user.email}`);
          }
        }
      }
      
      console.log(`✅ Upgrade recommendations completed. Sent: ${sentCount}`);
    } catch (error) {
      console.error('❌ Failed to send upgrade recommendations:', error);
      throw error;
    }
  }

  // Send limit warnings to users at limit
  static async sendLimitWarnings(): Promise<void> {
    try {
      console.log('🔄 Sending limit warnings...');
      
      const usersAtLimit = await UserModel.getUsersAtLimit();
      const templates = getEmailTemplates();
      const template = templates.limit_warning;
      
      let sentCount = 0;
      
      for (const user of usersAtLimit) {
        // Check if we already sent a warning recently (within 3 days)
        const recentNotifications = await EmailNotificationModel.findByUserId(user.id);
        const hasRecentWarning = recentNotifications.some(
          n => n.type === 'limit_warning' && 
               new Date(n.sentAt).getTime() > Date.now() - 3 * 24 * 60 * 60 * 1000
        );

        if (!hasRecentWarning) {
          // Create notification record
          const notification = await EmailNotificationModel.create({
            userId: user.id,
            type: 'limit_warning',
            subject: template.subject,
            content: template.content(user.email, user.monthlyPageViews, user.pageViewsLimit)
          });

          // Send email
          const success = await EmailService.sendLimitWarning(user.email, user.monthlyPageViews, user.pageViewsLimit);
          
          if (success) {
            sentCount++;
            console.log(`✅ Limit warning sent to: ${user.email}`);
          } else {
            console.log(`❌ Failed to send limit warning to: ${user.email}`);
          }
        }
      }
      
      console.log(`✅ Limit warnings completed. Sent: ${sentCount}`);
    } catch (error) {
      console.error('❌ Failed to send limit warnings:', error);
      throw error;
    }
  }

  // Clean old notifications
  static async cleanOldNotifications(daysToKeep: number = 30): Promise<void> {
    try {
      console.log('🔄 Cleaning old notifications...');
      
      const deletedCount = await EmailNotificationModel.deleteOldNotifications(daysToKeep);
      
      console.log(`✅ Old notifications cleaned. Deleted: ${deletedCount}`);
    } catch (error) {
      console.error('❌ Failed to clean old notifications:', error);
      throw error;
    }
  }

  // Generate monthly reports
  static async generateMonthlyReports(): Promise<void> {
    try {
      console.log('🔄 Generating monthly reports...');
      
      const users = await UserModel.findAll();
      
      for (const user of users) {
        if (user.subscriptionStatus === 'premium') {
          // Generate and send monthly report for premium users
          await this.sendMonthlyReport(user.email, user.monthlyPageViews);
        }
      }
      
      console.log('✅ Monthly reports generated');
    } catch (error) {
      console.error('❌ Failed to generate monthly reports:', error);
      throw error;
    }
  }

  // Send subscription expiration notifications
  private static async sendExpirationNotification(userEmail: string): Promise<void> {
    const subject = '【Insightify】サブスクリプション期限切れのお知らせ';
    const content = `
      ${userEmail} 様

      お客様のInsightifyプレミアムプランの期限が切れました。

      継続してプレミアム機能をご利用いただくために、サブスクリプションの更新をお願いいたします。

      【更新方法】
      ダッシュボードから新しいサブスクリプションをお申し込みください。

      --
      Insightify Team
    `;

    await EmailService.sendEmail(userEmail, subject, content);
  }

  // Send monthly reports
  private static async sendMonthlyReport(userEmail: string, pageViews: number): Promise<void> {
    const subject = '【Insightify】月次レポート';
    const content = `
      ${userEmail} 様

      今月のInsightify利用状況をお知らせします。

      【今月の利用状況】
      ページビュー数: ${pageViews.toLocaleString()} PV

      【プレミアムプランの特典】
      • 無制限のページビュー
      • 全機能の利用
      • 優先サポート

      引き続きInsightifyをご愛用ください。

      --
      Insightify Team
    `;

    await EmailService.sendEmail(userEmail, subject, content);
  }

  // Run all daily tasks
  static async runDailyTasks(): Promise<void> {
    try {
      console.log('🔄 Starting daily tasks...');
      
      await this.handleExpiredSubscriptions();
      await this.sendUpgradeRecommendations();
      await this.sendLimitWarnings();
      
      console.log('✅ Daily tasks completed');
    } catch (error) {
      console.error('❌ Failed to run daily tasks:', error);
      throw error;
    }
  }

  // Run all monthly tasks
  static async runMonthlyTasks(): Promise<void> {
    try {
      console.log('🔄 Starting monthly tasks...');
      
      await this.resetMonthlyPageViews();
      await this.generateMonthlyReports();
      await this.cleanOldNotifications();
      
      console.log('✅ Monthly tasks completed');
    } catch (error) {
      console.error('❌ Failed to run monthly tasks:', error);
      throw error;
    }
  }
} 