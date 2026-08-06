import { API_URL } from '@/contants/urls';
import { apiRequest } from '@/helpers/api/openapiClient';
import { CategoryRequest, CategoryResponse } from '@/models';
import { PagedResponse, PageParams, SearchParams } from '@/models/common';
import { EntityStatusEnum } from '@/models/enums';

type AdminCategoryItem = {
    id: string;
    name: string;
    slug: string;
    sortOrder: number;
    description?: string | null;
    parentId?: string | null;
    isActive: boolean;
    version: number;
};

type AdminCategoryListResponse = {
    hasMore: boolean;
    items: AdminCategoryItem[];
    nextCursor?: string;
};

type CategoryTreeNode = Omit<CategoryResponse, 'children' | 'version'> & {
    version: number;
    children: CategoryTreeNode[];
};

const baseUrl = `${API_URL}v1/admin/categories`;

class CategoryService {
    async search(params: SearchParams<CategoryResponse>) {
        const items = await this.fetchAll();
        const filtered = this.applyFilter(items, params.filter);
        const tree = this.buildTree(filtered);
        return this.toPagedResponse(tree, params.pageRequest);
    }

    async save(request: CategoryRequest) {
        await apiRequest('POST', baseUrl, {
            name: request.name,
            slug: request.slug,
            parentId: request.parentId || undefined,
            sortOrder: request.sortOrder,
            description: request.description,
        });
    }

    async update(request: CategoryRequest) {
        if (!request.identifier) {
            throw new Error('Kategori kimliği gerekli.');
        }

        await apiRequest('PATCH', `${baseUrl}/${request.identifier}`, {
            expectedVersion: Math.max(1, request.expectedVersion ?? 1),
            name: request.name,
            slug: request.slug,
            sortOrder: request.sortOrder,
            description: request.description,
        });
    }

    async _delete(identifier: string, expectedVersion?: number) {
        await apiRequest('POST', `${baseUrl}/${identifier}/active`, {
            expectedVersion: Math.max(1, expectedVersion ?? 1),
            isActive: false,
        });
    }

    async activate(identifier: string, expectedVersion?: number) {
        await apiRequest('POST', `${baseUrl}/${identifier}/active`, {
            expectedVersion: Math.max(1, expectedVersion ?? 1),
            isActive: true,
        });
    }

    async reparent(identifier: string, expectedVersion: number, parentId?: string) {
        await apiRequest('POST', `${baseUrl}/${identifier}/reparent`, {
            expectedVersion: Math.max(1, expectedVersion ?? 1),
            newParentId: parentId || undefined,
        });
    }

    private async fetchAll() {
        const items: AdminCategoryItem[] = [];
        let cursor: string | undefined;
        let hasMore = true;

        while (hasMore) {
            const response = await apiRequest<AdminCategoryListResponse>('GET', baseUrl, undefined, {
                params: {
                    cursor,
                    limit: 100,
                },
            });
            items.push(...response.items);
            hasMore = response.hasMore;
            cursor = response.nextCursor;
        }

        return items;
    }

    private applyFilter(items: AdminCategoryItem[], filter?: string) {
        if (!filter) {
            return items;
        }

        const clauses = filter.split(';').map((clause) => clause.trim()).filter(Boolean);
        if (clauses.length === 0) {
            return items;
        }

        return items.filter((item) => clauses.every((clause) => this.matchesClause(item, clause)));
    }

    private matchesClause(item: AdminCategoryItem, clause: string) {
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

    private readField(item: AdminCategoryItem, field: string) {
        switch (field) {
            case 'status':
                return item.isActive ? EntityStatusEnum.ACTIVE : EntityStatusEnum.DELETED;
            case 'name':
                return item.name;
            case 'slug':
                return item.slug;
            case 'sortOrder':
                return item.sortOrder;
            case 'parentId':
                return item.parentId;
            default:
                return (item as Record<string, unknown>)[field];
        }
    }

    private buildTree(items: AdminCategoryItem[]) {
        const nodeMap = new Map<string, CategoryTreeNode>();
        const roots: CategoryTreeNode[] = [];

        items.forEach((item) => {
            nodeMap.set(item.id, {
                identifier: item.id,
                name: item.name,
                slug: item.slug,
                sortOrder: item.sortOrder,
                description: item.description ?? undefined,
                parentId: item.parentId ?? undefined,
                status: item.isActive ? EntityStatusEnum.ACTIVE : EntityStatusEnum.DELETED,
                version: item.version,
                children: [],
            });
        });

        items.forEach((item) => {
            const node = nodeMap.get(item.id);
            if (!node) {
                return;
            }

            if (item.parentId) {
                const parent = nodeMap.get(item.parentId);
                if (parent) {
                    parent.children.push(node);
                    return;
                }
            }

            roots.push(node);
        });

        const sortNodes = (nodes: CategoryTreeNode[]) => {
            nodes.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
            nodes.forEach((node) => sortNodes(node.children));
        };

        sortNodes(roots);
        return roots;
    }

    private toPagedResponse(items: CategoryTreeNode[], pageParams: PageParams<CategoryResponse>): PagedResponse<CategoryResponse> {
        const pageIndex = pageParams.page ?? 0;
        const limit = pageParams.size ?? (items.length || 1);
        const start = pageIndex * limit;
        const content = items.slice(start, start + limit) as CategoryResponse[];

        return {
            content,
            page: {
                size: limit,
                totalElements: items.length,
                totalPages: limit > 0 ? Math.ceil(items.length / limit) : 0,
                number: pageIndex,
            },
        };
    }
}

export const categoryService = new CategoryService();
