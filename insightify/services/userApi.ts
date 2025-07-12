import type { User } from '@/types';

const API_BASE = '/api/users';

export async function fetchUsers(token: string): Promise<User[]> {
  const res = await fetch(API_BASE, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch users');
  const data = await res.json();
  return data.data.users;
}

export async function deleteUser(id: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to delete user');
}

export async function banUser(id: string, isBanned: boolean, token: string): Promise<User> {
  const res = await fetch(`${API_BASE}/${id}/ban`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ isBanned })
  });
  if (!res.ok) throw new Error('Failed to update ban status');
  const data = await res.json();
  return data.data.user;
}

export async function changeUserRole(id: string, role: 'admin' | 'user', token: string): Promise<User> {
  const res = await fetch(`${API_BASE}/${id}/role`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ role })
  });
  if (!res.ok) throw new Error('Failed to update user role');
  const data = await res.json();
  return data.data.user;
}

export async function updateUser(id: string, updates: Partial<User>, token: string): Promise<User> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('Failed to update user');
  const data = await res.json();
  return data.data.user;
} 