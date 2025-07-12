import type { AnalyticsData, DailyStat, Source, DeviceData, User } from '../types';

const generateVisitorData = (): DailyStat[] => {
  const data: DailyStat[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      visits: Math.floor(Math.random() * (5000 - 1500 + 1)) + 1500,
    });
  }
  return data;
};

const mockData: AnalyticsData = {
  kpis: {
    pageViews: { value: '142,730', change: '+12.5%' },
    uniqueUsers: { value: '89,921', change: '+8.1%' },
    bounceRate: { value: '41.8%', change: '-2.3%' },
  },
  liveVisitors: 182,
  visitorData: generateVisitorData(),
  sources: [
    { name: 'Google', visitors: 35420, change: '+22%' },
    { name: 'Direct', visitors: 21043, change: '+5%' },
    { name: 'X (Twitter)', visitors: 15888, change: '-8%' },
    { name: 'Facebook', visitors: 9123, change: '+15%' },
    { name: 'GitHub', visitors: 6543, change: '+3%' },
  ],
  deviceData: [
    { name: 'Desktop', value: 45 },
    { name: 'Mobile', value: 40 },
    { name: 'Tablet', value: 15 },
  ],
};

export const getMockAnalyticsData = (): Promise<AnalyticsData> => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(mockData);
    }, 1000); // Simulate network delay
  });
};

const mockUsers: User[] = [
    { id: 'user-1', name: 'Satoshi Nakamoto', email: 'satoshi@gmx.com', lastLogin: '2 hours ago', projectCount: 3, status: 'Active' },
    { id: 'user-2', name: 'Vitalik Buterin', email: 'vitalik@ethereum.org', lastLogin: '1 day ago', projectCount: 1, status: 'Active' },
    { id: 'user-3', name: 'Charles Hoskinson', email: 'charles@cardano.io', lastLogin: '5 days ago', projectCount: 5, status: 'Inactive' },
    { id: 'user-4', name: 'Gavin Wood', email: 'gavin@polkadot.network', lastLogin: '2 weeks ago', projectCount: 2, status: 'Active' },
];

export const getMockUsers = (): Promise<User[]> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(mockUsers);
        }, 500); // Simulate network delay
    });
};
