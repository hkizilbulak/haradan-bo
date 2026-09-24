import axiosInstance from '@/helpers/api/axiosInstance';
import { API_URL, buildMediaUrl } from '@/contants/urls';

export type MediaDeliveryProfile = 'HOMEPAGE' | 'DETAIL' | 'SEARCH' | 'BANNER';

/** OpenAPI MediaAssetLifecycle */
export type MediaAssetLifecycle =
  | 'UPLOAD_PENDING'
  | 'UPLOADED'
  | 'VALIDATING'
  | 'MASTER_READY'
  | 'VALIDATION_FAILED'
  | 'CLEANUP_CANDIDATE'
  | 'DELETING'
  | 'PHYSICALLY_DELETED';

export type InitiateMediaUploadResponse = {
  assetId: string;
  upload: {
    method: 'PUT';
    url: string;
    expiresAt: string;
    headers?: Record<string, string>;
  };
  constraints: {
    allowedContentTypes: string[];
    maxByteSize: number;
    requiredHeaders: string[];
  };
};

export type MediaProcessingStatusResponse = {
  assetId: string;
  lifecycleStatus: MediaAssetLifecycle | string;
  failureMessage?: string | null;
  variants?: Array<{
    transformProfile: string;
    lifecycleStatus: string;
    publicUrl?: string | null;
  }>;
};

const SUCCESS_TERMINAL: MediaAssetLifecycle = 'MASTER_READY';

const FAILURE_TERMINAL = new Set<MediaAssetLifecycle>([
  'VALIDATION_FAILED',
  'CLEANUP_CANDIDATE',
  'DELETING',
  'PHYSICALLY_DELETED',
]);

const baseUrl = `${API_URL}v1/admin/media`;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function bannerVariantReady(status: MediaProcessingStatusResponse) {
  if (status.lifecycleStatus !== SUCCESS_TERMINAL) {
    return false;
  }
  const bannerVariant = status.variants?.find((variant) => variant.transformProfile === 'BANNER');
  if (bannerVariant) {
    return bannerVariant.lifecycleStatus === 'READY';
  }
  return true;
}

function processingFailureMessage(status: MediaProcessingStatusResponse) {
  if (status.failureMessage?.trim()) {
    return status.failureMessage;
  }
  if (status.lifecycleStatus === 'VALIDATION_FAILED') {
    return 'Yüklenen görsel doğrulamadan geçemedi.';
  }
  const bannerVariant = status.variants?.find((variant) => variant.transformProfile === 'BANNER');
  if (bannerVariant?.lifecycleStatus === 'FAILED') {
    return 'Banner önizlemesi hazırlanamadı. Lütfen tekrar deneyin.';
  }
  return undefined;
}

export class MediaService {
  initiateUpload = async (declaredContentType: string, declaredByteSize: number) => {
    const response = await axiosInstance.post(`${baseUrl}/uploads`, {
      declaredContentType,
      declaredByteSize,
    });
    return response.data as InitiateMediaUploadResponse;
  };

  confirmUpload = async (assetId: string) => {
    const response = await axiosInstance.post(`${baseUrl}/assets/${assetId}/confirm`);
    return response.data as MediaProcessingStatusResponse;
  };

  getStatus = async (assetId: string) => {
    const response = await axiosInstance.get(`${baseUrl}/assets/${assetId}`);
    return response.data as MediaProcessingStatusResponse;
  };

  /**
   * Uploads an admin asset. First attempts the BFF /api/bo/media-upload relay (with
   * DEV_PROXY_URL and auth headers), and gracefully falls back to the direct backend
   * flow (initiateUpload -> PUT /v1/media/assets/:id/content -> confirmUpload).
   */
  uploadAdminAsset = async (
    file: File,
    options?: { pollAttempts?: number; pollDelayMs?: number; onStageChange?: (stage: 'UPLOADING' | 'PROCESSING') => void },
  ): Promise<MediaProcessingStatusResponse> => {
    options?.onStageChange?.('UPLOADING');

    let assetId: string | null = null;

    // 1. Try BFF relay route with proper proxy URL and auth token
    try {
      let boUploadUrl = '/api/bo/media-upload';
      if (typeof window !== 'undefined') {
        const proxyUrl = process.env.NEXT_PUBLIC_DEV_PROXY_URL;
        if (proxyUrl && window.location.origin !== proxyUrl) {
          boUploadUrl = `${proxyUrl.replace(/\/+$/, '')}/api/bo/media-upload`;
        }
      }

      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token') ||
            localStorage.getItem('token') ||
            localStorage.getItem('accessToken') ||
            localStorage.getItem('auth_token') ||
            localStorage.getItem('haradan_admin_token') ||
            sessionStorage.getItem('token') ||
            sessionStorage.getItem('accessToken')
          : null;

      const uploadHeaders: Record<string, string> = { 'Content-Type': file.type };
      if (token) {
        uploadHeaders['Authorization'] = `Bearer ${token}`;
      }

      const uploadResponse = await fetch(boUploadUrl, {
        method: 'POST',
        headers: uploadHeaders,
        credentials: 'include',
        body: file,
      });

      if (uploadResponse.ok) {
        const relayed = await uploadResponse.json() as { assetId?: string };
        if (relayed?.assetId) {
          assetId = relayed.assetId;
        }
      }
    } catch {
      // BFF relay failed or unavailable, proceed to direct fallback
    }

    // 2. Direct backend fallback if BFF relay wasn't used or failed
    if (!assetId) {
      const initiated = await this.initiateUpload(file.type || 'image/jpeg', file.size);
      if (!initiated?.assetId) {
        throw new Error('Görsel yükleme başlatılamadı. Lütfen tekrar deneyin.');
      }
      assetId = initiated.assetId;

      await axiosInstance.put(`${API_URL}v1/media/assets/${assetId}/content`, file, {
        headers: {
          'Content-Type': file.type || 'image/jpeg',
        },
      });
    }

    // 3. Confirm upload
    options?.onStageChange?.('PROCESSING');
    let status = await this.confirmUpload(assetId);
    const attempts = options?.pollAttempts ?? 15;
    const delayMs = options?.pollDelayMs ?? 1000;

    for (let i = 0; i < attempts; i += 1) {
      if (bannerVariantReady(status)) {
        return status;
      }
      const failureMessage = processingFailureMessage(status);
      if (failureMessage) {
        throw new Error(failureMessage);
      }
      if (FAILURE_TERMINAL.has(status.lifecycleStatus as MediaAssetLifecycle)) {
        throw new Error('Görsel işlenemedi. Lütfen tekrar deneyin.');
      }
      await sleep(delayMs);
      try {
        status = await this.getStatus(assetId);
      } catch {
        // ignore polling network errors
      }
    }

    if (status && status.assetId) {
      return status;
    }
    throw new Error('Görsel işlenirken zaman aşımı oluştu. Lütfen tekrar deneyin.');
  };

  previewUrl = (assetId: string, profile: MediaDeliveryProfile = 'BANNER') => {
    return buildMediaUrl(assetId, profile);
  };
}

export const mediaService = new MediaService();
