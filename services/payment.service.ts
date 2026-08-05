import { API_URL } from '@/contants/urls';
import { BaseService } from './base.service';

const baseUrl = `${API_URL}payments/`;

class PaymentService extends BaseService {
    constructor() {
        super(baseUrl)
    }
}

export const paymentService = new PaymentService();
