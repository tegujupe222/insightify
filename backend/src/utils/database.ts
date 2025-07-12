import pool from '../config/database';

export const initializeDatabase = async () => {
  try {
    console.log('🔄 Initializing database...');

    // Create users table with subscription fields
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        subscription_status VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (subscription_status IN ('free', 'premium', 'pending')),
        subscription_plan VARCHAR(20) CHECK (subscription_plan IN ('monthly', 'yearly')),
        subscription_start_date TIMESTAMP WITH TIME ZONE,
        subscription_end_date TIMESTAMP WITH TIME ZONE,
        monthly_page_views INTEGER DEFAULT 0,
        page_views_limit INTEGER DEFAULT 3000,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create projects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        url VARCHAR(500) NOT NULL,
        domains JSONB DEFAULT '[]',
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tracking_code TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Add domains column if not exists
    await pool.query(`
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS domains JSONB DEFAULT '[]'
    `);

    // Create subscriptions table for payment tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('monthly', 'yearly')),
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'expired')),
        invoice_number VARCHAR(50) UNIQUE,
        payment_method VARCHAR(20) DEFAULT 'bank_transfer',
        payment_confirmed_by UUID REFERENCES users(id),
        payment_confirmed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create email notifications table with enhanced tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK (type IN ('upgrade_recommended', 'subscription_requested', 'subscription_activated', 'payment_confirmed', 'limit_warning')),
        subject VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
        error_message TEXT,
        sent_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Add status and error_message columns if they don't exist
    await pool.query(`
      ALTER TABLE email_notifications ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed'))
    `);

    await pool.query(`
      ALTER TABLE email_notifications ADD COLUMN IF NOT EXISTS error_message TEXT
    `);

    // Update existing records to have 'sent' status if they have sent_at
    await pool.query(`
      UPDATE email_notifications 
      SET status = 'sent' 
      WHERE sent_at IS NOT NULL AND status = 'pending'
    `);

    // Create analytics table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        page_url VARCHAR(500) NOT NULL,
        referrer VARCHAR(500),
        user_agent TEXT,
        ip_address INET,
        device_type VARCHAR(20),
        browser VARCHAR(50),
        os VARCHAR(50),
        country VARCHAR(50),
        city VARCHAR(100),
        session_id VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create events table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        event_name VARCHAR(100) NOT NULL,
        event_data JSONB,
        page_url VARCHAR(500),
        session_id VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create heatmap data table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS heatmap_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        page_url VARCHAR(500) NOT NULL,
        heatmap_type VARCHAR(20) NOT NULL CHECK (heatmap_type IN ('click', 'scroll', 'move')),
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        intensity INTEGER DEFAULT 1,
        element_selector TEXT,
        element_text TEXT,
        session_id VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create organizations table for multi-tenant support
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        owner_id UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Add organization_id to users table
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id)
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_project_created ON analytics(project_id, created_at)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_events_project_created ON events(project_id, created_at)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_heatmap_project_page ON heatmap_data(project_id, page_url, heatmap_type)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_notifications_user_type ON email_notifications(user_id, type)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status, sent_at)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status)
    `);

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

export const createDefaultAdmin = async () => {
  try {
    const { UserModel } = await import('../models/User');
    const { isAdminEmail } = await import('./adminUtils');
    
    // Create admin users for allowed emails
    const adminEmails = ['g-igasaki@shinko.ed.jp', 'igafactory2023@gmail.com'];
    
    for (const email of adminEmails) {
      const existingAdmin = await UserModel.findByEmail(email);
      if (!existingAdmin) {
        await UserModel.create({
          email: email,
          password: 'admin123', // In production, use secure passwords
          role: 'admin'
        });
        console.log(`👤 Admin user created: ${email}`);
      } else {
        console.log(`👤 Admin user already exists: ${email}`);
      }
    }
  } catch (error) {
    console.error('❌ Failed to create admin users:', error);
  }
};

// Function to refresh materialized views
export const refreshAnalyticsViews = async () => {
  try {
    await pool.query('REFRESH MATERIALIZED VIEW daily_analytics');
    console.log('✅ Analytics views refreshed');
  } catch (error) {
    console.error('❌ Failed to refresh analytics views:', error);
  }
};

// Function to clean old data (for data retention)
export const cleanOldData = async (daysToKeep: number = 90) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // Clean old page views
    await pool.query(
      'DELETE FROM page_views WHERE timestamp < $1',
      [cutoffDate]
    );

    // Clean old events
    await pool.query(
      'DELETE FROM events WHERE timestamp < $1',
      [cutoffDate]
    );

    // Clean old heatmap data
    await pool.query(
      'DELETE FROM heatmap_data WHERE timestamp < $1',
      [cutoffDate]
    );

    // Clean old sessions
    await pool.query(
      'DELETE FROM sessions WHERE start_time < $1',
      [cutoffDate]
    );

    console.log(`✅ Cleaned data older than ${daysToKeep} days`);
  } catch (error) {
    console.error('❌ Failed to clean old data:', error);
  }
}; 