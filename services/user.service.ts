import axiosInstance from '@/helpers/api/axiosInstance';
import { API_URL } from '@/contants/urls';
import { BaseResponse, PagedResponse, SearchParams } from '@/models/common';
import { UserRequest } from '@/models/request/user-request.model';
import { UserResponse } from '@/models/response/user-response.model';

type AdminUserListResponse = {
  items?: UserResponse[];
  nextCursor?: string | null;
  hasMore?: boolean;
};

type UserFilterParams = {
  q?: string;
  role?: string;
  status?: string;
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

async function fetchAllUsers(params: UserFilterParams): Promise<UserResponse[]> {
  const items: UserResponse[] = [];
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
      return items;
    }

    cursor = data.nextCursor;
  }
}

export class UserService {
  search = async (params: SearchParams<UserResponse>): Promise<PagedResponse<UserResponse>> => {
    const filters = parseFilter(params.filter);
    const allItems = await fetchAllUsers(filters);
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
}

export const userService = new UserService();
