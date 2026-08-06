import axiosInstance from '@/helpers/api/axiosInstance';
import { BaseRequest } from '@/models/request/base-request.model';


export class BaseService {
    baseUrl: string;
    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    save = async (request: BaseRequest) => {
        try {
            await axiosInstance.post(`${this.baseUrl}`, request);
        } catch (error) {
            throw error;
        }
    }

    update = async (request: BaseRequest) => {
        try {
            await axiosInstance.put(`${this.baseUrl}${request.identifier}`, request);
        } catch (error) {
            throw error;
        }
    }

    _delete = async (identifier: string) => {
        try {
            await axiosInstance.delete(`${this.baseUrl}${identifier}`);
        } catch (error) {
            throw error;
        }
    }
}
