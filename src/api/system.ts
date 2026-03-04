import api from './index';
import type { SystemConfig, UpdateConfigParams } from '@/types/config';
import type { ScanSnapshot } from '@/types';

export interface HealthInfo {
  status: string;
  version: string;
  git_hash: string;
  build_time: string;
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
};
