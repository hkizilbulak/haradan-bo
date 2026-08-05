import axiosInstance from '@/helpers/api/axiosInstance';
import { getErrorMessage } from '@/helpers/HelperUtils';
import { BaseResponse, PagedResponse, SearchParams } from '@/models/common';
import { BaseRequest } from '@/models/request/base-request.model';
import { toast } from 'react-toastify';


export class BaseService {
    baseUrl: string;
    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    search = async<T extends BaseResponse>(params: SearchParams<T>) => {
        try {
            console.log('params:',`${this.baseUrl}v2/search`)
            const response = await axiosInstance.post(`${this.baseUrl}v2/search`, params);
            const data = response.data as PagedResponse<T>;
            return data;
        } catch (error) {
            console.log('error:',error)
            toast.error(getErrorMessage(error))
            throw error;
        }
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
