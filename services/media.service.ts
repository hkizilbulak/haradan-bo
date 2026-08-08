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
  return status.lifecycleStatus === SUCCESS_TERMINAL
    && status.variants?.some((variant) => variant.transformProfile === 'BANNER' && variant.lifecycleStatus === 'READY');
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
   * Uploads a file via backend-issued short-lived PUT URL, then confirms processing.
   * Browser never talks to B2 with long-lived credentials.
   * Resolves only on MASTER_READY; throws on terminal failure or poll timeout.
   */
  uploadAdminAsset = async (
    file: File,
    options?: { pollAttempts?: number; pollDelayMs?: number; onStageChange?: (stage: 'UPLOADING' | 'PROCESSING') => void },
  ): Promise<MediaProcessingStatusResponse> => {
    options?.onStageChange?.('UPLOADING');
    const uploadResponse = await fetch('/api/bo/media-upload', {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    if (!uploadResponse.ok) {
      const errorBody = await uploadResponse.json().catch(() => null) as { message?: string } | null;
      throw new Error(errorBody?.message || 'Görsel yüklenemedi. Lütfen tekrar deneyin.');
    }

    const relayed = await uploadResponse.json() as { assetId: string };
    if (!relayed.assetId) {
      throw new Error('Görsel yükleme yanıtı geçersiz. Lütfen tekrar deneyin.');
    }

    options?.onStageChange?.('PROCESSING');
    let status = await this.confirmUpload(relayed.assetId);
    const attempts = options?.pollAttempts ?? 30;
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
      status = await this.getStatus(relayed.assetId);
    }

    if (bannerVariantReady(status)) {
      return status;
    }
    throw new Error('Banner önizlemesi hazırlanırken zaman aşımı oluştu. Lütfen tekrar deneyin.');
  };

  previewUrl = (assetId: string, profile: MediaDeliveryProfile = 'BANNER') => {
    return buildMediaUrl(assetId, profile);
  };
}

export const mediaService = new MediaService();
