import axiosInstance from '@/helpers/api/axiosInstance';
import { withIdentifiers } from '@/helpers/api/mapIdentifier';
import { API_URL } from '@/contants/urls';
import { PagedResponse, SearchParams } from '@/models/common';
import { UserRequest } from '@/models/request/user-request.model';
import { UserResponse, UserConsentLog } from '@/models/response/user-response.model';
import { UserRole } from '@/models/response/session-response.model';
import { toCanonicalPhoneTR } from '@/helpers/phone';

type AdminUserListItem = Omit<UserResponse, 'identifier'> & { id: string };

type AdminUserListResponse = {
  items?: AdminUserListItem[];
  nextCursor?: string | null;
  hasMore?: boolean;
  totalCount?: number;
};

type UserFilterParams = {
  q?: string;
  role?: string;
  status?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
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
    if (key === 'firstName') {
      acc.firstName = value.replace(/\*/g, '');
    }
    if (key === 'lastName') {
      acc.lastName = value.replace(/\*/g, '');
    }
    if (key === 'email') {
      acc.email = value.replace(/\*/g, '');
    }
    if (key === 'phone') {
      acc.phone = value.replace(/\*/g, '');
    }

    return acc;
  }, {});
}

export class UserService {
  search = async (params: SearchParams<UserResponse>): Promise<PagedResponse<UserResponse>> => {
    const filters = parseFilter(params.filter);
    const limit = params.pageRequest?.size ?? 10;
    const page = params.pageRequest?.page ?? 0;
    const offset = page * limit;

    const searchTerms = [filters.q, filters.firstName, filters.lastName, filters.email, filters.phone]
      .filter(Boolean)
      .join(' ')
      .trim();

    const response = await axiosInstance.get(baseUrl, {
      params: {
        cursor: params.cursor || undefined,
        limit,
        offset,
        q: searchTerms || undefined,
        role: filters.role || undefined,
        status: filters.status || undefined,
      },
    });

    const data = response.data as AdminUserListResponse;
    const content = withIdentifiers(data.items ?? []);
    const totalElements = data.totalCount ?? content.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / limit));

    return {
      content,
      page: {
        size: limit,
        number: page,
        totalElements,
        totalPages,
        hasMore: Boolean(data.hasMore),
        nextCursor: data.nextCursor ?? null,
      },
    };
  };

  fetchAll = async (params: UserFilterParams = {}): Promise<UserResponse[]> => {
    const items: AdminUserListItem[] = [];
    let cursor: string | undefined;
    let iterations = 0;
    const maxIterations = 50;

    while (iterations < maxIterations) {
      iterations++;
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

      if (!data.hasMore || !data.nextCursor || data.nextCursor === cursor) {
        break;
      }

      cursor = data.nextCursor;
    }

    let mapped = withIdentifiers(items);

    if (params.firstName && params.firstName.trim() !== '') {
      const term = params.firstName.trim().toLowerCase();
      mapped = mapped.filter((u) => u.firstName?.toLowerCase().includes(term));
    }
    if (params.lastName && params.lastName.trim() !== '') {
      const term = params.lastName.trim().toLowerCase();
      mapped = mapped.filter((u) => u.lastName?.toLowerCase().includes(term));
    }
    if (params.email && params.email.trim() !== '') {
      const term = params.email.trim().toLowerCase();
      mapped = mapped.filter((u) => u.email?.toLowerCase().includes(term));
    }
    if (params.phone && params.phone.trim() !== '') {
      const term = params.phone.trim().replace(/\s+/g, '');
      mapped = mapped.filter((u) => u.phone && u.phone.replace(/\s+/g, '').includes(term));
    }

    return mapped;
  };

  checkDuplicate = async (email: string, phone?: string | null, excludeUserId?: string): Promise<{ emailExists: boolean; phoneExists: boolean }> => {
    const allUsers = await this.fetchAll();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone ? toCanonicalPhoneTR(phone) : null;

    let emailExists = false;
    let phoneExists = false;

    for (const u of allUsers) {
      const uId = u.identifier ?? u.id;
      if (excludeUserId && uId === excludeUserId) continue;

      if (u.email && u.email.trim().toLowerCase() === cleanEmail) {
        emailExists = true;
      }
      if (cleanPhone && u.phone && toCanonicalPhoneTR(u.phone) === cleanPhone) {
        phoneExists = true;
      }
    }

    return { emailExists, phoneExists };
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

  delete = async (userId: string): Promise<void> => {
    await axiosInstance.delete(`${baseUrl}/${userId}`);
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
    role: UserRole;
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

  getSecurityEvents = async (userId: string, limit = 50): Promise<SecurityEvent[]> => {
    const response = await axiosInstance.get(`${baseUrl}/${userId}/security-events`, {
      params: { limit },
    });
    const data = response.data as SecurityEventListResponse;
    return data.items ?? [];
  };

  getConsentLogs = async (userId: string): Promise<UserConsentLog[]> => {
    const response = await axiosInstance.get(`${baseUrl}/${userId}/consent-logs`);
    return (response.data?.items ?? response.data ?? []) as UserConsentLog[];
  };
}

export const userService = new UserService();
