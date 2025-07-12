
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { DailyStat } from '../types';

interface VisitorsChartProps {
  data: DailyStat[];
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/80 backdrop-blur-sm p-3 rounded-lg border border-gray-600 shadow-xl">
        <p className="label text-sm text-gray-300">{`${label}`}</p>
        <p className="intro font-bold text-white">{`Visits: ${payload[0].value.toLocaleString()}`}</p>
      </div>
    );
  }
  return null;
};

export const VisitorsChart: React.FC<VisitorsChartProps> = ({ data }) => {
  return (
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 20,
            left: -10,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
          <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${(value as number) / 1000}k`} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }} />
          <Line type="monotone" dataKey="visits" stroke="#818cf8" strokeWidth={2} dot={false} activeDot={{ r: 8, fill: '#6366f1', stroke: '#c7d2fe', strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
