import { apiRequest } from '@/helpers/api/openapiClient';
import { TokenResponse } from '@/models';
import { AuthLoginRequest } from '@/models/request/auth-login-request.model';
import { jwtDecode } from "jwt-decode";

export const authService = {
    login,
};

async function login(username: string, password: string) {
    try {
        const body: AuthLoginRequest = {
            email: username,
            password,
            clientContext: 'ADMIN_BO',
        };

        const response = await apiRequest<TokenResponse>('POST', '/v1/auth/login', body);
        const jwt: any = jwtDecode(response.accessToken);
        const tokenResponse = response as TokenResponse;
        tokenResponse.authorities = jwt.authorities;
        return tokenResponse;
    } catch (error) {
        throw error;
    }
}
