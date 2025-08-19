const { sql } = require('@vercel/postgres');
const logger = require('../utils/logger');

let isConnected = false;

async function initDatabase() {
  try {
    // Test database connection
    const result = await sql`SELECT NOW() as current_time`;
    logger.info('Database connection test successful:', result.rows[0]);
    
    // Create tables if they don't exist
    await createTables();
    
    isConnected = true;
    logger.info('✅ Database initialized successfully');
  } catch (error) {
    logger.error('❌ Database initialization failed:', error);
    throw error;
  }
}

async function createTables() {
  try {
    // Users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        avatar_url TEXT,
        google_id VARCHAR(255) UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_admin BOOLEAN DEFAULT FALSE,
        subscription_status VARCHAR(50) DEFAULT 'free',
        subscription_plan VARCHAR(50) DEFAULT 'free',
        subscription_expires_at TIMESTAMP WITH TIME ZONE,
        api_key VARCHAR(255) UNIQUE,
        settings JSONB DEFAULT '{}'
      )
    `;

    // Websites table
    await sql`
      CREATE TABLE IF NOT EXISTS websites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        url VARCHAR(500) NOT NULL,
        domain VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        settings JSONB DEFAULT '{}',
        tracking_code TEXT,
        api_key VARCHAR(255) UNIQUE,
        plan_limits JSONB DEFAULT '{}'
      )
    `;

    // Page views table
    await sql`
      CREATE TABLE IF NOT EXISTS page_views (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
        session_id VARCHAR(255) NOT NULL,
        url VARCHAR(1000) NOT NULL,
        page_title VARCHAR(500),
        user_agent TEXT,
        referrer VARCHAR(1000),
        ip_address INET,
        country VARCHAR(100),
        city VARCHAR(100),
        device_type VARCHAR(50),
        browser VARCHAR(100),
        os VARCHAR(100),
        screen_resolution VARCHAR(50),
        load_time INTEGER,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'
      )
    `;

    // Click events table
    await sql`
      CREATE TABLE IF NOT EXISTS click_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
        session_id VARCHAR(255) NOT NULL,
        url VARCHAR(1000) NOT NULL,
        element_id VARCHAR(255),
        element_class VARCHAR(500),
        element_tag VARCHAR(50),
        element_text TEXT,
        x_position INTEGER,
        y_position INTEGER,
        viewport_width INTEGER,
        viewport_height INTEGER,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'
      )
    `;

    // Conversion events table
    await sql`
      CREATE TABLE IF NOT EXISTS conversion_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
        session_id VARCHAR(255) NOT NULL,
        url VARCHAR(1000) NOT NULL,
        goal VARCHAR(255) NOT NULL,
        value DECIMAL(10,2),
        ab_test_variant VARCHAR(100),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'
      )
    `;

    // Sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id),
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        duration INTEGER DEFAULT 0,
        page_views_count INTEGER DEFAULT 0,
        clicks_count INTEGER DEFAULT 0,
        conversions_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        metadata JSONB DEFAULT '{}'
      )
    `;

    // A/B Tests table
    await sql`
      CREATE TABLE IF NOT EXISTS ab_tests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        start_date TIMESTAMP WITH TIME ZONE,
        end_date TIMESTAMP WITH TIME ZONE,
        traffic_split JSONB NOT NULL,
        goals JSONB DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        settings JSONB DEFAULT '{}'
      )
    `;

    // A/B Test variants table
    await sql`
      CREATE TABLE IF NOT EXISTS ab_test_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ab_test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        traffic_percentage DECIMAL(5,2) DEFAULT 0,
        changes JSONB DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // A/B Test results table
    await sql`
      CREATE TABLE IF NOT EXISTS ab_test_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ab_test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
        variant_id UUID REFERENCES ab_test_variants(id) ON DELETE CASCADE,
        session_id VARCHAR(255) NOT NULL,
        goal VARCHAR(255) NOT NULL,
        converted BOOLEAN DEFAULT FALSE,
        value DECIMAL(10,2),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Funnels table
    await sql`
      CREATE TABLE IF NOT EXISTS funnels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        steps JSONB NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Funnel events table
    await sql`
      CREATE TABLE IF NOT EXISTS funnel_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        funnel_id UUID REFERENCES funnels(id) ON DELETE CASCADE,
        session_id VARCHAR(255) NOT NULL,
        step_number INTEGER NOT NULL,
        step_name VARCHAR(255) NOT NULL,
        step_url VARCHAR(1000) NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Reports table
    await sql`
      CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        date_range JSONB NOT NULL,
        data JSONB,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        generated_at TIMESTAMP WITH TIME ZONE,
        settings JSONB DEFAULT '{}'
      )
    `;

    // Subscriptions table
    await sql`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        plan VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        current_period_start TIMESTAMP WITH TIME ZONE,
        current_period_end TIMESTAMP WITH TIME ZONE,
        cancel_at_period_end BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'
      )
    `;

    // Payments table
    await sql`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'JPY',
        status VARCHAR(50) DEFAULT 'pending',
        payment_method VARCHAR(50),
        transaction_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        processed_at TIMESTAMP WITH TIME ZONE,
        metadata JSONB DEFAULT '{}'
      )
    `;

    // Create indexes for better performance
    await sql`CREATE INDEX IF NOT EXISTS idx_page_views_website_id ON page_views(website_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_page_views_timestamp ON page_views(timestamp)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON page_views(session_id)`;
    
    await sql`CREATE INDEX IF NOT EXISTS idx_click_events_website_id ON click_events(website_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_click_events_timestamp ON click_events(timestamp)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_click_events_session_id ON click_events(session_id)`;
    
    await sql`CREATE INDEX IF NOT EXISTS idx_conversion_events_website_id ON conversion_events(website_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_conversion_events_timestamp ON conversion_events(timestamp)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_conversion_events_session_id ON conversion_events(session_id)`;
    
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_website_id ON sessions(website_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity)`;
    
    await sql`CREATE INDEX IF NOT EXISTS idx_websites_user_id ON websites(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_websites_domain ON websites(domain)`;

    logger.info('✅ Database tables created successfully');
  } catch (error) {
    logger.error('❌ Error creating database tables:', error);
    throw error;
  }
}

async function getConnection() {
  if (!isConnected) {
    throw new Error('Database not initialized');
  }
  return sql;
}

async function closeConnection() {
  // Vercel Postgres handles connection pooling automatically
  isConnected = false;
  logger.info('Database connection closed');
}

module.exports = {
  initDatabase,
  getConnection,
  closeConnection,
  sql
};
