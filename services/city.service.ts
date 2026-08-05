import { API_URL } from '@/contants/urls';
import { BaseService } from './base.service';

const baseUrl = `${API_URL}cities/`;

class CityService extends BaseService {
    constructor() {
        super(baseUrl)
    }
}

export const cityService = new CityService();

