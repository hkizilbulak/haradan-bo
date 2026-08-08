import axiosInstance from '@/helpers/api/axiosInstance';
import { API_URL } from '@/contants/urls';

export type ProviderEmailTemplateSummary = {
  id: string;
  name: string;
  status?: string | null;
  alias?: string | null;
};

type ProviderEmailTemplateListResponse = {
  items: ProviderEmailTemplateSummary[];
};

type ProviderEmailTemplateVariablesResponse = {
  variables: string[];
};

const baseUrl = `${API_URL}v1/admin/email-templates/provider`;

export class ProviderEmailTemplateService {
  list = async (): Promise<ProviderEmailTemplateSummary[]> => {
    const response = await axiosInstance.get(baseUrl);
    const data = response.data as ProviderEmailTemplateListResponse;
    return data.items ?? [];
  };

  getVariables = async (templateId: string): Promise<string[]> => {
    const response = await axiosInstance.get(`${baseUrl}/${encodeURIComponent(templateId)}/variables`);
    const data = response.data as ProviderEmailTemplateVariablesResponse;
    return data.variables ?? [];
  };
}

export const providerEmailTemplateService = new ProviderEmailTemplateService();
