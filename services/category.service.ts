import { API_URL } from '@/contants/urls';
import axiosInstance from '@/helpers/api/axiosInstance';
import { CategoryResponse } from '@/models/response/category-response.model';
import { BaseService } from './base.service';

const baseUrl = `${API_URL}categories/`;

class CategoryService extends BaseService {
    constructor() {
        super(baseUrl)
    }

    getParentCategories = async () => {
        try {
            const response = await axiosInstance.get(`${this.baseUrl}`);
            const data = response.data as CategoryResponse[];
            return data;
        } catch (error) {
            throw error;
        }
    }
}

export const categoryService = new CategoryService();



