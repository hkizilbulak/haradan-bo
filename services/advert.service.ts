import { API_URL } from '@/contants/urls';
import { BaseService } from './base.service';

const baseUrl = `${API_URL}adverts/`;

class AdvertService extends BaseService {
    constructor() {
        super(baseUrl)
    }
}

export const advertService = new AdvertService();



