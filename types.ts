export interface DailyStat {
  date: string;
  visits: number;
}

export interface Source {
  name: string;
  visitors: number;
  change: string;
}

export interface DeviceData {
  name: string;
  value: number;
}

export interface Kpi {
  value: string;
  change: string;
}

export interface Kpis {
  pageViews: Kpi;
  uniqueUsers: Kpi;
  bounceRate: Kpi;
}

export interface AnalyticsData {
  kpis: Kpis;
  visitorData: DailyStat[];
  sources: Source[];
  deviceData: DeviceData[];
  liveVisitors: number;
}

export interface Project {
  id: string;
  name: string;
  url: string;
  domains?: string[];
  trackingCode: string;
}

export type UserRole = 'admin' | 'user';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  token?: string;
  name?: string;
  subscriptionStatus: 'free' | 'premium' | 'pending';
  subscriptionPlan?: 'monthly' | 'yearly';
  monthlyPageViews: number;
  pageViewsLimit: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  lastLogin: string;
  projectCount: number;
  status: 'Active' | 'Inactive';
  role?: 'admin' | 'user';
  isBanned?: boolean;
}
