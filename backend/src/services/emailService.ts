import sgMail from '@sendgrid/mail';
import { EmailNotification } from '../types';
import { getBankTransferText } from '../config/bankInfo';

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@insightify.com';
const FROM_NAME = process.env.FROM_NAME || 'Insightify Team';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export class EmailService {
  static async sendEmail(to: string, subject: string, content: string, htmlContent?: string): Promise<boolean> {
    try {
      if (!SENDGRID_API_KEY) {
        console.warn('SendGrid API key not configured, skipping email send');
        return false;
      }

      const msg = {
        to,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME
        },
        subject,
        text: content,
        html: htmlContent || this.convertToHtml(content)
      };

      await sgMail.send(msg);
      console.log(`✅ Email sent successfully to ${to}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }

  static async sendNotification(notification: EmailNotification): Promise<boolean> {
    try {
      // Get user email from notification
      const { UserModel } = await import('../models/User');
      const user = await UserModel.findById(notification.userId);
      
      if (!user) {
        console.error('User not found for notification:', notification.userId);
        return false;
      }

      return await this.sendEmail(
        user.email,
        notification.subject,
        notification.content
      );
    } catch (error) {
      console.error('Failed to send notification:', error);
      return false;
    }
  }

  static async sendBulkNotifications(notifications: EmailNotification[]): Promise<{
    success: number;
    failed: number;
    details: Array<{ notificationId: string; success: boolean; error?: string }>;
  }> {
    const results = {
      success: 0,
      failed: 0,
      details: [] as Array<{ notificationId: string; success: boolean; error?: string }>
    };

    for (const notification of notifications) {
      try {
        const success = await this.sendNotification(notification);
        results.details.push({
          notificationId: notification.id,
          success
        });
        
        if (success) {
          results.success++;
        } else {
          results.failed++;
        }
      } catch (error) {
        results.failed++;
        results.details.push({
          notificationId: notification.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  private static convertToHtml(text: string): string {
    // Convert plain text to basic HTML
    return text
      .split('\n')
      .map(line => {
        if (line.trim() === '') return '<br>';
        if (line.startsWith('•')) return `<li>${line.substring(1).trim()}</li>`;
        if (line.startsWith('【') && line.endsWith('】')) {
          return `<h3 style="color: #3B82F6; margin: 20px 0 10px 0;">${line}</h3>`;
        }
        return `<p style="margin: 10px 0;">${line}</p>`;
      })
      .join('')
      .replace(/<li>/g, '<ul style="margin: 10px 0; padding-left: 20px;"><li>')
      .replace(/<\/li>/g, '</li></ul>')
      .replace(/<\/ul><ul/g, '')
      .replace(/<br><\/ul>/g, '</ul>');
  }

  // Template methods for specific email types
  static async sendUpgradeRecommendation(userEmail: string, currentViews: number): Promise<boolean> {
    const subject = '【Insightify】アップグレードをお勧めします';
    const content = `
      ${userEmail} 様

      Insightifyをご利用いただき、ありがとうございます。

      現在のページビュー数が${currentViews}に達しており、無料プランの制限（3,000PV）に近づいています。

      より多くの機能をご利用いただくために、プレミアムプランへのアップグレードをお勧めします。

      【プレミアムプランの特典】
      • 無制限のページビュー
      • 全機能の利用
      • 優先サポート

      【料金】
      • 月額：¥5,500
      • 年額：¥55,000（10%割引）

      アップグレードをご希望の場合は、ダッシュボードからお申し込みください。

      --
      Insightify Team
    `;

    return await this.sendEmail(userEmail, subject, content);
  }

  static async sendSubscriptionRequested(userEmail: string, planType: string, amount: number, invoiceNumber: string): Promise<boolean> {
    const subject = '【Insightify】サブスクリプション申し込みを受け付けました';
    const content = `
      ${userEmail} 様

      Insightifyプレミアムプランのお申し込みを受け付けました。

      【申し込み内容】
      プラン：${planType === 'monthly' ? '月額' : '年額'}
      金額：¥${amount.toLocaleString()}
      請求書番号：${invoiceNumber}

      【お支払い方法】
      銀行振込にてお支払いください。

      ${getBankTransferText()}

      お支払い確認後、プレミアム機能が有効になります。

      --
      Insightify Team
    `;

    return await this.sendEmail(userEmail, subject, content);
  }

  static async sendPaymentConfirmed(userEmail: string, planType: string): Promise<boolean> {
    const subject = '【Insightify】お支払い確認完了';
    const content = `
      ${userEmail} 様

      ${planType === 'monthly' ? '月額' : '年額'}プランのお支払いを確認いたしました。

      プレミアム機能が有効になり、無制限でサービスをご利用いただけます。

      ご不明な点がございましたら、お気軽にお問い合わせください。
      お問い合わせ先：igafactory2023@gmail.com

      --
      Insightify Team
    `;

    return await this.sendEmail(userEmail, subject, content);
  }

  static async sendSubscriptionActivated(userEmail: string): Promise<boolean> {
    const subject = '【Insightify】プレミアム機能が有効になりました';
    const content = `
      ${userEmail} 様

      お支払いの確認が完了し、プレミアム機能が有効になりました。

      【利用可能な機能】
      • 無制限のページビュー
      • 全機能の利用
      • 優先サポート

      引き続きInsightifyをご愛用ください。

      --
      Insightify Team
    `;

    return await this.sendEmail(userEmail, subject, content);
  }

  static async sendLimitWarning(userEmail: string, currentViews: number, limit: number): Promise<boolean> {
    const subject = '【Insightify】ページビュー制限に近づいています';
    const content = `
      ${userEmail} 様

      現在のページビュー数が${currentViews}に達しており、制限（${limit}PV）の${Math.round((currentViews / limit) * 100)}%に達しています。

      制限に達すると、新規データの収集が停止されます。

      継続してサービスをご利用いただくために、プレミアムプランへのアップグレードをご検討ください。

      --
      Insightify Team
    `;

    return await this.sendEmail(userEmail, subject, content);
  }
} 