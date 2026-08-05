
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  firstName: string;
  lastName: string;
  id: string;
  jti: string;
  authorities: string[];
}
