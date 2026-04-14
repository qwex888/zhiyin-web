import api from './index';
import type {
  PreviewItemInput,
  PreviewResponse,
  OrganizeApplyResponse,
  RollbackResponse,
  OrganizeSession,
  CreatePlanResponse,
  RootsResponse,
} from '@/types/scrape';

export const organizeApi = {
  getRoots: () => {
    return api.get<RootsResponse>('/organize/roots');
  },

  createPlan: (template: string, fileTemplate: string, rootPath: string, items: PreviewItemInput[]) => {
    return api.post<CreatePlanResponse>('/organize/plan', {
      template,
      file_template: fileTemplate,
      root_path: rootPath,
      items,
    });
  },

  preview: (template: string, fileTemplate: string, items: PreviewItemInput[]) => {
    return api.post<PreviewResponse>('/organize/preview', {
      template,
      file_template: fileTemplate,
      items,
    });
  },

  apply: (planId: number, rootPath: string, template: string, fileTemplate: string, items: PreviewItemInput[]) => {
    return api.post<OrganizeApplyResponse>('/organize/apply', {
      plan_id: planId,
      root_path: rootPath,
      template,
      file_template: fileTemplate,
      items,
    });
  },

  rollback: (sessionId: number) => {
    return api.post<RollbackResponse>('/organize/rollback', { session_id: sessionId });
  },

  getSession: (sessionId: number) => {
    return api.get<OrganizeSession>(`/organize/sessions/${sessionId}`);
  },
};
