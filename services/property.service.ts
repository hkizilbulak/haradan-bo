import { API_URL } from '@/contants/urls';
import { BaseService } from './base.service';

const baseUrl = `${API_URL}properties/`;

class PropertyService extends BaseService {
    constructor() {
        super(baseUrl)
    }
}

export const propertyService = new PropertyService();

