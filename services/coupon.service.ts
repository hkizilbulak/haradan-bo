import axiosInstance from '@/helpers/api/axiosInstance';
import { API_URL } from '@/contants/urls';
import { BaseResponse, PagedResponse, SearchParams } from '@/models/common';

export interface CouponResponse extends BaseResponse {
  id: string;
  code: string;
  name: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  maxUses?: number | null;
  usesCount: number;
  maxUsesPerUser: number;
  minSpendAmountMinor?: number | null;
  applicablePackageCode?: string | null;
  startsAt: string;
  endsAt?: string | null;
  isActive: boolean;
  createdByUserId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCouponPayload {
  code: string;
  name: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  maxUses?: number | null;
  maxUsesPerUser: number;
  minSpendAmountMinor?: number | null;
  applicablePackageCode?: string | null;
  startsAt: string;
  endsAt?: string | null;
}

export interface UpdateCouponPayload {
  expectedVersion: number;
  name: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  maxUses?: number | null;
  maxUsesPerUser: number;
  minSpendAmountMinor?: number | null;
  applicablePackageCode?: string | null;
  startsAt: string;
  endsAt?: string | null;
  isActive: boolean;
}

export interface ListCouponsResponse {
  content: CouponResponse[];
  total: number;
  limit: number;
  offset: number;
}

const baseUrl = `${API_URL}v1/admin/coupons`;

export class CouponService {
  search = async (params: SearchParams<CouponResponse>): Promise<PagedResponse<CouponResponse>> => {
    const limit = params.pageRequest.size ?? 10;
    const offset = (params.pageRequest.page ?? 0) * limit;
    const response = await axiosInstance.get(baseUrl, {
      params: {
        search: params.filter || undefined,
        limit,
        offset,
      },
    });
    const data = response.data as ListCouponsResponse;
    const totalPages = Math.ceil(data.total / limit) || 1;
    return {
      content: data.content,
      page: {
        size: limit,
        number: params.pageRequest.page ?? 0,
        totalElements: data.total,
        totalPages,
      },
    };
  };

  getById = async (id: string): Promise<CouponResponse> => {
    const response = await axiosInstance.get(`${baseUrl}/${id}`);
    return response.data as CouponResponse;
  };

  create = async (payload: CreateCouponPayload): Promise<CouponResponse> => {
    const response = await axiosInstance.post(baseUrl, payload);
    return response.data as CouponResponse;
  };

  update = async (id: string, payload: UpdateCouponPayload): Promise<CouponResponse> => {
    const response = await axiosInstance.put(`${baseUrl}/${id}`, payload);
    return response.data as CouponResponse;
  };

  setActive = async (id: string, expectedVersion: number, isActive: boolean): Promise<CouponResponse> => {
    const response = await axiosInstance.patch(`${baseUrl}/${id}/active`, { expectedVersion, isActive });
    return response.data as CouponResponse;
  };
}

export const couponService = new CouponService();
