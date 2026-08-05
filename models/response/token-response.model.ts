
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  clientContext?: string;
  authorities?: string[];
}
