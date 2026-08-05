import { API_URL } from '@/contants/urls';
import axiosInstance from '@/helpers/api/axiosInstance';

const baseUrl = `${API_URL}cache/`;

export const cacheService = {
    _delete
};

async function _delete(cacheName?: string, cacheKeyName?: string) {
    try {
        let url = cacheName ? `${cacheName}` : '';
        url = cacheKeyName ? url.concat(`/${cacheKeyName}`) : url;
        await axiosInstance.delete(`${baseUrl}${url}`);
    } catch (error) {
        throw error;
    }
}



