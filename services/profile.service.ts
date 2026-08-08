import axiosInstance from '@/helpers/api/axiosInstance';
import { API_URL } from '@/contants/urls';
import { SessionUserResponse } from '@/models';

export type UpdateMyProfileRequest = {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
};

const meUrl = `${API_URL}v1/me`;

export class ProfileService {
  getMe = async (): Promise<SessionUserResponse> => {
    const response = await axiosInstance.get(meUrl);
    return response.data as SessionUserResponse;
  };

  updateMe = async (request: UpdateMyProfileRequest): Promise<SessionUserResponse> => {
    const response = await axiosInstance.patch(meUrl, {
      firstName: request.firstName,
      lastName: request.lastName,
      phone: request.phone === '' ? null : request.phone,
    });
    return response.data as SessionUserResponse;
  };
}

export const profileService = new ProfileService();
