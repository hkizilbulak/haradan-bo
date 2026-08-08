import axiosInstance from '@/helpers/api/axiosInstance';
import { withIdentifiers } from '@/helpers/api/mapIdentifier';
import { API_URL } from '@/contants/urls';
import { PagedResponse, SearchParams } from '@/models/common';
import { UserRequest } from '@/models/request/user-request.model';
import { UserResponse } from '@/models/response/user-response.model';

type AdminUserListItem = Omit<UserResponse, 'identifier'> & { id: string };

type AdminUserListResponse = {
  items?: AdminUserListItem[];
  nextCursor?: string | null;
  hasMore?: boolean;
};

type UserFilterParams = {
  q?: string;
  role?: string;
  status?: string;
};

export interface SecurityEvent {
  id: string;
  eventType: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT' | 'SESSION_REVOKED' | 'ALL_SESSIONS_REVOKED' | 'REFRESH_REPLAY_DETECTED' | 'PASSWORD_CHANGE' | 'PASSWORD_RESET' | 'EMAIL_VERIFICATION' | 'EMAIL_CHANGE' | 'ROLE_CHANGE' | 'ACCOUNT_STATUS_CHANGE' | 'BO_CONTEXT_REJECTED';
  createdAt: string;
  clientContext?: string | null;
  metadata?: Record<string, unknown>;
}

type SecurityEventListResponse = {
  items: SecurityEvent[];
  nextCursor?: string | null;
  hasMore: boolean;
};

const baseUrl = `${API_URL}v1/admin/users`;

function parseFilter(filter?: string): UserFilterParams {
  if (!filter) {
    return {};
  }

  return filter.split(';').reduce<UserFilterParams>((acc, token) => {
    const [key, value] = token.split('==');
    if (!key || !value) {
      return acc;
    }

    if (key === 'q') {
      acc.q = value.replace(/\*/g, '');
    }
    if (key === 'role') {
      acc.role = value;
    }
    if (key === 'status') {
      acc.status = value;
    }

    return acc;
  }, {});
}

export class UserService {
  search = async (params: SearchParams<UserResponse>): Promise<PagedResponse<UserResponse>> => {
    const filters = parseFilter(params.filter);
    const limit = params.pageRequest.size ?? 10;

    if (params.cursor !== undefined) {
      const response = await axiosInstance.get(baseUrl, {
        params: {
          cursor: params.cursor || undefined,
          limit,
          q: filters.q,
          role: filters.role,
          status: filters.status,
        },
      });
      const data = response.data as AdminUserListResponse;
      const content = withIdentifiers(data.items ?? []);
      const pageNumber = params.pageRequest.page ?? 0;
      return {
        content,
        page: {
          size: limit,
          number: pageNumber,
          totalElements: content.length,
          totalPages: data.hasMore ? pageNumber + 2 : pageNumber + 1,
          hasMore: Boolean(data.hasMore),
          nextCursor: data.nextCursor ?? null,
          cursorMode: true,
        },
      };
    }

    const allItems = await this.fetchAll(filters);
    const page = params.pageRequest.page ?? 0;
    const size = params.pageRequest.size ?? 10;
    const start = page * size;
    const content = allItems.slice(start, start + size);

    return {
      content,
      page: {
        size,
        totalElements: allItems.length,
        totalPages: Math.max(1, Math.ceil(allItems.length / size)),
        number: page,
      },
    };
  };

  fetchAll = async (params: UserFilterParams = {}): Promise<UserResponse[]> => {
    const items: AdminUserListItem[] = [];
    let cursor: string | undefined;

    while (true) {
      const response = await axiosInstance.get(baseUrl, {
        params: {
          cursor,
          limit: 100,
          q: params.q,
          role: params.role,
          status: params.status,
        },
      });

      const data = response.data as AdminUserListResponse;
      items.push(...(data.items ?? []));

      if (!data.hasMore || !data.nextCursor) {
        return withIdentifiers(items);
      }

      cursor = data.nextCursor;
    }
  };

  changeRole = async (userId: string, request: UserRequest) => {
    await axiosInstance.post(`${baseUrl}/${userId}/role`, {
      expectedCurrentRole: request.expectedCurrentRole,
      newRole: request.newRole,
    });
  };

  changeStatus = async (userId: string, request: UserRequest) => {
    await axiosInstance.post(`${baseUrl}/${userId}/status`, {
      expectedCurrentStatus: request.expectedCurrentStatus,
      newStatus: request.newStatus,
    });
  };

  getById = async (userId: string): Promise<UserResponse> => {
    const response = await axiosInstance.get(`${baseUrl}/${userId}`);
    const data = response.data as AdminUserListItem & {
      phone?: string | null;
      activeSessionCount?: number;
      updatedAt?: string;
    };
    return {
      ...withIdentifiers([data])[0],
      phone: data.phone ?? null,
      activeSessionCount: data.activeSessionCount,
      updatedAt: data.updatedAt,
    };
  };

  create = async (request: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: 'admin' | 'user';
  }): Promise<{ invitationEmailSent: boolean }> => {
    const response = await axiosInstance.post(baseUrl, {
      email: request.email,
      firstName: request.firstName,
      lastName: request.lastName,
      phone: request.phone || undefined,
      role: request.role,
    });
    return {
      invitationEmailSent: Boolean(response.data?.invitationEmailSent),
    };
  };

  updateProfile = async (userId: string, request: {
    expectedUpdatedAt: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
  }): Promise<UserResponse> => {
    const response = await axiosInstance.patch(`${baseUrl}/${userId}`, {
      expectedUpdatedAt: request.expectedUpdatedAt,
      firstName: request.firstName,
      lastName: request.lastName,
      phone: request.phone ?? null,
    });
    const data = response.data as AdminUserListItem & {
      phone?: string | null;
      activeSessionCount?: number;
      updatedAt?: string;
    };
    return {
      ...withIdentifiers([data])[0],
      phone: data.phone ?? null,
      activeSessionCount: data.activeSessionCount,
      updatedAt: data.updatedAt,
    };
  };

  requestEmailChange = async (userId: string, newEmail: string): Promise<void> => {
    await axiosInstance.post(`${baseUrl}/${userId}/email/change-request`, { newEmail });
  };

  resendInvitation = async (
    userId: string,
  ): Promise<{ invitationEmailSent: boolean } & Partial<UserResponse>> => {
    const response = await axiosInstance.post(`${baseUrl}/${userId}/invitation/resend`);
    const data = (response.data ?? {}) as AdminUserListItem & {
      invitationEmailSent?: boolean;
      phone?: string | null;
      activeSessionCount?: number;
      updatedAt?: string;
    };
    const mapped = data.id ? withIdentifiers([data])[0] : undefined;
    return {
      invitationEmailSent: Boolean(data.invitationEmailSent),
      ...(mapped ?? {}),
      phone: data.phone ?? mapped?.phone,
      activeSessionCount: data.activeSessionCount,
      updatedAt: data.updatedAt,
    };
  };

  getSecurityEvents = async (userId: string): Promise<SecurityEvent[]> => {
    const items: SecurityEvent[] = [];
    let cursor: string | undefined;
    while (true) {
      const response = await axiosInstance.get(`${baseUrl}/${userId}/security-events`, {
        params: { cursor, limit: 50 },
      });
      const data = response.data as SecurityEventListResponse;
      items.push(...data.items);
      if (!data.hasMore || !data.nextCursor) {
        return items;
      }
      cursor = data.nextCursor;
    }
  };
}

export const userService = new UserService();
