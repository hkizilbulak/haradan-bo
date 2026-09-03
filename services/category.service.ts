import axiosInstance from '@/helpers/api/axiosInstance';
import { API_URL } from '@/contants/urls';
import { CategoryRequest, CategoryResponse } from '@/models';
import { PagedResponse, PageParams, SearchParams } from '@/models/common';
import { EntityStatusEnum } from '@/models/enums';
import { catalogStorage } from './catalogStorage';

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

export type PropertyDataType =
    | 'STRING'
    | 'TEXT'
    | 'INTEGER'
    | 'DECIMAL'
    | 'BOOLEAN'
    | 'SINGLE_SELECT'
    | 'YEAR';

export type CategoryProperty = {
    id: string;
    categoryId: string;
    code: string;
    title: string;
    helpText?: string | null;
    dataType: PropertyDataType;
    isRequired: boolean;
    isPublicVisible: boolean;
    isFormVisible: boolean;
    isFilterable: boolean;
    sortOrder: number;
    isActive: boolean;
    version: number;
    options: Array<Record<string, unknown>>;
    validation: Record<string, unknown>;
    defaultValue?: unknown;
    uiMetadata: Record<string, unknown>;
};

export type CreateCategoryPropertyRequest = {
    code?: string;
    title: string;
    helpText?: string | null;
    dataType: PropertyDataType;
    isRequired?: boolean;
    isPublicVisible?: boolean;
    isFormVisible?: boolean;
    isFilterable?: boolean;
    sortOrder?: number;
    options?: Array<Record<string, unknown>>;
    validation?: Record<string, unknown>;
    defaultValue?: unknown;
    uiMetadata?: Record<string, unknown>;
};

export type UpdateCategoryPropertyRequest = {
    expectedVersion: number;
    title?: string;
    helpText?: string | null;
    isRequired?: boolean;
    isPublicVisible?: boolean;
    isFormVisible?: boolean;
    isFilterable?: boolean;
    sortOrder?: number;
    options?: Array<Record<string, unknown>>;
    validation?: Record<string, unknown>;
    defaultValue?: unknown;
    uiMetadata?: Record<string, unknown>;
};

export type ReorderItem = {
    id: string;
    expectedVersion: number;
    sortOrder: number;
};

type AdminCategoryPropertyListResponse = {
    items: CategoryProperty[];
};

const baseUrl = `${API_URL}v1/admin/categories`;

class CategoryService {
    private categoriesCache: AdminCategoryItem[] = [];

    async search(params: SearchParams<CategoryResponse>) {
        const items = await this.fetchAll();
        const filtered = this.applyFilter(items, params.filter);
        const tree = this.buildTree(filtered);
        return this.toPagedResponse(tree, params.pageRequest);
    }

    async save(request: CategoryRequest) {
        const parentId = request.parentId ? request.parentId.trim() : undefined;
        try {
            await axiosInstance.post(baseUrl, {
                name: request.name.trim(),
                slug: request.slug.trim(),
                parentId: parentId || undefined,
                description: request.description,
            });
        } catch (error) {
            // Local fallback
            catalogStorage.createCategory({
                name: request.name.trim(),
                slug: request.slug.trim(),
                parentId: parentId || null,
                description: request.description,
            });
        }
    }

    async update(request: CategoryRequest) {
        if (!request.identifier) {
            throw new Error('Kategori kimliği gerekli.');
        }

        try {
            await axiosInstance.patch(`${baseUrl}/${request.identifier}`, {
                expectedVersion: Math.max(1, request.expectedVersion ?? 1),
                name: request.name.trim(),
                slug: request.slug.trim(),
                sortOrder: request.sortOrder,
                description: request.description,
            });
        } catch (error) {
            // Local fallback
            catalogStorage.updateCategory(request.identifier, {
                name: request.name.trim(),
                slug: request.slug.trim(),
                sortOrder: request.sortOrder,
                description: request.description,
                expectedVersion: request.expectedVersion,
            });
        }
    }

    async _delete(identifier: string, expectedVersion?: number) {
        const targetUUID = this.resolveCategoryUUID(identifier) || identifier;
        catalogStorage.setCategoryActive(targetUUID, false, expectedVersion);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('haradan_catalog_data_changed'));
        }
        try {
            await axiosInstance.post(`${baseUrl}/${targetUUID}/active`, {
                expectedVersion: Math.max(1, expectedVersion ?? 1),
                isActive: false,
            });
        } catch {
            try {
                const detail = await axiosInstance.get<AdminCategoryItem>(`${baseUrl}/${targetUUID}`);
                if (detail.data?.version) {
                    await axiosInstance.post(`${baseUrl}/${targetUUID}/active`, {
                        expectedVersion: detail.data.version,
                        isActive: false,
                    });
                    return;
                }
            } catch {}
        }
    }

    async activate(identifier: string, expectedVersion?: number) {
        const targetUUID = this.resolveCategoryUUID(identifier) || identifier;
        catalogStorage.setCategoryActive(targetUUID, true, expectedVersion);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('haradan_catalog_data_changed'));
        }
        try {
            await axiosInstance.post(`${baseUrl}/${targetUUID}/active`, {
                expectedVersion: Math.max(1, expectedVersion ?? 1),
                isActive: true,
            });
        } catch {
            try {
                const detail = await axiosInstance.get<AdminCategoryItem>(`${baseUrl}/${targetUUID}`);
                if (detail.data?.version) {
                    await axiosInstance.post(`${baseUrl}/${targetUUID}/active`, {
                        expectedVersion: detail.data.version,
                        isActive: true,
                    });
                    return;
                }
            } catch {}
        }
    }

    async hasActiveAdverts(categoryId: string): Promise<boolean> {
        try {
            const targetUUID = this.resolveCategoryUUID(categoryId) || categoryId;
            const response = await axiosInstance.get<{ items?: unknown[] }>(`${API_URL}v1/adverts`, {
                params: {
                    categoryId: targetUUID,
                    limit: 1,
                },
            });
            return Boolean(response.data?.items && response.data.items.length > 0);
        } catch (error) {
            console.warn(`[CategoryService] Active advert check error for ${categoryId}:`, error);
            return false;
        }
    }

    async findActiveAdvertConflicts(
        categories: { identifier: string; name: string }[]
    ): Promise<{ identifier: string; name: string }[]> {
        if (!categories || categories.length === 0) return [];
        const conflicts: { identifier: string; name: string }[] = [];
        const concurrency = 10;
        let index = 0;

        const worker = async () => {
            while (index < categories.length) {
                const i = index++;
                const item = categories[i];
                if (!item?.identifier) continue;
                const hasAdverts = await this.hasActiveAdverts(item.identifier);
                if (hasAdverts) {
                    conflicts.push(item);
                }
            }
        };

        const workers = Array.from(
            { length: Math.min(concurrency, categories.length) },
            () => worker()
        );
        await Promise.all(workers);
        return conflicts;
    }

    async reparent(identifier: string, expectedVersion: number, parentId?: string): Promise<number | undefined> {
        try {
            const response = await axiosInstance.post<AdminCategoryItem>(`${baseUrl}/${identifier}/reparent`, {
                expectedVersion: Math.max(1, expectedVersion ?? 1),
                newParentId: parentId || undefined,
            });
            return typeof response.data?.version === 'number' ? response.data.version : undefined;
        } catch (error) {
            const cat = catalogStorage.reparentCategory(identifier, parentId, expectedVersion);
            return cat.version;
        }
    }

    async reorderCategories(items: ReorderItem[]) {
        try {
            await axiosInstance.put(`${baseUrl}/reorder`, { items });
        } catch (error) {
            catalogStorage.reorderCategories(items);
        }
    }

    async ensureGlobalCategory(): Promise<string> {
        let catId = 'c1000000-0000-4000-8000-000000000000';

        // 1. Kategoriyi bul veya oluştur (Unique constraint hrd_categories_slug_key korur)
        try {
            const all = await this.fetchAll();
            const existing = all.find(
                (c) => c.slug === 'ortak-alanlar' || c.id === 'c1000000-0000-4000-8000-000000000000'
            );
            if (existing) {
                catId = existing.id;
            } else {
                const createRes = await axiosInstance.post<AdminCategoryItem>(baseUrl, {
                    name: 'Ortak Alanlar (Tüm İlanlar)',
                    slug: 'ortak-alanlar',
                    description: 'Tüm ilan kategorilerinde geçerli olan genel alanlar',
                    sortOrder: 0,
                });
                if (createRes.data?.id) {
                    catId = createRes.data.id;
                }
            }
        } catch (e: any) {
            console.warn('[CategoryService] ensureGlobalCategory category resolve error:', e);
        }

        // 2. Mevcut oluşturulmuş özellikleri çek
        let existingProps: CategoryProperty[] = [];
        try {
            const res = await axiosInstance.get<AdminCategoryPropertyListResponse>(
                `${baseUrl}/${catId}/properties`
            );
            if (res.data?.items && Array.isArray(res.data.items)) {
                existingProps = res.data.items;
            }
        } catch {}

        const existingCodes = new Set(existingProps.map((p) => String(p.code || '').toUpperCase()));

        // 3. 5 temel ortak alan tanımı
        const defaultProps: (CreateCategoryPropertyRequest & { initialActive?: boolean })[] = [
            {
                code: 'ADDRESS',
                title: 'Açık Adres',
                helpText: 'İlanın detaylı açık adres veya tesis/hara konumu',
                dataType: 'TEXT',
                isRequired: true,
                isFormVisible: false,
                isPublicVisible: false,
                isFilterable: false,
                sortOrder: 1,
                initialActive: false, // Pasif
            },
            {
                code: 'DESCRIPTION',
                title: 'İlan Açıklaması',
                helpText: 'İlanın detaylı açıklama metni',
                dataType: 'TEXT',
                isRequired: false,
                isFormVisible: true,
                isPublicVisible: true,
                isFilterable: false,
                sortOrder: 2,
                initialActive: true,
            },
            {
                code: 'PRICE',
                title: 'İlan Fiyatı',
                helpText: 'İlan için talep edilen bedel (TL)',
                dataType: 'DECIMAL',
                isRequired: true,
                isFormVisible: true,
                isPublicVisible: true,
                isFilterable: true,
                sortOrder: 3,
                initialActive: true,
            },
            {
                code: 'LOCATION',
                title: 'İl',
                helpText: 'İlanın bulunduğu şehir ve ilçe seçimi',
                dataType: 'STRING',
                isRequired: true,
                isFormVisible: true,
                isPublicVisible: true,
                isFilterable: true,
                sortOrder: 4,
                initialActive: true,
            },
            {
                code: 'PHONE',
                title: 'İletişim Telefonu',
                helpText: 'İlan sahibinin cep telefonu numarası',
                dataType: 'STRING',
                isRequired: true,
                isFormVisible: true,
                isPublicVisible: true,
                isFilterable: false,
                sortOrder: 5,
                initialActive: true,
            },
        ];

        // 4. Kategori var olsa bile eksik kalan özellikleri tamamla (Self-healing & Idempotent)
        for (const dp of defaultProps) {
            const codeUpper = String(dp.code || '').toUpperCase();
            if (!existingCodes.has(codeUpper)) {
                try {
                    const created = await axiosInstance.post<CategoryProperty>(
                        `${baseUrl}/${catId}/properties`,
                        {
                            code: dp.code,
                            title: dp.title,
                            helpText: dp.helpText,
                            dataType: dp.dataType,
                            isRequired: dp.isRequired,
                            isPublicVisible: dp.isPublicVisible,
                            isFormVisible: dp.isFormVisible,
                            isFilterable: dp.isFilterable,
                            sortOrder: dp.sortOrder,
                        }
                    );
                    if (dp.initialActive === false && created.data?.id) {
                        await this.setPropertyActive(
                            catId,
                            created.data.id,
                            created.data.version || 1,
                            false
                        );
                    }
                } catch (err) {
                    console.warn(`[CategoryService] Failed to create property ${dp.code}:`, err);
                }
            }
        }

        return catId;
    }

    /** Satılık Atlar için öne çıkan bilgi (checkbox) özelliklerini idempotent olarak seed eder. */
    async ensureHighlightProperties(): Promise<void> {
        const categoryId = 'c1000000-0000-4000-8000-000000000001';

        let existingProps: CategoryProperty[] = [];
        try {
            const res = await axiosInstance.get<AdminCategoryPropertyListResponse>(
                `${baseUrl}/${categoryId}/properties`,
            );
            if (res.data?.items && Array.isArray(res.data.items)) {
                existingProps = res.data.items;
            }
        } catch (e) {
            console.warn('[CategoryService] ensureHighlightProperties list error:', e);
            return;
        }

        const existingCodes = new Set(existingProps.map((p) => String(p.code || '').toUpperCase()));

        const highlightProps: CreateCategoryPropertyRequest[] = [
            {
                code: 'HEALTH_VACCINATION',
                title: 'Sağlık & aşı kaydı',
                helpText: 'Veteriner raporu ve aşı kartı talep edilebilir.',
                dataType: 'BOOLEAN',
                isRequired: false,
                isPublicVisible: true,
                isFormVisible: true,
                isFilterable: false,
                sortOrder: 20,
                uiMetadata: {
                    displayGroup: 'highlight',
                    sectionTitle: 'ÖNE ÇIKAN BİLGİLER',
                    sectionSubtitle: 'GÜVENCE VE İNCELEME',
                    icon: 'activity',
                    inputWidget: 'checkbox',
                },
            },
            {
                code: 'PEDIGREE_IDENTITY',
                title: 'Şecere ve kimlik',
                helpText: 'Soy ağacı ve kimlik belgeleri satış öncesi paylaşılır.',
                dataType: 'BOOLEAN',
                isRequired: false,
                isPublicVisible: true,
                isFormVisible: true,
                isFilterable: false,
                sortOrder: 21,
                uiMetadata: {
                    displayGroup: 'highlight',
                    sectionTitle: 'ÖNE ÇIKAN BİLGİLER',
                    sectionSubtitle: 'GÜVENCE VE İNCELEME',
                    icon: 'file-text',
                    inputWidget: 'checkbox',
                },
            },
            {
                code: 'ONSITE_INSPECTION',
                title: 'Yerinde inceleme',
                helpText: 'Deneme binişi ve hara ziyareti randevu ile.',
                dataType: 'BOOLEAN',
                isRequired: false,
                isPublicVisible: true,
                isFormVisible: true,
                isFilterable: false,
                sortOrder: 22,
                uiMetadata: {
                    displayGroup: 'highlight',
                    sectionTitle: 'ÖNE ÇIKAN BİLGİLER',
                    sectionSubtitle: 'GÜVENCE VE İNCELEME',
                    icon: 'eye',
                    inputWidget: 'checkbox',
                },
            },
        ];

        for (const prop of highlightProps) {
            const codeUpper = String(prop.code || '').toUpperCase();
            if (!existingCodes.has(codeUpper)) {
                try {
                    await axiosInstance.post<CategoryProperty>(
                        `${baseUrl}/${categoryId}/properties`,
                        prop,
                    );
                } catch (err) {
                    console.warn(`[CategoryService] Failed to create highlight property ${prop.code}:`, err);
                }
            }
        }
    }

    async listProperties(
        categoryId: string,
        _categoryName?: string,
        _categorySlug?: string,
    ): Promise<CategoryProperty[]> {
        const targetUUID = this.resolveCategoryUUID(categoryId) || categoryId;

        let deletedSet = new Set<string>();
        if (typeof window !== 'undefined') {
            try {
                const raw = localStorage.getItem('haradan_deleted_property_ids');
                if (raw) {
                    deletedSet = new Set(JSON.parse(raw));
                }
            } catch {}
        }

        try {
            const response = await axiosInstance.get<AdminCategoryPropertyListResponse>(
                `${baseUrl}/${targetUUID}/properties`,
            );
            if (response.data?.items) {
                const items = response.data.items;
                // Silinenler filtrelenir, pasife alınanlar (isActive: false) ise listede gösterilir
                return items.filter((p) => !deletedSet.has(p.id));
            }
        } catch (error: any) {
            if (
                error?.response?.status === 404 &&
                (targetUUID === 'c1000000-0000-4000-8000-000000000000' || targetUUID === 'ortak-alanlar')
            ) {
                const realId = await this.ensureGlobalCategory();
                if (realId && realId !== targetUUID) {
                    return this.listProperties(realId);
                }
            }
            console.warn('[CategoryService] listProperties API error, fallback to local storage:', error);
        }

        const localProps = catalogStorage.listProperties(targetUUID);
        // Local fallback: silinenler filtrelenir
        return (localProps as unknown as CategoryProperty[]).filter(
            (p) => !deletedSet.has(p.id),
        );
    }

    async createProperty(categoryId: string, request: CreateCategoryPropertyRequest): Promise<CategoryProperty> {
        const targetUUID = this.resolveCategoryUUID(categoryId) || categoryId;
        try {
            const response = await axiosInstance.post<CategoryProperty>(
                `${baseUrl}/${targetUUID}/properties`,
                {
                    ...request,
                    isFormVisible: request.isFormVisible ?? true,
                    isPublicVisible: request.isPublicVisible ?? true,
                    isFilterable: request.isFilterable ?? true,
                },
            );
            return response.data;
        } catch (error) {
            const local = catalogStorage.createProperty(targetUUID, {
                code: request.code,
                title: request.title,
                helpText: request.helpText,
                dataType: request.dataType,
                isRequired: request.isRequired,
                isPublicVisible: request.isPublicVisible,
                isFormVisible: request.isFormVisible,
                isFilterable: request.isFilterable,
                sortOrder: request.sortOrder,
                options: request.options as any,
                validation: request.validation,
                defaultValue: request.defaultValue,
                uiMetadata: request.uiMetadata,
            });
            return local as unknown as CategoryProperty;
        }
    }

    async updateProperty(
        categoryId: string,
        propertyId: string,
        request: UpdateCategoryPropertyRequest,
    ): Promise<CategoryProperty> {
        const targetUUID = this.resolveCategoryUUID(categoryId) || categoryId;
        try {
            const response = await axiosInstance.patch<CategoryProperty>(
                `${baseUrl}/${targetUUID}/properties/${propertyId}`,
                request,
            );
            return response.data;
        } catch (error) {
            const local = catalogStorage.updateProperty(targetUUID, propertyId, {
                title: request.title,
                helpText: request.helpText,
                isRequired: request.isRequired,
                isPublicVisible: request.isPublicVisible,
                isFormVisible: request.isFormVisible,
                isFilterable: request.isFilterable,
                sortOrder: request.sortOrder,
                options: request.options as any,
                validation: request.validation,
                defaultValue: request.defaultValue,
                uiMetadata: request.uiMetadata,
                expectedVersion: request.expectedVersion,
            });
            return local as unknown as CategoryProperty;
        }
    }

    async setPropertyActive(
        categoryId: string,
        propertyId: string,
        expectedVersion: number,
        isActive: boolean,
    ): Promise<CategoryProperty> {
        const targetUUID = this.resolveCategoryUUID(categoryId) || categoryId;
        const version = Math.max(1, expectedVersion ?? 1);

        try {
            catalogStorage.setPropertyActive(targetUUID, propertyId, isActive, version);
        } catch {}
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('haradan_category_properties_changed'));
            window.dispatchEvent(new Event('haradan_catalog_data_changed'));
        }

        try {
            const response = await axiosInstance.post<CategoryProperty>(
                `${baseUrl}/${targetUUID}/properties/${propertyId}/active`,
                {
                    expectedVersion: version,
                    isActive,
                },
            );
            return response.data;
        } catch (error) {
            // Version mismatch recovery: fetch current property version and retry
            try {
                const propsRes = await axiosInstance.get<AdminCategoryPropertyListResponse>(
                    `${baseUrl}/${targetUUID}/properties`,
                );
                const currentProp = propsRes.data?.items?.find((p) => p.id === propertyId);
                if (currentProp?.version) {
                    const retryRes = await axiosInstance.post<CategoryProperty>(
                        `${baseUrl}/${targetUUID}/properties/${propertyId}/active`,
                        {
                            expectedVersion: currentProp.version,
                            isActive,
                        },
                    );
                    return retryRes.data;
                }
            } catch {}
            const local = catalogStorage.setPropertyActive(targetUUID, propertyId, isActive, version);
            return local as unknown as CategoryProperty;
        }
    }

    async deleteProperty(categoryId: string, propertyId: string, version?: number): Promise<CategoryProperty | void> {
        const targetUUID = this.resolveCategoryUUID(categoryId) || categoryId;
        const expVer = Math.max(1, version ?? 1);
        
        catalogStorage.deleteProperty(targetUUID, propertyId, expVer);
        if (typeof window !== 'undefined') {
            try {
                const raw = localStorage.getItem('haradan_deleted_property_ids');
                const set = raw ? JSON.parse(raw) : [];
                if (!set.includes(propertyId)) {
                    set.push(propertyId);
                    localStorage.setItem('haradan_deleted_property_ids', JSON.stringify(set));
                }
                window.dispatchEvent(new Event('haradan_category_properties_changed'));
            } catch {}
        }

        try {
            const response = await axiosInstance.post<CategoryProperty>(
                `${baseUrl}/${targetUUID}/properties/${propertyId}/active`,
                {
                    expectedVersion: expVer,
                    isActive: false,
                },
            );
            return response.data;
        } catch (error) {
            try {
                const propsRes = await axiosInstance.get<AdminCategoryPropertyListResponse>(
                    `${baseUrl}/${targetUUID}/properties`,
                );
                const currentProp = propsRes.data?.items?.find((p) => p.id === propertyId);
                if (currentProp?.version) {
                    const retryRes = await axiosInstance.post<CategoryProperty>(
                        `${baseUrl}/${targetUUID}/properties/${propertyId}/active`,
                        {
                            expectedVersion: currentProp.version,
                            isActive: false,
                        },
                    );
                    return retryRes.data;
                }
            } catch {}
        }
    }

    async reorderProperties(categoryId: string, items: ReorderItem[]): Promise<void> {
        const targetUUID = this.resolveCategoryUUID(categoryId) || categoryId;
        try {
            await axiosInstance.put(`${baseUrl}/${targetUUID}/properties/reorder`, { items });
        } catch (error) {
            catalogStorage.reorderProperties(targetUUID, items);
        }
    }

    private resolveCategoryUUID(categoryId: string): string | null {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId)) {
            return categoryId;
        }
        const clean = categoryId.replace(/^cat-/, '');
        const cat = this.categoriesCache.find((c) => c.id === categoryId || c.slug === categoryId || c.slug === clean || c.id === `cat-${clean}`);
        if (cat) {
            return cat.id;
        }
        const storageCat = catalogStorage.resolveCategory(categoryId);
        if (storageCat) {
            return storageCat.id;
        }
        return null;
    }

    private async fetchAll(): Promise<AdminCategoryItem[]> {
        try {
            let hasMore = true;
            let cursor: string | undefined = undefined;
            const allItems: AdminCategoryItem[] = [];

            while (hasMore) {
                const response = await axiosInstance.get<AdminCategoryListResponse>(baseUrl, {
                    params: {
                        limit: 100,
                        cursor,
                    },
                });
                const items = response.data?.items || [];
                allItems.push(...items);
                
                hasMore = response.data?.hasMore ?? false;
                cursor = response.data?.nextCursor;
            }

            if (allItems.length > 0) {
                this.categoriesCache = allItems;
                return allItems;
            }
        } catch (error) {
            console.warn('[CategoryService] fetchAll API error, falling back to local JSON storage:', error);
        }

        const localCats = catalogStorage.listCategories(false);
        this.categoriesCache = localCats;
        return localCats;
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

    private buildTree(items: AdminCategoryItem[]): CategoryTreeNode[] {
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
            nodes.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, 'tr'));
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
