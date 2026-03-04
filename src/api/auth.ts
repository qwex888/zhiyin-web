import api from './index';

export interface AuthStatus {
  initialized: boolean;
  message: string;
}

export interface AuthUser {
  id: number;
  username: string;
  role: string;
  display_name: string | null;
  is_active: boolean;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export const authApi = {
  getStatus: () => api.get<AuthStatus>('/auth/status'),
  setup: (username: string, password: string) =>
    api.post<LoginResponse>('/setup', { username, password }),
  login: (username: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { username, password }),
  changePassword: (oldPassword: string, newPassword: string) =>
    api.put('/users/me/password', { old_password: oldPassword, new_password: newPassword }),
};
