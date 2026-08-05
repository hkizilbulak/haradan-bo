import { BaseResponse } from '@/models/common';
import { EntityStatusEnum } from '@/models/enums';

export interface PaymentResponse extends BaseResponse {
    ip: string;
    merchantId: string;
    notifyRequest: string;
    notifyResponse: string;
    paymentAmount: string;
    productId: string;
    productName: string;
    status: EntityStatusEnum;
    tokenRequest: string;
    tokenResponse: string;
    userAddress: string;
    userEmail: string;
    userName: string;
    userPhone: string;
}
