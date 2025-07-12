// User related types
export interface User {
  id: string;
  userId?: string; // 後方互換性のため
  email: string;
  password: string;
  role: 'admin' | 'user';
  subscriptionStatus: 'free' | 'premium' | 'pending';
  subscriptionPlan?: 'monthly' | 'yearly';
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  monthlyPageViews: number;
  pageViewsLimit: number;
  isBanned?: boolean;
  bannedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreateInput {
  email: string;
  password: string;
  role?: 'admin' | 'user';
}

export interface UserLoginInput {
  email: string;
  password: string;
}

// Subscription related types
export interface Subscription {
  id: string;
  userId: string;
  planType: 'monthly' | 'yearly';
  amount: number;
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  invoiceNumber: string;
  paymentMethod: string;
  paymentConfirmedBy?: string;
  paymentConfirmedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionCreateInput {
  userId: string;
  planType: 'monthly' | 'yearly';
  amount: number;
}

export interface EmailNotification {
  id: string;
  userId: string;
  type: 'upgrade_recommended' | 'subscription_requested' | 'subscription_activated' | 'payment_confirmed' | 'limit_warning';
  subject: string;
  content: string;
  sentAt: Date;
  readAt?: Date;
}

// Project related types
export interface Project {
  id: string;
  name: string;
  url: string;
  domains?: string[];
  userId: string;
  trackingCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectCreateInput {
  name: string;
  url: string;
  userId: string;
  domains?: string[];
}

// Analytics related types
export interface PageView {
  id: string;
  projectId: string;
  sessionId: string;
  pageUrl: string;
  referrer: string;
  userAgent: string;
  ipAddress: string;
  timestamp: Date;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  country?: string;
  city?: string;
}

export interface Event {
  id: string;
  projectId: string;
  sessionId: string;
  eventType: string;
  eventData: Record<string, any>;
  pageUrl: string;
  timestamp: Date;
}

export interface Session {
  id: string;
  projectId: string;
  visitorId: string;
  startTime: Date;
  endTime?: Date;
  pageViews: number;
  events: number;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  country?: string;
  city?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Analytics data types
export interface AnalyticsSummary {
  totalPageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  averageSessionDuration: number;
  topPages: Array<{ url: string; views: number }>;
  topSources: Array<{ source: string; visitors: number }>;
  deviceBreakdown: Array<{ device: string; percentage: number }>;
}

export interface TimeSeriesData {
  date: string;
  pageViews: number;
  uniqueVisitors: number;
  sessions: number;
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user';
  iat: number;
  exp: number;
}

// Heatmap related types
export interface HeatmapData {
  id: string;
  projectId: string;
  pageUrl: string;
  pageTitle?: string;
  x: number;
  y: number;
  count: number;
  heatmapType: 'click' | 'scroll' | 'move';
  elementSelector?: string;
  elementText?: string;
  timestamp: Date;
}

export interface HeatmapPage {
  id: string;
  projectId: string;
  pageUrl: string;
  pageTitle?: string;
  totalClicks: number;
  totalScrolls: number;
  totalMoves: number;
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface HeatmapDataInput {
  projectId: string;
  pageUrl: string;
  pageTitle?: string;
  x: number;
  y: number;
  heatmapType?: 'click' | 'scroll' | 'move';
  elementSelector?: string;
  elementText?: string;
} 