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
  variants?: unknown[];
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
    options?: { pollAttempts?: number; pollDelayMs?: number },
  ): Promise<MediaProcessingStatusResponse> => {
    const initiated = await this.initiateUpload(file.type || 'application/octet-stream', file.size);
    const headers: Record<string, string> = {
      ...(initiated.upload.headers || {}),
    };
    if (!headers['Content-Type'] && file.type) {
      headers['Content-Type'] = file.type;
    }

    const uploadResponse = await fetch(initiated.upload.url, {
      method: initiated.upload.method || 'PUT',
      headers,
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error('Dosya yüklemesi başarısız oldu.');
    }

    let status = await this.confirmUpload(initiated.assetId);
    const attempts = options?.pollAttempts ?? 8;
    const delayMs = options?.pollDelayMs ?? 1000;

    for (let i = 0; i < attempts; i += 1) {
      if (status.lifecycleStatus === SUCCESS_TERMINAL) {
        return status;
      }
      if (FAILURE_TERMINAL.has(status.lifecycleStatus as MediaAssetLifecycle)) {
        throw new Error(
          status.lifecycleStatus === 'VALIDATION_FAILED'
            ? 'Yüklenen medya doğrulamadan geçemedi.'
            : `Medya işleme başarısız oldu (${status.lifecycleStatus}).`,
        );
      }
      await sleep(delayMs);
      status = await this.getStatus(initiated.assetId);
    }

    if (status.lifecycleStatus === SUCCESS_TERMINAL) {
      return status;
    }
    if (FAILURE_TERMINAL.has(status.lifecycleStatus as MediaAssetLifecycle)) {
      throw new Error(
        status.lifecycleStatus === 'VALIDATION_FAILED'
          ? 'Yüklenen medya doğrulamadan geçemedi.'
          : `Medya işleme başarısız oldu (${status.lifecycleStatus}).`,
      );
    }

    throw new Error('Medya işleme zaman aşımına uğradı. Lütfen tekrar deneyin.');
  };

  previewUrl = (assetId: string, profile: MediaDeliveryProfile = 'BANNER') => {
    return buildMediaUrl(assetId, profile);
  };
}

export const mediaService = new MediaService();
