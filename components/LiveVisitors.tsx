
import React from 'react';

interface LiveVisitorsProps {
  initialCount: number;
}

export const LiveVisitors: React.FC<LiveVisitorsProps> = ({ initialCount }) => {
  // ランダム変動をやめ、propsの値のみ表示
  return (
    <div className="bg-gray-800 p-5 rounded-xl shadow-lg border border-gray-700 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-400">Live Visitors</p>
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
        </span>
      </div>
      <div>
        <p className="text-3xl font-bold text-white">{initialCount}</p>
        <p className="text-sm text-gray-400">on your site right now</p>
      </div>
    </div>
  );
};
