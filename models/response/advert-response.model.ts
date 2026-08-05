import { BaseResponse } from '@/models/common';
import { CategoryResponse, DopingResponse, UserResponse } from '..';
import { EntityStatusEnum } from '@/models/enums';

export interface AdvertResponse extends BaseResponse {
    advertNo: number;
    title: string;
    url: string;
    category: CategoryResponse;
    charged: boolean;
    city: string;
    district: string;
    description: string;
    imageUrl: string;
    price: number;
    user: UserResponse;
    viewCount: number;
    dopigns: DopingResponse[];
    status: EntityStatusEnum;
}