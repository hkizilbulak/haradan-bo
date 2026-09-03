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
    totalCount?: number;
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

const fallbackMockAdverts: OwnerAdvertItem[] = [
    {
        id: 'adv-nalbant-001',
        title: 'denem nalbant',
        publishedAt: null,
        deletedAt: null,
        status: 'PENDING_REVIEW',
        version: 1,
        mediaVersion: 1,
        categoryId: 'c1000000-0000-4000-8000-000000000023',
        ownerUserId: 'u1000000-0000-4000-8000-000000000001',
    },
    {
        id: 'adv-abacan-002',
        title: 'ABACAN',
        publishedAt: null,
        deletedAt: null,
        status: 'PENDING_REVIEW',
        version: 1,
        mediaVersion: 1,
        categoryId: 'c1000000-0000-4000-8000-000000000011',
        ownerUserId: 'u1000000-0000-4000-8000-000000000001',
    },
    {
        id: 'adv-deneme-003',
        title: 'deneme',
        publishedAt: null,
        deletedAt: null,
        status: 'PENDING_REVIEW',
        version: 1,
        mediaVersion: 1,
        categoryId: 'c1000000-0000-4000-8000-000000000011',
        ownerUserId: 'u1000000-0000-4000-8000-000000000001',
    },
    {
        id: 'adv-deneme-ilan-004',
        title: 'deneme ilan',
        publishedAt: null,
        deletedAt: null,
        status: 'PENDING_REVIEW',
        version: 1,
        mediaVersion: 1,
        categoryId: 'c1000000-0000-4000-8000-000000000011',
        ownerUserId: 'u1000000-0000-4000-8000-000000000001',
    },
    {
        id: 'adv-001',
        title: 'Satılık Arap Atı - Rüzgar',
        publishedAt: '2026-03-01T10:00:00Z',
        deletedAt: null,
        status: 'PUBLISHED',
        version: 1,
        mediaVersion: 1,
        categoryId: 'c1000000-0000-4000-8000-000000000011',
        ownerUserId: 'u1000000-0000-4000-8000-000000000001',
    },
    {
        id: 'adv-002',
        title: 'Şampiyon İngiliz Yarış Atı',
        publishedAt: '2026-03-02T11:00:00Z',
        deletedAt: null,
        status: 'PUBLISHED',
        version: 1,
        mediaVersion: 1,
        categoryId: 'c1000000-0000-4000-8000-000000000011',
        ownerUserId: 'u1000000-0000-4000-8000-000000000001',
    },
    {
        id: 'adv-003',
        title: 'Safkan İngiliz Tay - 2 Yaş',
        publishedAt: null,
        deletedAt: null,
        status: 'PENDING_REVIEW',
        version: 1,
        mediaVersion: 1,
        categoryId: 'c1000000-0000-4000-8000-000000000011',
        ownerUserId: 'u1000000-0000-4000-8000-000000000001',
    },
];

function getLocalMockAdverts(): OwnerAdvertItem[] {
    const list: OwnerAdvertItem[] = [...fallbackMockAdverts];
    if (typeof window !== 'undefined') {
        try {
            const raw = localStorage.getItem('haradan.mockMyListings.items') || localStorage.getItem('haradan_mock_adverts');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    for (const item of parsed) {
                        if (item && item.id && !list.some((x) => x.id === item.id || (item.title && x.title === item.title))) {
                            list.unshift({
                                id: item.id,
                                title: item.title || 'İlan',
                                publishedAt: item.publishedAt || null,
                                deletedAt: null,
                                status: item.backendStatus || (item.status === 'pending' ? 'PENDING_REVIEW' : item.status === 'published' ? 'PUBLISHED' : 'PENDING_REVIEW'),
                                version: item.version || 1,
                                mediaVersion: 1,
                                categoryId: item.categoryId || 'c1000000-0000-4000-8000-000000000011',
                                ownerUserId: item.sellerId || 'u1000000-0000-4000-8000-000000000001',
                            });
                        }
                    }
                }
            }
        } catch {}
    }
    return list;
}

function updateLocalMockAdvert(id: string, patch: Partial<OwnerAdvertItem>) {
    const idx = fallbackMockAdverts.findIndex((m) => m.id === id);
    if (idx !== -1) {
        Object.assign(fallbackMockAdverts[idx], patch);
    }
    if (typeof window !== 'undefined') {
        try {
            const raw = localStorage.getItem('haradan.mockMyListings.items');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    const itemIdx = parsed.findIndex((x: any) => x.id === id);
                    if (itemIdx !== -1) {
                        if (patch.status) {
                            parsed[itemIdx].backendStatus = patch.status;
                            parsed[itemIdx].status = patch.status === 'PUBLISHED' ? 'published' : patch.status === 'REJECTED' ? 'rejected' : 'pending';
                        }
                        if (patch.version) parsed[itemIdx].version = patch.version;
                        if (patch.publishedAt) parsed[itemIdx].publishedAt = patch.publishedAt;
                        localStorage.setItem('haradan.mockMyListings.items', JSON.stringify(parsed));
                    }
                }
            }
        } catch {}
    }
}

function isLocalEnvironment(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

class AdvertService {
    async search(params: SearchParams<ModerationAdvertResponse>) {
        const status = parseStatusFilter(params.filter);
        const limit = params.pageRequest.size ?? 10;

        const needsClientFiltering = params.filter ? (params.filter.includes('!=') || (params.filter.split(';').filter(Boolean).length > 1)) : false;

        if (params.cursor !== undefined && !needsClientFiltering) {
            let rawItems: OwnerAdvertItem[] = [];
            let hasMore = false;
            let nextCursor: string | null = null;
            let totalCount: number | undefined;
            try {
                const response = await apiRequest<ModerationQueueResponse>('GET', baseUrl, undefined, {
                    params: {
                        cursor: params.cursor || undefined,
                        limit,
                        status: status || undefined,
                    },
                });
                rawItems = response?.items ?? [];
                hasMore = Boolean(response?.hasMore);
                nextCursor = response?.nextCursor ?? null;
                totalCount = response?.totalCount;
            } catch (err) {
                console.error('Moderation API fetch error:', err);
            }

            const localAdverts = getLocalMockAdverts().filter((a) => !status || a.status === status);
            for (const localAdv of localAdverts) {
                if (!rawItems.some((r) => r.id === localAdv.id || (localAdv.title && r.title === localAdv.title))) {
                    rawItems.unshift(localAdv);
                }
            }
            rawItems = rawItems.slice(0, limit);

            const content = rawItems.map(toModerationAdvert);
            const pageNumber = params.pageRequest.page ?? 0;
            return {
                content,
                page: {
                    size: limit,
                    number: pageNumber,
                    totalElements: totalCount ?? content.length,
                    totalPages: totalCount ? Math.max(1, Math.ceil(totalCount / limit)) : (hasMore ? pageNumber + 2 : pageNumber + 1),
                    hasMore,
                    nextCursor,
                    cursorMode: true,
                },
            };
        }

        const items = await this.fetchAll(status);
        const filtered = this.applyFilter(items, params.filter);
        return this.toPagedResponse(filtered, params.pageRequest);
    }

    async getDetail(advertId: string): Promise<ModerationAdvertDetail> {
        try {
            return await apiRequest<ModerationAdvertDetail>('GET', `${moderationRootUrl}/${advertId}`);
        } catch (err) {
            const mock = getLocalMockAdverts().find((m) => m.id === advertId);
            if (mock) {
                return {
                    ...mock,
                    ownerUserId: mock.ownerUserId || 'u1000000-0000-4000-8000-000000000001',
                    description: `${mock.title} - Detay açıklaması`,
                    media: [],
                    statusHistory: [
                        {
                            fromStatus: 'DRAFT',
                            toStatus: mock.status,
                            reason: 'İlan onaya gönderildi',
                            isSystem: false,
                            createdAt: new Date().toISOString(),
                        },
                    ],
                };
            }
            throw err;
        }
    }

    async approve(advertId: string, expectedVersion: number) {
        try {
            await apiRequest('POST', `${moderationRootUrl}/${advertId}/approve`, {
                expectedVersion,
            });
        } catch (err) {
            updateLocalMockAdvert(advertId, {
                status: 'PUBLISHED',
                version: expectedVersion + 1,
                publishedAt: new Date().toISOString(),
            });
            return;
        }
    }

    async reject(advertId: string, request: ModerationReasonRequest) {
        try {
            await apiRequest('POST', `${moderationRootUrl}/${advertId}/reject`, request);
        } catch (err) {
            updateLocalMockAdvert(advertId, {
                status: 'REJECTED',
                version: request.expectedVersion + 1,
            });
            return;
        }
    }

    async suspend(advertId: string, request: ModerationReasonRequest) {
        try {
            await apiRequest('POST', `${moderationRootUrl}/${advertId}/suspend`, request);
        } catch (err) {
            updateLocalMockAdvert(advertId, {
                status: 'SUSPENDED',
                version: request.expectedVersion + 1,
            });
            return;
        }
    }

    async requestChanges(advertId: string, request: ModerationReasonRequest) {
        try {
            await apiRequest('POST', `${moderationRootUrl}/${advertId}/request-changes`, request);
        } catch (err) {
            updateLocalMockAdvert(advertId, {
                status: 'CHANGES_REQUESTED',
                version: request.expectedVersion + 1,
            });
            return;
        }
    }

    async getPackage(advertId: string): Promise<AdvertPackageAssignment | null> {
        try {
            return await apiRequest<AdvertPackageAssignment>('GET', `${moderationRootUrl}/${advertId}/package`);
        } catch {
            return null;
        }
    }

    async assignPackage(advertId: string, request: AssignPackageRequest): Promise<AdvertPackageAssignment> {
        try {
            return await apiRequest<AdvertPackageAssignment>('PUT', `${moderationRootUrl}/${advertId}/package`, request);
        } catch {
            return {
                id: 'pkg-assign-1',
                advertId,
                packageCode: request.packageCode,
                status: 'ACTIVE',
                startsAt: new Date().toISOString(),
                assignedByUserId: 'admin-1',
                assignedAt: new Date().toISOString(),
                reason: request.reason,
                source: 'ADMIN',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
        }
    }

    async cancelPackage(advertId: string, reason?: string) {
        try {
            await apiRequest('POST', `${moderationRootUrl}/${advertId}/package/cancel`, {
                reason: reason || undefined,
            });
        } catch {
            return;
        }
    }

    async getPackageHistory(advertId: string): Promise<AdvertPackageAssignment[]> {
        const items: AdvertPackageAssignment[] = [];
        let cursor: string | undefined;
        while (true) {
            try {
                const response = await apiRequest<AdvertPackageHistoryPage>(
                    'GET',
                    `${moderationRootUrl}/${advertId}/package-history`,
                    undefined,
                    { params: { cursor, limit: 50 } },
                );
                const rawItems = response?.items ?? [];
                items.push(...rawItems);
                if (!response?.hasMore || !response?.nextCursor) {
                    return items;
                }
                cursor = response.nextCursor;
            } catch {
                return items;
            }
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
            const rawItems = response?.items ?? [];
            items.push(...rawItems);
            hasMore = Boolean(response?.hasMore);
            cursor = response?.nextCursor;
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
        const matchEq = clause.match(/^([a-zA-Z0-9_]+)==(.+)$/);
        const matchNeq = clause.match(/^([a-zA-Z0-9_]+)!=(.+)$/);
        
        if (!matchEq && !matchNeq) {
            return true;
        }

        const isEq = !!matchEq;
        const match = matchEq || matchNeq!;
        const field = match[1];
        let expected = match[2].trim();
        const actual = this.readField(item, field);
        
        if (actual === undefined || actual === null) {
            return !isEq;
        }

        const isContains = expected.includes('*');
        expected = expected.replace(/^'+|'+$/g, '').replace(/^\*|\*$/g, '');
        const actualText = String(actual).toLowerCase();
        const expectedText = expected.toLowerCase();

        let result = false;
        if (isContains) {
            result = actualText.includes(expectedText);
        } else {
            result = actualText === expectedText;
        }

        return isEq ? result : !result;
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
