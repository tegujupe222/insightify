
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { DeviceData } from '../types';

interface DeviceChartProps {
  data: DeviceData[];
}

const COLORS = ['#6366f1', '#a78bfa', '#f472b6']; // Indigo, Violet, Pink

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = <T extends { cx: number, cy: number, midAngle: number, innerRadius: number, outerRadius: number, percent: number }>({ cx, cy, midAngle, innerRadius, outerRadius, percent }: T) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="font-bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};


export const DeviceChart: React.FC<DeviceChartProps> = ({ data }) => {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
             cursor={{fill: 'transparent'}}
             contentStyle={{
                 backgroundColor: 'rgba(31, 41, 55, 0.8)',
                 borderColor: '#4b5563',
                 borderRadius: '0.5rem',
             }}
          />
          <Legend
            iconType="circle"
            layout="vertical"
            verticalAlign="middle"
            align="right"
            wrapperStyle={{ right: -10, color: '#d1d5db' }}
          />
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={140}
            innerRadius={70}
            fill="#8884d8"
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
