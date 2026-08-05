import { BaseResponse } from '@/models/common';
import { EntityStatusEnum } from '../enums/entity-status.enum';

export interface DopingResponse extends BaseResponse {
    approveDate: string;
    desc: string;
    expireDate: string;
    image: string;
    name: string;
    price: number;
    searchText: string;
    shortName: string;
    status: EntityStatusEnum;
}