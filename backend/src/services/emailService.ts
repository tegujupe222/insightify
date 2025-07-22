import sgMail from '@sendgrid/mail';
import { EmailNotification } from '../types';

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
        // Update notification status to failed
        const { EmailNotificationModel } = await import('../models/EmailNotification');
        await EmailNotificationModel.updateStatus(notification.id, 'failed', 'User not found');
        return false;
      }

      const success = await this.sendEmail(
        user.email,
        notification.subject,
        notification.content
      );

      // Update notification status
      const { EmailNotificationModel } = await import('../models/EmailNotification');
      await EmailNotificationModel.updateStatus(
        notification.id, 
        success ? 'sent' : 'failed',
        success ? undefined : 'Send failed'
      );

      return success;
    } catch (error) {
      console.error('Failed to send notification:', error);
      // Update notification status to failed
      const { EmailNotificationModel } = await import('../models/EmailNotification');
      await EmailNotificationModel.updateStatus(
        notification.id, 
        'failed', 
        error instanceof Error ? error.message : 'Unknown error'
      );
      return false;
    }
  }

  // Enhanced HTML email template
  private static getEmailTemplate(content: string, title?: string): string {
    return `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title || 'Insightify'}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f8f9fa;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .content {
            padding: 40px 30px;
          }
          .section {
            margin-bottom: 25px;
          }
          .section-title {
            color: #3B82F6;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 15px;
            border-bottom: 2px solid #E5E7EB;
            padding-bottom: 8px;
          }
          .highlight-box {
            background-color: #F3F4F6;
            border-left: 4px solid #3B82F6;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .warning-box {
            background-color: #FEF3C7;
            border-left: 4px solid #F59E0B;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .success-box {
            background-color: #D1FAE5;
            border-left: 4px solid #10B981;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 10px 0;
          }
          .button:hover {
            opacity: 0.9;
          }
          .footer {
            background-color: #F9FAFB;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #E5E7EB;
          }
          .footer p {
            margin: 5px 0;
            color: #6B7280;
            font-size: 14px;
          }
          .contact-info {
            margin-top: 20px;
            padding: 15px;
            background-color: #F3F4F6;
            border-radius: 6px;
          }
          .bank-info {
            background-color: #FEF3C7;
            border: 1px solid #F59E0B;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
          }
          .bank-info h4 {
            margin: 0 0 15px 0;
            color: #92400E;
          }
          .bank-detail {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            padding: 8px 0;
            border-bottom: 1px solid #FDE68A;
          }
          .bank-detail:last-child {
            border-bottom: none;
          }
          .bank-label {
            font-weight: 600;
            color: #92400E;
          }
          .bank-value {
            font-family: monospace;
            color: #92400E;
          }
          @media (max-width: 600px) {
            .container {
              margin: 0;
              box-shadow: none;
            }
            .content {
              padding: 20px 15px;
            }
            .header {
              padding: 20px 15px;
            }
            .header h1 {
              font-size: 24px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Insightify</h1>
            <p>Web Analytics Platform</p>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>© 2024 Insightify. All rights reserved.</p>
            <p>お問い合わせ: igafactory2023@gmail.com</p>
            <p>このメールは自動送信されています。</p>
          </div>
        </div>
      </body>
      </html>
    `;
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

  // Enhanced template methods for specific email types
  static async sendUpgradeRecommendation(userEmail: string, currentViews: number): Promise<boolean> {
    const subject = '【Insightify】アップグレードをお勧めします';
    const htmlContent = this.getEmailTemplate(`
      <div class="section">
        <p>${userEmail} 様</p>
        <p>Insightifyをご利用いただき、ありがとうございます。</p>
      </div>

      <div class="warning-box">
        <h3 style="margin: 0 0 10px 0; color: #92400E;">⚠️ 制限に近づいています</h3>
        <p style="margin: 0;">現在のページビュー数が <strong>${currentViews.toLocaleString()}</strong> に達しており、無料プランの制限（3,000PV）に近づいています。</p>
      </div>

      <div class="section">
        <div class="section-title">プレミアムプランの特典</div>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>無制限のページビュー</li>
          <li>全機能の利用</li>
          <li>優先サポート</li>
          <li>詳細な分析レポート</li>
        </ul>
      </div>

      <div class="section">
        <div class="section-title">料金プラン</div>
        <div style="display: flex; gap: 20px; margin: 15px 0;">
          <div style="flex: 1; padding: 15px; border: 2px solid #E5E7EB; border-radius: 6px; text-align: center;">
            <h4 style="margin: 0 0 10px 0;">月額プラン</h4>
            <div style="font-size: 24px; font-weight: bold; color: #3B82F6;">¥5,500</div>
            <div style="font-size: 14px; color: #6B7280;">月払い</div>
          </div>
          <div style="flex: 1; padding: 15px; border: 2px solid #3B82F6; border-radius: 6px; text-align: center; background-color: #EFF6FF;">
            <h4 style="margin: 0 0 10px 0;">年額プラン</h4>
            <div style="font-size: 24px; font-weight: bold; color: #3B82F6;">¥55,000</div>
            <div style="font-size: 14px; color: #10B981; font-weight: 600;">10%割引</div>
          </div>
        </div>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL || 'https://insightify.vercel.app'}" class="button">
          プレミアムにアップグレード
        </a>
      </div>
    `, 'アップグレードをお勧めします');

    return await this.sendEmail(userEmail, subject, '', htmlContent);
  }

  static async sendSubscriptionRequested(userEmail: string, planType: string, amount: number, invoiceNumber: string): Promise<boolean> {
    const subject = '【Insightify】サブスクリプション申し込みを受け付けました';
    const htmlContent = this.getEmailTemplate(`
      <div class="section">
        <p>${userEmail} 様</p>
        <p>Insightifyプレミアムプランのお申し込みを受け付けました。</p>
      </div>

      <div class="success-box">
        <h3 style="margin: 0 0 15px 0; color: #065F46;">✅ 申し込み完了</h3>
        <div style="display: grid; gap: 10px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: 600;">プラン:</span>
            <span>${planType === 'monthly' ? '月額' : '年額'}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: 600;">金額:</span>
            <span>¥${amount.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: 600;">請求書番号:</span>
            <span style="font-family: monospace;">${invoiceNumber}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">お支払い方法</div>
        <p>銀行振込にてお支払いください。</p>
        
        <div class="bank-info">
          <h4>振込先口座情報</h4>
          ${this.getBankTransferHtml()}
        </div>
      </div>

      <div class="highlight-box">
        <h4 style="margin: 0 0 10px 0;">重要</h4>
        <p style="margin: 0;">お振込の際は、必ずお客様のメールアドレス（${userEmail}）を振込依頼人名に入れてください。振込確認後、プレミアム機能が有効になります。</p>
      </div>
    `, 'サブスクリプション申し込み');

    return await this.sendEmail(userEmail, subject, '', htmlContent);
  }

  static async sendPaymentConfirmed(userEmail: string, planType: string): Promise<boolean> {
    const subject = '【Insightify】お支払い確認完了';
    const htmlContent = this.getEmailTemplate(`
      <div class="section">
        <p>${userEmail} 様</p>
        <p>${planType === 'monthly' ? '月額' : '年額'}プランのお支払いを確認いたしました。</p>
      </div>

      <div class="success-box">
        <h3 style="margin: 0 0 15px 0; color: #065F46;">🎉 プレミアム機能が有効になりました</h3>
        <p style="margin: 0;">無制限でサービスをご利用いただけます。</p>
      </div>

      <div class="section">
        <div class="section-title">利用可能な機能</div>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>無制限のページビュー</li>
          <li>全機能の利用</li>
          <li>優先サポート</li>
          <li>詳細な分析レポート</li>
          <li>ヒートマップ分析</li>
        </ul>
      </div>

      <div class="contact-info">
        <h4 style="margin: 0 0 10px 0;">お問い合わせ</h4>
        <p style="margin: 5px 0;">ご不明な点がございましたら、お気軽にお問い合わせください。</p>
        <p style="margin: 5px 0;"><strong>メール:</strong> igafactory2023@gmail.com</p>
      </div>
    `, '支払い確認完了');

    return await this.sendEmail(userEmail, subject, '', htmlContent);
  }

  static async sendSubscriptionActivated(userEmail: string): Promise<boolean> {
    const subject = '【Insightify】プレミアム機能が有効になりました';
    const htmlContent = this.getEmailTemplate(`
      <div class="section">
        <p>${userEmail} 様</p>
        <p>お支払いの確認が完了し、プレミアム機能が有効になりました。</p>
      </div>

      <div class="success-box">
        <h3 style="margin: 0 0 15px 0; color: #065F46;">🚀 プレミアム機能が有効です</h3>
        <p style="margin: 0;">すべての機能を無制限でご利用いただけます。</p>
      </div>

      <div class="section">
        <div class="section-title">利用可能な機能</div>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>無制限のページビュー</li>
          <li>全機能の利用</li>
          <li>優先サポート</li>
          <li>詳細な分析レポート</li>
          <li>ヒートマップ分析</li>
          <li>リアルタイム分析</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL || 'https://insightify.vercel.app'}" class="button">
          ダッシュボードにアクセス
        </a>
      </div>

      <div class="highlight-box">
        <p style="margin: 0;">引き続きInsightifyをご愛用ください。ご不明な点がございましたら、お気軽にお問い合わせください。</p>
      </div>
    `, 'プレミアム機能有効化');

    return await this.sendEmail(userEmail, subject, '', htmlContent);
  }

  static async sendLimitWarning(userEmail: string, currentViews: number, limit: number): Promise<boolean> {
    const subject = '【Insightify】ページビュー制限に近づいています';
    const percentage = Math.round((currentViews / limit) * 100);
    const htmlContent = this.getEmailTemplate(`
      <div class="section">
        <p>${userEmail} 様</p>
        <p>現在のページビュー数が制限に近づいています。</p>
      </div>

      <div class="warning-box">
        <h3 style="margin: 0 0 15px 0; color: #92400E;">⚠️ 制限警告</h3>
        <div style="margin-bottom: 15px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>現在の使用量:</span>
            <span><strong>${currentViews.toLocaleString()} PV</strong></span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>制限:</span>
            <span>${limit.toLocaleString()} PV</span>
          </div>
          <div style="background-color: #E5E7EB; border-radius: 10px; height: 20px; overflow: hidden;">
            <div style="background: linear-gradient(90deg, #F59E0B, #EF4444); height: 100%; width: ${Math.min(percentage, 100)}%; transition: width 0.3s ease;"></div>
          </div>
          <div style="text-align: center; margin-top: 5px; font-size: 14px; color: #92400E;">
            ${percentage}% 使用中
          </div>
        </div>
        <p style="margin: 0;">制限に達すると、新規データの収集が停止されます。</p>
      </div>

      <div class="section">
        <div class="section-title">プレミアムプランへのアップグレード</div>
        <p>継続してサービスをご利用いただくために、プレミアムプランへのアップグレードをご検討ください。</p>
        
        <div style="display: flex; gap: 20px; margin: 15px 0;">
          <div style="flex: 1; padding: 15px; border: 2px solid #E5E7EB; border-radius: 6px; text-align: center;">
            <h4 style="margin: 0 0 10px 0;">月額プラン</h4>
            <div style="font-size: 24px; font-weight: bold; color: #3B82F6;">¥5,500</div>
            <div style="font-size: 14px; color: #6B7280;">月払い</div>
          </div>
          <div style="flex: 1; padding: 15px; border: 2px solid #3B82F6; border-radius: 6px; text-align: center; background-color: #EFF6FF;">
            <h4 style="margin: 0 0 10px 0;">年額プラン</h4>
            <div style="font-size: 24px; font-weight: bold; color: #3B82F6;">¥55,000</div>
            <div style="font-size: 14px; color: #10B981; font-weight: 600;">10%割引</div>
          </div>
        </div>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL || 'https://insightify.vercel.app'}" class="button">
          今すぐアップグレード
        </a>
      </div>
    `, '制限警告');

    return await this.sendEmail(userEmail, subject, '', htmlContent);
  }

  private static getBankTransferHtml(): string {
    return `
      <div class="bank-detail">
        <span class="bank-label">銀行名:</span>
        <span class="bank-value">${process.env.BANK_NAME || '神戸信用金庫'}</span>
      </div>
      <div class="bank-detail">
        <span class="bank-label">支店名:</span>
        <span class="bank-value">${process.env.BANK_BRANCH || '本店'}</span>
      </div>
      <div class="bank-detail">
        <span class="bank-label">口座種別:</span>
        <span class="bank-value">${process.env.BANK_ACCOUNT_TYPE || '普通'}</span>
      </div>
      <div class="bank-detail">
        <span class="bank-label">口座番号:</span>
        <span class="bank-value">${process.env.BANK_ACCOUNT_NUMBER || '0726786'}</span>
      </div>
      <div class="bank-detail">
        <span class="bank-label">口座名義:</span>
        <span class="bank-value">${process.env.BANK_ACCOUNT_HOLDER || 'ｲｶﾞｻｷ ｺﾞｳﾀ'}</span>
      </div>
    `;
  }
} 