import axios from 'axios';

export type CommentStatus = 'PENDING' | 'PUBLISHED' | 'REJECTED';

export interface AdvertComment {
  id: string;
  advertId: string;
  userId: string;
  content: string;
  rating?: number;
  status: CommentStatus;
  createdAt: string;
  updatedAt: string;
  authorName?: string;
  advertTitle?: string;
}

export interface ListCommentsResponse {
  items: AdvertComment[];
  totalCount: number;
}

const apiClient = axios.create({
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json; charset=utf-8',
  },
  withCredentials: true,
});

function getDevUrl(path: string) {
  const proxyUrl = process.env.NEXT_PUBLIC_DEV_PROXY_URL;
  if (typeof window !== 'undefined' && proxyUrl) {
    return proxyUrl + path;
  }
  return path;
}

export const commentService = {
  getComments: async (
    status?: CommentStatus,
    page: number = 1,
    limit: number = 20
  ): Promise<ListCommentsResponse> => {
    const offset = (page - 1) * limit;
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    if (status) {
      params.append('status', status);
    }
    const response = await apiClient.get<any>(
      getDevUrl(`/api/v1/admin/comments?${params.toString()}`)
    );
    
    return {
      totalCount: response.data.TotalCount || 0,
      items: (response.data.Items || []).map((item: any) => ({
        id: item.Comment.ID,
        advertId: item.Comment.AdvertID,
        userId: item.Comment.UserID,
        content: item.Comment.Content,
        rating: item.Comment.Rating,
        status: item.Comment.Status,
        createdAt: item.Comment.CreatedAt,
        updatedAt: item.Comment.UpdatedAt,
        authorName: item.AuthorName,
        advertTitle: item.AdvertTitle,
      }))
    };
  },

  approveComment: async (id: string): Promise<void> => {
    await apiClient.patch(getDevUrl(`/api/v1/admin/comments/${id}/approve`));
  },

  rejectComment: async (id: string): Promise<void> => {
    await apiClient.patch(getDevUrl(`/api/v1/admin/comments/${id}/reject`));
  },

  deleteComment: async (id: string): Promise<void> => {
    await apiClient.delete(getDevUrl(`/api/v1/admin/comments/${id}`));
  },
};
