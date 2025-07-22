import { refreshAnalyticsViews, cleanOldData } from './database';

// Vercel Cron Jobs handler
export const handleCronJob = async(req: any, res: any) => {
  try {
    const { cron } = req.query;
    
    switch (cron) {
    case 'refresh-analytics':
      await refreshAnalyticsViews();
      res.json({ success: true, message: 'Analytics views refreshed' });
      break;
        
    case 'clean-old-data': {
      const daysToKeep = parseInt(process.env.ANALYTICS_RETENTION_DAYS || '90');
      await cleanOldData(daysToKeep);
      res.json({ success: true, message: `Cleaned data older than ${daysToKeep} days` });
      break;
    }
        
    default:
      res.status(400).json({ success: false, error: 'Invalid cron job type' });
    }
  } catch (error) {
    console.error('Cron job error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Manual trigger functions for development
export const manualRefreshAnalytics = async() => {
  try {
    await refreshAnalyticsViews();
    console.log('✅ Analytics views refreshed manually');
  } catch (error) {
    console.error('❌ Failed to refresh analytics views:', error);
  }
};

export const manualCleanOldData = async(daysToKeep: number = 90) => {
  try {
    await cleanOldData(daysToKeep);
    console.log(`✅ Cleaned data older than ${daysToKeep} days manually`);
  } catch (error) {
    console.error('❌ Failed to clean old data:', error);
  }
}; 
