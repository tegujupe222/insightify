-- Insightify DB schema (safe for production, idempotent)

-- 拡張機能
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  subscription_status TEXT DEFAULT 'free',
  subscription_plan TEXT,
  monthly_page_views INTEGER DEFAULT 0,
  page_views_limit INTEGER DEFAULT 3000,
  subscription_start_date TIMESTAMP,
  subscription_end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  domains TEXT[],
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tracking_code TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- page_views
CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  page_url TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- events
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  page_url TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- heatmap_data
CREATE TABLE IF NOT EXISTS heatmap_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  page_title TEXT,
  x INTEGER,
  y INTEGER,
  count INTEGER DEFAULT 1,
  heatmap_type TEXT DEFAULT 'click',
  element_selector TEXT,
  element_text TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- heatmap_pages
CREATE TABLE IF NOT EXISTS heatmap_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  page_title TEXT,
  total_clicks INTEGER DEFAULT 0,
  total_scrolls INTEGER DEFAULT 0,
  total_moves INTEGER DEFAULT 0,
  last_activity TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, page_url)
);

-- subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  invoice_number TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_confirmed_by TEXT,
  payment_confirmed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- email_notifications
CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
); 