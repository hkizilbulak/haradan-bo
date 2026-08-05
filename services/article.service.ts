import { API_URL } from '@/contants/urls';
import { BaseService } from './base.service';

const baseUrl = `${API_URL}articles/`;

class ArticleService extends BaseService {
    constructor() {
        super(baseUrl)
    }
}

export const articleService = new ArticleService();

