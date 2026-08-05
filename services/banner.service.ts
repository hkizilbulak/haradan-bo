import { API_URL } from '@/contants/urls';
import { BaseService } from './base.service';

const baseUrl = `${API_URL}banners/`;

class BannerService extends BaseService {
    constructor() {
        super(baseUrl)
    }
}

export const bannerService = new BannerService();



