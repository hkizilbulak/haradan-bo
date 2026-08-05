import { apiRequest } from '@/helpers/api/openapiClient';
import { TokenResponse } from '@/models';
import { jwtDecode } from "jwt-decode";
import axiosInstance from '@/helpers/api/axiosInstance';
import { AxiosRequestConfig } from 'axios';

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

        const response = await axiosInstance.post(`auth/token`, body, config);
        const jwt: any = jwtDecode(response.data.access_token);
        
        // Map OAuth2 response (snake_case) to TokenResponse (camelCase)
        const tokenResponse: TokenResponse = {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token,
            tokenType: response.data.token_type,
            expiresIn: response.data.expires_in,
            authorities: jwt.authorities,
        };
        
        return tokenResponse;
    } catch (error) {
        throw error;
    }
}
