import { API_URL } from '@/contants/urls';
import { BaseService } from './base.service';

const baseUrl = `${API_URL}users/`;

export class UserService extends BaseService {
    constructor() {
        super(baseUrl)
    }
}

export const userService = new UserService();


