import api from './index';
import type { SystemConfig, UpdateConfigParams } from '@/types/config';
import type { ScanSnapshot } from '@/types';

export interface HealthInfo {
  status: string;
  version: string;
  git_hash: string;
  build_time: string;
}

export interface ResetAllResponse {
  success: boolean;
  message: string;
  cleared: string[];
}

export interface DirEntry {
  name: string;
  path: string;
  is_dir: boolean;
}

export interface BrowseDirResponse {
  current: string;
  parent: string | null;
  entries: DirEntry[];
}

export interface MkdirResponse {
  success: boolean;
  path: string;
}

export const systemApi = {
  triggerScan: () => {
    return api.post('/scan');
  },
  getScanStatus: () => {
    return api.get<ScanSnapshot>('/scan/status');
  },
  getJobStatus: () => {
    return api.get('/jobs/status');
  },
  getHealth: () => {
    return api.get<HealthInfo>('/health');
  },
  getConfig: () => {
    return api.get<SystemConfig>('/config');
  },
  updateConfig: (config: UpdateConfigParams) => {
    return api.put('/config', config);
  },
  resetAllData: () => {
    return api.post<ResetAllResponse>('/system/reset-all', { confirm: 'CONFIRM_RESET_ALL' });
  },
  browseDir: (path = '/') => {
    return api.get<BrowseDirResponse>('/system/browse-dir', { params: { path } });
  },
  mkdir: (path: string) => {
    return api.post<MkdirResponse>('/system/mkdir', { path });
  },
};
