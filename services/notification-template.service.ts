import axiosInstance from '@/helpers/api/axiosInstance';
import { API_URL } from '@/contants/urls';
import { BaseResponse, PagedResponse, SearchParams } from '@/models/common';

export interface NotificationTemplateResponse extends BaseResponse {
  id: string;
  eventType: string;
  name: string;
  inAppTitleTemplate: string;
  inAppBodyTemplate: string;
  resendTemplateId?: string | null;
  emailSubjectFallback?: string | null;
  isActive: boolean;
  version: number;
  updatedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationTemplateRequest {
  identifier?: string;
  expectedVersion: number;
  name: string;
  inAppTitleTemplate: string;
  inAppBodyTemplate: string;
  resendTemplateId?: string | null;
  emailSubjectFallback?: string;
  isActive: boolean;
}

type TemplateListResponse = { items?: NotificationTemplateResponse[] };

const baseUrl = `${API_URL}v1/admin/notification-templates`;

export class NotificationTemplateService {
  search = async (_params: SearchParams<NotificationTemplateResponse>): Promise<PagedResponse<NotificationTemplateResponse>> => {
    const response = await axiosInstance.get(baseUrl);
    const data = response.data as TemplateListResponse;
    const content = data.items ?? [];
    return {
      content,
      page: {
        size: content.length,
        totalElements: content.length,
        totalPages: 1,
        number: 0,
      },
    };
  };

  update = async (eventType: string, request: NotificationTemplateRequest) => {
    await axiosInstance.patch(`${baseUrl}/${eventType}`, {
      expectedVersion: request.expectedVersion,
      name: request.name,
      inAppTitleTemplate: request.inAppTitleTemplate,
      inAppBodyTemplate: request.inAppBodyTemplate,
      resendTemplateId: request.resendTemplateId === '' ? null : (request.resendTemplateId ?? undefined),
      emailSubjectFallback: request.emailSubjectFallback || undefined,
      isActive: request.isActive,
    });
  };
}

export const notificationTemplateService = new NotificationTemplateService();
