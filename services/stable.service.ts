import { API_URL } from '@/contants/urls';
import { BaseService } from './base.service';

const baseUrl = `${API_URL}stables/`;

export class StableService extends BaseService {
    constructor() {
        super(baseUrl)
    }
}

export const stableService = new StableService();