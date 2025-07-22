
import React from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  iconName?: IconName;
  icon?: string;
  changeColor?: string;
  trend?: string;
  trendDirection?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, change, iconName, icon, changeColor = "text-green-400", trend, trendDirection }) => {
  return (
    <div className="bg-gray-800 p-5 rounded-xl shadow-lg border border-gray-700 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <div className="bg-gray-700 p-2 rounded-md">
           {iconName && <Icon name={iconName} className="h-5 w-5 text-gray-300" />}
           {icon && <span className="h-5 w-5 text-gray-300">{icon}</span>}
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-white">{value}</p>
        <p className={`text-sm ${changeColor}`}>{change} vs last month</p>
        {trend && <span className="text-xs ml-2">{trend} {trendDirection}</span>}
      </div>
    </div>
  );
};
