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

    // Create email notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK (type IN ('upgrade_recommended', 'subscription_requested', 'subscription_activated', 'payment_confirmed', 'limit_warning')),
        subject VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        read_at TIMESTAMP WITH TIME ZONE
      )
    `);

    // Create page_views table with optimized indexes for analytics
    await pool.query(`
      CREATE TABLE IF NOT EXISTS page_views (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        session_id VARCHAR(255) NOT NULL,
        page_url TEXT NOT NULL,
        referrer TEXT,
        user_agent TEXT,
        ip_address INET,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        device_type VARCHAR(20) CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
        browser VARCHAR(100),
        os VARCHAR(100),
        country VARCHAR(100),
        city VARCHAR(100)
      )
    `);

    // Create events table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        session_id VARCHAR(255) NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        event_data JSONB,
        page_url TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        visitor_id VARCHAR(255) NOT NULL,
        start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        end_time TIMESTAMP WITH TIME ZONE,
        page_views INTEGER DEFAULT 0,
        events INTEGER DEFAULT 0,
        device_type VARCHAR(20) CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
        browser VARCHAR(100),
        os VARCHAR(100),
        country VARCHAR(100),
        city VARCHAR(100)
      )
    `);

    // Create heatmap_data table for better performance
    await pool.query(`
      CREATE TABLE IF NOT EXISTS heatmap_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        page_url TEXT NOT NULL,
        page_title VARCHAR(500),
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        count INTEGER DEFAULT 1,
        heatmap_type VARCHAR(20) NOT NULL DEFAULT 'click' CHECK (heatmap_type IN ('click', 'scroll', 'move')),
        element_selector TEXT,
        element_text TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create heatmap_pages table for page management
    await pool.query(`
      CREATE TABLE IF NOT EXISTS heatmap_pages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        page_url TEXT NOT NULL,
        page_title VARCHAR(500),
        total_clicks INTEGER DEFAULT 0,
        total_scrolls INTEGER DEFAULT 0,
        total_moves INTEGER DEFAULT 0,
        last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(project_id, page_url)
      )
    `);

    // Create organizations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Add organization_id to users table
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id)
    `);

    // Add is_banned and banned_at columns if not exist
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE
    `);

    // 既存ユーザーにorganizationを自動作成・紐付け
    const usersWithoutOrg = await pool.query(`SELECT id, email FROM users WHERE organization_id IS NULL`);
    for (const user of usersWithoutOrg.rows) {
      // organizationsテーブルに新規作成
      const orgRes = await pool.query(
        `INSERT INTO organizations (name) VALUES ($1) RETURNING id`,
        [`${user.email}の組織`]
      );
      const orgId = orgRes.rows[0].id;
      // usersテーブルにorganization_idをセット
      await pool.query(
        `UPDATE users SET organization_id = $1 WHERE id = $2`,
        [orgId, user.id]
      );
    }

    // Create optimized indexes for better query performance
    await pool.query(`
      -- Page views indexes
      CREATE INDEX IF NOT EXISTS idx_page_views_project_id ON page_views(project_id);
      CREATE INDEX IF NOT EXISTS idx_page_views_timestamp ON page_views(timestamp);
      CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON page_views(session_id);
      CREATE INDEX IF NOT EXISTS idx_page_views_device_type ON page_views(device_type);
      
      -- Events indexes
      CREATE INDEX IF NOT EXISTS idx_events_project_id ON events(project_id);
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
      CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
      CREATE INDEX IF NOT EXISTS idx_events_data_gin ON events USING GIN (event_data);
      
      -- Sessions indexes
      CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_visitor_id ON sessions(visitor_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
      
      -- Projects indexes
      CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
      CREATE INDEX IF NOT EXISTS idx_projects_is_active ON projects(is_active);
      
      -- Heatmap indexes
      CREATE INDEX IF NOT EXISTS idx_heatmap_project_url ON heatmap_data(project_id, page_url);
      CREATE INDEX IF NOT EXISTS idx_heatmap_timestamp ON heatmap_data(timestamp);
      CREATE INDEX IF NOT EXISTS idx_heatmap_type ON heatmap_data(heatmap_type);
      CREATE INDEX IF NOT EXISTS idx_heatmap_pages_project ON heatmap_pages(project_id);
      CREATE INDEX IF NOT EXISTS idx_heatmap_pages_url ON heatmap_pages(page_url);
    `);

    // Create materialized views for better analytics performance
    await pool.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS daily_analytics AS
      SELECT 
        project_id,
        DATE(timestamp) as date,
        COUNT(DISTINCT pv.id) as page_views,
        COUNT(DISTINCT pv.session_id) as sessions,
        COUNT(DISTINCT s.visitor_id) as unique_visitors
      FROM page_views pv
      LEFT JOIN sessions s ON pv.session_id = s.id
      GROUP BY project_id, DATE(timestamp)
      ORDER BY project_id, date
    `);

    // Create index on materialized view
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_analytics_unique 
      ON daily_analytics (project_id, date)
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