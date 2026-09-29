import axiosInstance from '@/helpers/api/axiosInstance';

export interface CommunicationTemplate {
    id: string;
    title: string;
    channel: string;
    content: string;
    subject?: string;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export interface CommunicationTemplateInput {
    title: string;
    channel: string;
    content: string;
    subject?: string;
}

class CommunicationTemplateService {
    private baseUrl = '/api/v1/communication-templates';

    async getAll(): Promise<CommunicationTemplate[]> {
        const response = await axiosInstance.get(this.baseUrl);
        return response.data;
    }

    async create(data: CommunicationTemplateInput): Promise<CommunicationTemplate> {
        const response = await axiosInstance.post(this.baseUrl, data);
        return response.data;
    }

    async update(id: string, data: CommunicationTemplateInput): Promise<CommunicationTemplate> {
        const response = await axiosInstance.put(`${this.baseUrl}/${id}`, data);
        return response.data;
    }

    async delete(id: string): Promise<void> {
        await axiosInstance.delete(`${this.baseUrl}/${id}`);
    }
}

export const communicationTemplateService = new CommunicationTemplateService();
