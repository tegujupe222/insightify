import express from 'express';
import { CronService } from '../services/cronService';
import { ApiResponse } from '../types';

const router = express.Router();

// Daily tasks
router.post('/daily', async (req, res) => {
  try {
    await CronService.runDailyTasks();
    
    const response: ApiResponse = {
      success: true,
      message: 'Daily tasks completed successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Daily tasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run daily tasks'
    });
  }
});

// Monthly tasks
router.post('/monthly', async (req, res) => {
  try {
    await CronService.runMonthlyTasks();
    
    const response: ApiResponse = {
      success: true,
      message: 'Monthly tasks completed successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Monthly tasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run monthly tasks'
    });
  }
});

// Reset monthly page views
router.post('/reset-page-views', async (req, res) => {
  try {
    await CronService.resetMonthlyPageViews();
    
    const response: ApiResponse = {
      success: true,
      message: 'Monthly page views reset completed'
    };

    res.json(response);
  } catch (error) {
    console.error('Reset page views error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset monthly page views'
    });
  }
});

// Handle expired subscriptions
router.post('/handle-expired-subscriptions', async (req, res) => {
  try {
    await CronService.handleExpiredSubscriptions();
    
    const response: ApiResponse = {
      success: true,
      message: 'Expired subscriptions handled successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Handle expired subscriptions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to handle expired subscriptions'
    });
  }
});

// Send upgrade recommendations
router.post('/send-upgrade-recommendations', async (req, res) => {
  try {
    await CronService.sendUpgradeRecommendations();
    
    const response: ApiResponse = {
      success: true,
      message: 'Upgrade recommendations sent successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Send upgrade recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send upgrade recommendations'
    });
  }
});

// Send limit warnings
router.post('/send-limit-warnings', async (req, res) => {
  try {
    await CronService.sendLimitWarnings();
    
    const response: ApiResponse = {
      success: true,
      message: 'Limit warnings sent successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Send limit warnings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send limit warnings'
    });
  }
});

// Clean old notifications
router.post('/clean-notifications', async (req, res) => {
  try {
    const { daysToKeep = 30 } = req.body;
    await CronService.cleanOldNotifications(daysToKeep);
    
    const response: ApiResponse = {
      success: true,
      message: 'Old notifications cleaned successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Clean notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clean old notifications'
    });
  }
});

// Generate monthly reports
router.post('/generate-monthly-reports', async (req, res) => {
  try {
    await CronService.generateMonthlyReports();
    
    const response: ApiResponse = {
      success: true,
      message: 'Monthly reports generated successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Generate monthly reports error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate monthly reports'
    });
  }
});

export default router; 