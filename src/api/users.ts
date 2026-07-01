import api from './index';
import type { AuthUser } from './auth';

export interface CreateUserRequest {
  username: string;
  password: string;
  display_name?: string;
}

export const usersApi = {
  list: () => api.get<AuthUser[]>('/users'),
  create: (data: CreateUserRequest) => api.post<AuthUser>('/users', { ...data, role: 'user' }),
  delete: (id: number) => api.delete(`/users/${id}`),
  resetPassword: (id: number, newPassword: string) =>
    api.put(`/users/${id}/password`, { new_password: newPassword }),
  transferAdmin: (targetUserId: number) =>
    api.post('/users/transfer-admin', { target_user_id: targetUserId }),
};
