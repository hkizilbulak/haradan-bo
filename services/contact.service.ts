import { API_URL } from '@/contants/urls';
import { BaseService } from './base.service';

const baseUrl = `${API_URL}contacts/`;

class ContactService extends BaseService {
    constructor() {
        super(baseUrl)
    }
}

export const contactService = new ContactService();



