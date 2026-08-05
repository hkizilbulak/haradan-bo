import { apiRequest } from '@/helpers/api/openapiClient';
import { ModerationAdvertResponse } from '@/models';
import { PagedResponse, PageParams, SearchParams } from '@/models/common';
import { EntityStatusEnum } from '@/models/enums';

type ModerationQueueItem = {
    id: string;
    title?: string | null;
    publishedAt?: string | null;
    deletedAt?: string | null;
    status: string;
    version: number;
    categoryId?: string | null;
    ownerUserId?: string | null;
};

type ModerationQueueResponse = {
    hasMore: boolean;
    items: ModerationQueueItem[];
    nextCursor?: string;
};

const baseUrl = '/v1/admin/adverts/moderation';

class AdvertService {
    async search(params: SearchParams<ModerationAdvertResponse>) {
        const items = await this.fetchAll();
        const filtered = this.applyFilter(items, params.filter);
        return this.toPagedResponse(filtered, params.pageRequest);
    }

    private async fetchAll() {
        const items: ModerationQueueItem[] = [];
        let cursor: string | undefined;
        let hasMore = true;

        while (hasMore) {
            const response = await apiRequest<ModerationQueueResponse>('GET', baseUrl, undefined, {
                params: {
                    cursor,
                    limit: 100,
                },
            });
            items.push(...response.items);
            hasMore = response.hasMore;
            cursor = response.nextCursor;
        }

        return items.map((item) => ({
            identifier: item.id,
            title: item.title ?? undefined,
            publishedAt: item.publishedAt ?? undefined,
            deletedAt: item.deletedAt ?? undefined,
            status: item.status as EntityStatusEnum,
            version: item.version,
            categoryId: item.categoryId ?? undefined,
            ownerUserId: item.ownerUserId ?? undefined,
        })) as ModerationAdvertResponse[];
    }

    private applyFilter(items: ModerationAdvertResponse[], filter?: string) {
        if (!filter) {
            return items;
        }

        const clauses = filter.split(';').map((clause) => clause.trim()).filter(Boolean);
        if (clauses.length === 0) {
            return items;
        }

        return items.filter((item) => clauses.every((clause) => this.matchesClause(item, clause)));
    }

    private matchesClause(item: ModerationAdvertResponse, clause: string) {
        const match = clause.match(/^([a-zA-Z0-9_]+)==(.+)$/);
        if (!match) {
            return true;
        }

        const field = match[1];
        let expected = match[2].trim();
        const actual = (item as Record<string, unknown>)[field];
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
