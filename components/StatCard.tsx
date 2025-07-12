
import React from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  iconName: IconName;
  changeColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, change, iconName, changeColor = "text-green-400" }) => {
  return (
    <div className="bg-gray-800 p-5 rounded-xl shadow-lg border border-gray-700 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <div className="bg-gray-700 p-2 rounded-md">
           <Icon name={iconName} className="h-5 w-5 text-gray-300" />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-white">{value}</p>
        <p className={`text-sm ${changeColor}`}>{change} vs last month</p>
      </div>
    </div>
  );
};
