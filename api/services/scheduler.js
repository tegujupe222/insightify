const logger = require('../utils/logger');
const { sql } = require('../database/connection');

let isInitialized = false;

async function initScheduler() {
  try {
    logger.info('Initializing scheduler...');
    
    // Set up periodic tasks
    setInterval(cleanupOldData, 24 * 60 * 60 * 1000); // Daily
    setInterval(sendDailyReports, 24 * 60 * 60 * 1000); // Daily
    setInterval(checkSubscriptionExpiry, 60 * 60 * 1000); // Hourly
    
    isInitialized = true;
    logger.info('✅ Scheduler initialized successfully');
  } catch (error) {
    logger.error('❌ Scheduler initialization failed:', error);
    throw error;
  }
}

// Cleanup old data
async function cleanupOldData() {
  try {
    const retentionDays = parseInt(process.env.ANALYTICS_RETENTION_DAYS) || 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    // Delete old page views
    const pageViewsResult = await sql`
      DELETE FROM page_views 
      WHERE timestamp < ${cutoffDate}
    `;
    
    // Delete old click events
    const clickEventsResult = await sql`
      DELETE FROM click_events 
      WHERE timestamp < ${cutoffDate}
    `;
    
    // Delete old conversion events
    const conversionEventsResult = await sql`
      DELETE FROM conversion_events 
      WHERE timestamp < ${cutoffDate}
    `;
    
    // Delete old sessions
    const sessionsResult = await sql`
      DELETE FROM sessions 
      WHERE last_activity < ${cutoffDate}
    `;
    
    logger.info(`Data cleanup completed: ${pageViewsResult.rowCount} page views, ${clickEventsResult.rowCount} click events, ${conversionEventsResult.rowCount} conversion events, ${sessionsResult.rowCount} sessions deleted`);
  } catch (error) {
    logger.error('Error during data cleanup:', error);
  }
}

// Send daily reports
async function sendDailyReports() {
  try {
    // Get users with scheduled reports
    const usersResult = await sql`
      SELECT DISTINCT u.id, u.email, u.name
      FROM users u
      JOIN reports r ON u.id = r.user_id
      WHERE r.settings->>'schedule' = 'daily'
      AND r.status = 'completed'
    `;
    
    for (const user of usersResult.rows) {
      try {
        // Generate and send daily report for user
        await generateAndSendDailyReport(user);
        logger.info(`Daily report sent to user: ${user.email}`);
      } catch (error) {
        logger.error(`Error sending daily report to user ${user.email}:`, error);
      }
    }
  } catch (error) {
    logger.error('Error during daily report sending:', error);
  }
}

// Check subscription expiry
async function checkSubscriptionExpiry() {
  try {
    const expiringUsersResult = await sql`
      SELECT id, email, name, subscription_plan, subscription_expires_at
      FROM users 
      WHERE subscription_status = 'active' 
      AND subscription_plan != 'free'
      AND subscription_expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
    `;
    
    for (const user of expiringUsersResult.rows) {
      try {
        // Send expiry notification
        await sendExpiryNotification(user);
        logger.info(`Expiry notification sent to user: ${user.email}`);
      } catch (error) {
        logger.error(`Error sending expiry notification to user ${user.email}:`, error);
      }
    }
  } catch (error) {
    logger.error('Error during subscription expiry check:', error);
  }
}

// Generate and send daily report
async function generateAndSendDailyReport(user) {
  // This would integrate with email service (SendGrid, etc.)
  logger.info(`Generating daily report for user: ${user.email}`);
  
  // Placeholder for email sending logic
  // await sendEmail(user.email, 'Daily Analytics Report', reportContent);
}

// Send expiry notification
async function sendExpiryNotification(user) {
  // This would integrate with email service (SendGrid, etc.)
  logger.info(`Sending expiry notification to user: ${user.email}`);
  
  // Placeholder for email sending logic
  // await sendEmail(user.email, 'Subscription Expiring Soon', notificationContent);
}

module.exports = {
  initScheduler
};
