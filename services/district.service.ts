import { API_URL } from '@/contants/urls';
import { BaseService } from './base.service';

const baseUrl = `${API_URL}districts/`;

class DistrictService extends BaseService {
    constructor() {
        super(baseUrl)
    }
}

export const districtService = new DistrictService();

