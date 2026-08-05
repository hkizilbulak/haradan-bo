import { API_URL } from '@/contants/urls';
import axiosInstance from '@/helpers/api/axiosInstance';
import { TokenResponse } from '@/models';
import { AxiosRequestConfig } from 'axios';
import { jwtDecode } from "jwt-decode";

const baseUrl = `${API_URL}auth/`;

export const authService = {
    login,
};

async function login(username: string, password: string) {
    try {

        let body = new URLSearchParams({
            grant_type: 'password',
            username,
            password,
        });

        let config = {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": "Basic aGFyYWRhbjpoYXJhUA=="
            }
        } as AxiosRequestConfig

        const response = await axiosInstance.post(`${baseUrl}token`, body, config);
        const jwt: any = jwtDecode(response.data.access_token);
        const tokenResponse = response.data as TokenResponse;
        tokenResponse.authorities = jwt.authorities;
        return tokenResponse;
    } catch (error) {
        throw error;
    }
}
