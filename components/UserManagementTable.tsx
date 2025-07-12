import React from 'react';
import { Icon } from './Icon';
import type { User } from '../types';

interface UserManagementTableProps {
  users: User[];
  onDeleteUser: (userId: string) => void;
}

export const UserManagementTable: React.FC<UserManagementTableProps> = ({ users, onDeleteUser }) => {
  return (
    <div className="flow-root">
      <div className="-mx-6 -my-2 overflow-x-auto">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <table className="min-w-full divide-y divide-gray-700">
            <thead>
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-0">Name</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Email</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Status</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Projects</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Last Login</th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-0">{user.name}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">{user.email}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                      user.status === 'Active' ? 'bg-green-500/10 text-green-400 ring-1 ring-inset ring-green-500/20' : 'bg-gray-400/10 text-gray-400 ring-1 ring-inset ring-gray-400/20'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-400">{user.projectCount}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">{user.lastLogin}</td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                    <button
                        onClick={() => onDeleteUser(user.id)}
                        className="text-red-500 hover:text-red-400 p-1 rounded-md hover:bg-gray-700 transition-colors"
                        aria-label={`Delete user ${user.name}`}
                    >
                        <Icon name="trash" className="h-5 w-5" />
                    </button>
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
