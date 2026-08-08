import { API_URL } from '@/contants/urls';
import { apiRequest } from '@/helpers/api/openapiClient';
import { withIdentifier } from '@/helpers/api/mapIdentifier';
import { ModerationAdvertResponse } from '@/models';
import { PagedResponse, PageParams, SearchParams } from '@/models/common';

type OwnerAdvertItem = {
    id: string;
    title?: string | null;
    publishedAt?: string | null;
    deletedAt?: string | null;
    status: ModerationAdvertResponse['status'];
    version: number;
    mediaVersion?: number;
    categoryId?: string | null;
    ownerUserId?: string | null;
};

type ModerationQueueResponse = {
    hasMore: boolean;
    items: OwnerAdvertItem[];
    nextCursor?: string;
};

export type ModerationAdvertDetail = OwnerAdvertItem & {
    ownerUserId: string;
    description?: string | null;
    media?: Array<{ assetId: string; displayOrder: number; isCover: boolean }>;
    statusHistory?: Array<{
        fromStatus?: string | null;
        toStatus: string;
        reason?: string | null;
        isSystem: boolean;
        createdAt: string;
    }>;
};

export type ModerationReasonRequest = {
    expectedVersion: number;
    reason: string;
};

export type AdvertPackageAssignment = {
  id: string;
  advertId: string;
  packageCode: string;
  status: 'ACTIVE' | 'SUPERSEDED' | 'EXPIRED' | 'CANCELLED';
  startsAt: string;
  endsAt?: string | null;
  assignedByUserId: string;
  assignedAt: string;
  supersededAt?: string | null;
  expiredAt?: string | null;
  cancelledAt?: string | null;
  reason?: string | null;
  source: 'ADMIN' | 'SYSTEM';
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type AdvertPackageHistoryPage = {
  items: AdvertPackageAssignment[];
  nextCursor?: string | null;
  hasMore: boolean;
};

export type AssignPackageRequest = {
  packageCode: string;
  startsAt?: string;
  endsAt?: string | null;
  reason?: string | null;
};

export type AdvertUrgentActivation = {
  id: string;
  advertId: string;
  packageAssignmentId: string;
  featureCode: string;
  status: string;
  activatedByUserId: string;
  activatedAt: string;
  activationVersion: number;
  createdAt: string;
};

const baseUrl = `${API_URL}v1/admin/adverts/moderation`;
const moderationRootUrl = `${API_URL}v1/admin/adverts`;
const publicAdvertUrl = `${API_URL}v1/adverts`;

function parseStatusFilter(filter?: string): string | undefined {
    if (!filter) {
        return undefined;
    }

    const clause = filter.split(';').map((part) => part.trim()).find((part) => part.startsWith('status=='));
    if (!clause) {
        return undefined;
    }

    return clause.slice('status=='.length).trim() || undefined;
}

function toModerationAdvert(item: OwnerAdvertItem): ModerationAdvertResponse {
    const mapped = withIdentifier(item);
    return {
        ...mapped,
        identifier: mapped.id,
        title: item.title ?? undefined,
        publishedAt: item.publishedAt ?? undefined,
        deletedAt: item.deletedAt ?? undefined,
        status: item.status,
        version: item.version,
        mediaVersion: item.mediaVersion,
        categoryId: item.categoryId ?? undefined,
        ownerUserId: item.ownerUserId ?? undefined,
    };
}

class AdvertService {
    async search(params: SearchParams<ModerationAdvertResponse>) {
        const status = parseStatusFilter(params.filter);
        const limit = params.pageRequest.size ?? 10;

        if (params.cursor !== undefined) {
            const response = await apiRequest<ModerationQueueResponse>('GET', baseUrl, undefined, {
                params: {
                    cursor: params.cursor || undefined,
                    limit,
                    status: status || undefined,
                },
            });
            const content = response.items.map(toModerationAdvert);
            const pageNumber = params.pageRequest.page ?? 0;
            return {
                content,
                page: {
                    size: limit,
                    number: pageNumber,
                    totalElements: content.length,
                    totalPages: response.hasMore ? pageNumber + 2 : pageNumber + 1,
                    hasMore: Boolean(response.hasMore),
                    nextCursor: response.nextCursor ?? null,
                    cursorMode: true,
                },
            };
        }

        const items = await this.fetchAll(status);
        const filtered = this.applyFilter(items, params.filter);
        return this.toPagedResponse(filtered, params.pageRequest);
    }

    async getDetail(advertId: string) {
        return apiRequest<ModerationAdvertDetail>('GET', `${moderationRootUrl}/${advertId}`);
    }

    async approve(advertId: string, expectedVersion: number) {
        await apiRequest('POST', `${moderationRootUrl}/${advertId}/approve`, {
            expectedVersion,
        });
    }

    async reject(advertId: string, request: ModerationReasonRequest) {
        await apiRequest('POST', `${moderationRootUrl}/${advertId}/reject`, request);
    }

    async suspend(advertId: string, request: ModerationReasonRequest) {
        await apiRequest('POST', `${moderationRootUrl}/${advertId}/suspend`, request);
    }

    async requestChanges(advertId: string, request: ModerationReasonRequest) {
        await apiRequest('POST', `${moderationRootUrl}/${advertId}/request-changes`, request);
    }

    async getPackage(advertId: string) {
        return apiRequest<AdvertPackageAssignment>('GET', `${moderationRootUrl}/${advertId}/package`);
    }

    async assignPackage(advertId: string, request: AssignPackageRequest) {
        return apiRequest<AdvertPackageAssignment>('PUT', `${moderationRootUrl}/${advertId}/package`, request);
    }

    async cancelPackage(advertId: string, reason?: string) {
        await apiRequest('POST', `${moderationRootUrl}/${advertId}/package/cancel`, {
            reason: reason || undefined,
        });
    }

    async getPackageHistory(advertId: string): Promise<AdvertPackageAssignment[]> {
        const items: AdvertPackageAssignment[] = [];
        let cursor: string | undefined;
        while (true) {
            const response = await apiRequest<AdvertPackageHistoryPage>(
                'GET',
                `${moderationRootUrl}/${advertId}/package-history`,
                undefined,
                { params: { cursor, limit: 50 } },
            );
            items.push(...response.items);
            if (!response.hasMore || !response.nextCursor) {
                return items;
            }
            cursor = response.nextCursor;
        }
    }

    async activateUrgent(advertId: string) {
        return apiRequest<AdvertUrgentActivation>('PUT', `${publicAdvertUrl}/${advertId}/urgent`);
    }

    async deactivateUrgent(advertId: string) {
        await apiRequest('DELETE', `${publicAdvertUrl}/${advertId}/urgent`);
    }

    private async fetchAll(status?: string) {
        const items: OwnerAdvertItem[] = [];
        let cursor: string | undefined;
        let hasMore = true;

        while (hasMore) {
            const response = await apiRequest<ModerationQueueResponse>('GET', baseUrl, undefined, {
                params: {
                    cursor,
                    limit: 100,
                    status: status || undefined,
                },
            });
            items.push(...response.items);
            hasMore = response.hasMore;
            cursor = response.nextCursor;
        }

        return items.map(toModerationAdvert);
    }

    private applyFilter(items: ModerationAdvertResponse[], filter?: string) {
        if (!filter) {
            return items;
        }

        const clauses = filter.split(';').map((clause) => clause.trim()).filter(Boolean);
        if (clauses.length === 0) {
            return items;
        }

        return items.filter((item) => clauses.every((clause) => {
            // status already applied server-side when present
            if (clause.startsWith('status==')) {
                return true;
            }
            return this.matchesClause(item, clause);
        }));
    }

    private matchesClause(item: ModerationAdvertResponse, clause: string) {
        const match = clause.match(/^([a-zA-Z0-9_]+)==(.+)$/);
        if (!match) {
            return true;
        }

        const field = match[1];
        let expected = match[2].trim();
        const actual = this.readField(item, field);
        if (actual === undefined || actual === null) {
            return false;
        }

        const isContains = expected.includes('*');
        expected = expected.replace(/^'+|'+$/g, '').replace(/^\*|\*$/g, '');
        const actualText = String(actual).toLowerCase();
        const expectedText = expected.toLowerCase();

        if (isContains) {
            return actualText.includes(expectedText);
        }

        return actualText === expectedText;
    }

    private readField(item: ModerationAdvertResponse, field: string): unknown {
        switch (field) {
            case 'identifier':
            case 'id':
                return item.identifier ?? item.id;
            case 'title':
                return item.title;
            case 'publishedAt':
                return item.publishedAt;
            case 'deletedAt':
                return item.deletedAt;
            case 'status':
                return item.status;
            case 'version':
                return item.version;
            case 'categoryId':
                return item.categoryId;
            case 'ownerUserId':
                return item.ownerUserId;
            default:
                return undefined;
        }
    }

    private toPagedResponse(items: ModerationAdvertResponse[], pageParams: PageParams<ModerationAdvertResponse>): PagedResponse<ModerationAdvertResponse> {
        const pageIndex = pageParams.page ?? 0;
        const limit = pageParams.size ?? (items.length || 1);
        const start = pageIndex * limit;

        return {
            content: items.slice(start, start + limit),
            page: {
                size: limit,
                totalElements: items.length,
                totalPages: limit > 0 ? Math.ceil(items.length / limit) : 0,
                number: pageIndex,
            },
        };
    }
}

export const advertService = new AdvertService();
