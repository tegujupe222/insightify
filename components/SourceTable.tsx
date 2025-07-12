
import React from 'react';
import { Icon } from './Icon';
import type { Source } from '../types';

interface SourceTableProps {
  data: Source[];
}

export const SourceTable: React.FC<SourceTableProps> = ({ data }) => {
  return (
    <div className="flow-root">
      <div className="-my-2 overflow-x-auto">
        <div className="inline-block min-w-full py-2 align-middle">
          <table className="min-w-full divide-y divide-gray-700">
            <thead>
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-0">Source</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Visitors</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {data.map((source) => (
                <tr key={source.name}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-300 sm:pl-0">{source.name}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">{source.visitors.toLocaleString()}</td>
                  <td className={`whitespace-nowrap px-3 py-4 text-sm ${source.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                    <div className="flex items-center">
                      <Icon name={source.change.startsWith('+') ? 'trendingUp' : 'trendingDown'} className="h-4 w-4 mr-1" />
                      {source.change}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
