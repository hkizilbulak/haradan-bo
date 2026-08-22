import axiosInstance from '@/helpers/api/axiosInstance';
import { API_URL } from '@/contants/urls';
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

const DEFAULT_ADMIN_CATEGORIES: AdminCategoryItem[] = [
    // 1. Satılık Atlar
    { id: 'cat-satilik-atlar', name: 'Satılık Atlar', slug: 'satilik-atlar', sortOrder: 1, parentId: null, isActive: true, version: 1 },
    { id: 'cat-satilik-yaris-ati', name: 'Satılık Yarış Atı', slug: 'satilik-yaris-ati', sortOrder: 1, parentId: 'cat-satilik-atlar', isActive: true, version: 1 },
    { id: 'cat-satilik-kisrak', name: 'Satılık Kısrak', slug: 'satilik-kisrak', sortOrder: 2, parentId: 'cat-satilik-atlar', isActive: true, version: 1 },
    { id: 'cat-satilik-aygir', name: 'Satılık Aygır', slug: 'satilik-aygir', sortOrder: 3, parentId: 'cat-satilik-atlar', isActive: true, version: 1 },
    { id: 'cat-satilik-binek-ati', name: 'Satılık Binek Atı', slug: 'satilik-binek-ati', sortOrder: 4, parentId: 'cat-satilik-atlar', isActive: true, version: 1 },
    { id: 'cat-satilik-pony', name: 'Satılık Pony', slug: 'satilik-pony', sortOrder: 5, parentId: 'cat-satilik-atlar', isActive: true, version: 1 },

    // 2. At Hizmetleri
    { id: 'cat-at-hizmetleri', name: 'At Hizmetleri', slug: 'at-hizmetleri', sortOrder: 2, parentId: null, isActive: true, version: 1 },
    { id: 'cat-pansiyon', name: 'Pansiyon Haralar', slug: 'pansiyon-haralar', sortOrder: 1, parentId: 'cat-at-hizmetleri', isActive: true, version: 1 },
    { id: 'cat-nakliye', name: 'At Nakliyesi', slug: 'at-nakliyesi', sortOrder: 2, parentId: 'cat-at-hizmetleri', isActive: true, version: 1 },
    { id: 'cat-nalbant', name: 'Nalbantlar', slug: 'nalbantlar', sortOrder: 3, parentId: 'cat-at-hizmetleri', isActive: true, version: 1 },

    // 3. Aşım Hizmetleri
    { id: 'cat-asim-hizmetleri', name: 'Aşım Hizmetleri', slug: 'asim-hizmetleri', sortOrder: 3, parentId: null, isActive: true, version: 1 },
    { id: 'cat-arap-aygir', name: 'Arap Aygır', slug: 'arap-aygir', sortOrder: 1, parentId: 'cat-asim-hizmetleri', isActive: true, version: 1 },
    { id: 'cat-ingiliz-aygir', name: 'İngiliz Aygır', slug: 'ingiliz-aygir', sortOrder: 2, parentId: 'cat-asim-hizmetleri', isActive: true, version: 1 },
];

const HORSE_PROPERTIES_TEMPLATE = (catId: string): CategoryProperty[] => [
    {
        id: `prop-breed-${catId}`,
        categoryId: catId,
        code: 'HORSE_BREED',
        title: 'At Irkı',
        dataType: 'SINGLE_SELECT',
        isRequired: true,
        isPublicVisible: true,
        isFormVisible: true,
        isFilterable: true,
        sortOrder: 1,
        isActive: true,
        version: 1,
        options: [
            { value: 'İngiliz (Thoroughbred)', label: 'İngiliz (Thoroughbred)' },
            { value: 'Safkan Arap', label: 'Safkan Arap' },
            { value: 'Warmblood / Spor Atı', label: 'Warmblood / Spor Atı' },
            { value: 'Konkur / Engel Atlama', label: 'Konkur / Engel Atlama' },
            { value: 'Rahvan', label: 'Rahvan' },
            { value: 'Pony / Midilli', label: 'Pony / Midilli' },
            { value: 'Haflinger', label: 'Haflinger' },
        ],
        validation: {},
        uiMetadata: {},
    },
    {
        id: `prop-color-${catId}`,
        categoryId: catId,
        code: 'COAT_COLOR',
        title: 'Donu (Renk)',
        dataType: 'SINGLE_SELECT',
        isRequired: true,
        isPublicVisible: true,
        isFormVisible: true,
        isFilterable: true,
        sortOrder: 2,
        isActive: true,
        version: 1,
        options: [
            { value: 'Doru', label: 'Doru' },
            { value: 'Al', label: 'Al' },
            { value: 'Kır', label: 'Kır' },
            { value: 'Beyaz', label: 'Beyaz' },
            { value: 'Yağız', label: 'Yağız' },
            { value: 'Kula', label: 'Kula' },
            { value: 'Boz', label: 'Boz' },
        ],
        validation: {},
        uiMetadata: {},
    },
    {
        id: `prop-age-${catId}`,
        categoryId: catId,
        code: 'HORSE_AGE',
        title: 'Yaş',
        dataType: 'SINGLE_SELECT',
        isRequired: true,
        isPublicVisible: true,
        isFormVisible: true,
        isFilterable: true,
        sortOrder: 3,
        isActive: true,
        version: 1,
        options: [
            { value: 'Tay (0-1 Yaş)', label: 'Tay (0-1 Yaş)' },
            { value: '2 Yaş', label: '2 Yaş' },
            { value: '3 Yaş', label: '3 Yaş' },
            { value: '4 Yaş', label: '4 Yaş' },
            { value: '5+ Yaş', label: '5+ Yaş' },
        ],
        validation: {},
        uiMetadata: {},
    },
    {
        id: `prop-gender-${catId}`,
        categoryId: catId,
        code: 'HORSE_GENDER',
        title: 'Cinsiyet',
        dataType: 'SINGLE_SELECT',
        isRequired: true,
        isPublicVisible: true,
        isFormVisible: true,
        isFilterable: true,
        sortOrder: 4,
        isActive: true,
        version: 1,
        options: [
            { value: 'Erkek', label: 'Erkek' },
            { value: 'Dişi', label: 'Dişi' },
            { value: 'İğdiş', label: 'İğdiş' },
        ],
        validation: {},
        uiMetadata: {},
    },
];

const PANSIYON_PROPERTIES_TEMPLATE = (catId: string): CategoryProperty[] => [
    {
        id: `prop-grass-${catId}`,
        categoryId: catId,
        code: 'grassPaddock',
        title: 'Çim Padok',
        dataType: 'BOOLEAN',
        isRequired: false,
        isPublicVisible: true,
        isFormVisible: true,
        isFilterable: true,
        sortOrder: 1,
        isActive: true,
        version: 1,
        options: [],
        validation: {},
        uiMetadata: {},
    },
    {
        id: `prop-sand-${catId}`,
        categoryId: catId,
        code: 'sandPaddock',
        title: 'Kum Padok',
        dataType: 'BOOLEAN',
        isRequired: false,
        isPublicVisible: true,
        isFormVisible: true,
        isFilterable: true,
        sortOrder: 2,
        isActive: true,
        version: 1,
        options: [],
        validation: {},
        uiMetadata: {},
    },
    {
        id: `prop-stallion-${catId}`,
        categoryId: catId,
        code: 'stallionPaddock',
        title: 'Aygır Padoğu',
        dataType: 'BOOLEAN',
        isRequired: false,
        isPublicVisible: true,
        isFormVisible: true,
        isFilterable: true,
        sortOrder: 3,
        isActive: true,
        version: 1,
        options: [],
        validation: {},
        uiMetadata: {},
    },
    {
        id: `prop-vet-${catId}`,
        categoryId: catId,
        code: 'vet',
        title: 'Veteriner',
        dataType: 'BOOLEAN',
        isRequired: false,
        isPublicVisible: true,
        isFormVisible: true,
        isFilterable: true,
        sortOrder: 4,
        isActive: true,
        version: 1,
        options: [],
        validation: {},
        uiMetadata: {},
    },
    {
        id: `prop-farrier-${catId}`,
        categoryId: catId,
        code: 'farrier',
        title: 'Nalbant',
        dataType: 'BOOLEAN',
        isRequired: false,
        isPublicVisible: true,
        isFormVisible: true,
        isFilterable: true,
        sortOrder: 5,
        isActive: true,
        version: 1,
        options: [],
        validation: {},
        uiMetadata: {},
    },
    {
        id: `prop-foaling-${catId}`,
        categoryId: catId,
        code: 'foalingBarn',
        title: 'Doğumhane',
        dataType: 'BOOLEAN',
        isRequired: false,
        isPublicVisible: true,
        isFormVisible: true,
        isFilterable: true,
        sortOrder: 6,
        isActive: true,
        version: 1,
        options: [],
        validation: {},
        uiMetadata: {},
    },
    {
        id: `prop-training-track-${catId}`,
        categoryId: catId,
        code: 'trainingTrack',
        title: 'İdman Pisti',
        dataType: 'STRING',
        isRequired: false,
        isPublicVisible: true,
        isFormVisible: true,
        isFilterable: false,
        sortOrder: 7,
        isActive: true,
        version: 1,
        options: [],
        validation: {},
        uiMetadata: {},
    },
];

const NAKLIYE_PROPERTIES_TEMPLATE = (catId: string): CategoryProperty[] => [
    {
        id: `prop-company-${catId}`,
        categoryId: catId,
        code: 'companyName',
        title: 'Firma Adı',
        dataType: 'STRING',
        isRequired: true,
        isPublicVisible: true,
        isFormVisible: true,
        isFilterable: false,
        sortOrder: 1,
        isActive: true,
        version: 1,
        options: [],
        validation: {},
        uiMetadata: {},
    },
    {
        id: `prop-website-${catId}`,
        categoryId: catId,
        code: 'websiteUrl',
        title: 'Web Sitesi',
        dataType: 'STRING',
        isRequired: false,
        isPublicVisible: true,
        isFormVisible: true,
        isFilterable: false,
        sortOrder: 2,
        isActive: true,
        version: 1,
        options: [],
        validation: {},
        uiMetadata: {},
    },
];

const STUD_PROPERTIES_TEMPLATE = (catId: string): CategoryProperty[] => [
    {
        id: `prop-stud-breed-${catId}`,
        categoryId: catId,
        code: 'STALLION_BREED',
        title: 'Aygır Irkı',
        dataType: 'SINGLE_SELECT',
        isRequired: true,
        isPublicVisible: true,
        isFormVisible: true,
        isFilterable: true,
        sortOrder: 1,
        isActive: true,
        version: 1,
        options: [
            { value: 'Arap', label: 'Arap' },
            { value: 'İngiliz', label: 'İngiliz' },
        ],
        validation: {},
        uiMetadata: {},
    },
    {
        id: `prop-stud-age-${catId}`,
        categoryId: catId,
        code: 'STALLION_AGE',
        title: 'Aşım Yaşı',
        dataType: 'SINGLE_SELECT',
        isRequired: true,
        isPublicVisible: true,
        isFormVisible: true,
        isFilterable: true,
        sortOrder: 2,
        isActive: true,
        version: 1,
        options: [
            { value: '0', label: '0' },
            { value: '1', label: '1' },
            { value: '1.5', label: '1.5' },
            { value: '2', label: '2' },
            { value: '3', label: '3' },
            { value: '4', label: '4' },
            { value: '5+', label: '5+' },
        ],
        validation: {},
        uiMetadata: {},
    },
    {
        id: `prop-stud-color-${catId}`,
        categoryId: catId,
        code: 'COAT_COLOR',
        title: 'Donu (Renk)',
        dataType: 'SINGLE_SELECT',
        isRequired: true,
        isPublicVisible: true,
        isFormVisible: true,
        isFilterable: true,
        sortOrder: 3,
        isActive: true,
        version: 1,
        options: [
            { value: 'Doru', label: 'Doru' },
            { value: 'Al', label: 'Al' },
            { value: 'Kır', label: 'Kır' },
            { value: 'Beyaz', label: 'Beyaz' },
            { value: 'Yağız', label: 'Yağız' },
            { value: 'Kula', label: 'Kula' },
            { value: 'Boz', label: 'Boz' },
        ],
        validation: {},
        uiMetadata: {},
    },
];

const DEFAULT_PROPERTIES_MAP: Record<string, CategoryProperty[]> = {
    'cat-satilik-yaris-ati': HORSE_PROPERTIES_TEMPLATE('cat-satilik-yaris-ati'),
    'satilik-yaris-ati': HORSE_PROPERTIES_TEMPLATE('satilik-yaris-ati'),
    'cat-satilik-kisrak': HORSE_PROPERTIES_TEMPLATE('cat-satilik-kisrak'),
    'satilik-kisrak': HORSE_PROPERTIES_TEMPLATE('satilik-kisrak'),
    'cat-satilik-aygir': HORSE_PROPERTIES_TEMPLATE('cat-satilik-aygir'),
    'satilik-aygir': HORSE_PROPERTIES_TEMPLATE('satilik-aygir'),
    'cat-satilik-binek-ati': HORSE_PROPERTIES_TEMPLATE('cat-satilik-binek-ati'),
    'satilik-binek-ati': HORSE_PROPERTIES_TEMPLATE('satilik-binek-ati'),
    'cat-satilik-pony': HORSE_PROPERTIES_TEMPLATE('cat-satilik-pony'),
    'satilik-pony': HORSE_PROPERTIES_TEMPLATE('satilik-pony'),
    'cat-satilik-atlar': HORSE_PROPERTIES_TEMPLATE('cat-satilik-atlar'),
    'satilik-atlar': HORSE_PROPERTIES_TEMPLATE('satilik-atlar'),

    'cat-pansiyon': PANSIYON_PROPERTIES_TEMPLATE('cat-pansiyon'),
    'pansiyon-haralar': PANSIYON_PROPERTIES_TEMPLATE('pansiyon-haralar'),

    'cat-nakliye': NAKLIYE_PROPERTIES_TEMPLATE('cat-nakliye'),
    'at-nakliyesi': NAKLIYE_PROPERTIES_TEMPLATE('at-nakliyesi'),

    'cat-nalbant': [],
    'nalbantlar': [],

    'cat-arap-aygir': STUD_PROPERTIES_TEMPLATE('cat-arap-aygir'),
    'arap-aygir': STUD_PROPERTIES_TEMPLATE('arap-aygir'),
    'cat-ingiliz-aygir': STUD_PROPERTIES_TEMPLATE('cat-ingiliz-aygir'),
    'ingiliz-aygir': STUD_PROPERTIES_TEMPLATE('ingiliz-aygir'),
    'cat-asim-hizmetleri': STUD_PROPERTIES_TEMPLATE('cat-asim-hizmetleri'),
    'asim-hizmetleri': STUD_PROPERTIES_TEMPLATE('asim-hizmetleri'),
};


const baseUrl = `${API_URL}v1/admin/categories`;

class CategoryService {
    private localCategories: AdminCategoryItem[] = [...DEFAULT_ADMIN_CATEGORIES];
    private localProperties: Record<string, CategoryProperty[]> = { ...DEFAULT_PROPERTIES_MAP };

    private getStoredProperties(categoryId: string): CategoryProperty[] | null {
        if (typeof window === 'undefined') return null;
        try {
            const raw =
                localStorage.getItem(`haradan_category_properties_${categoryId}`) ||
                localStorage.getItem(`haradan_category_properties_cat-${categoryId}`) ||
                localStorage.getItem(`haradan_category_properties_${categoryId.replace(/^cat-/, '')}`);
            if (raw) return JSON.parse(raw);
        } catch {}
        return null;
    }

    private saveStoredProperties(categoryId: string, properties: CategoryProperty[]) {
        if (typeof window === 'undefined') return;
        try {
            const keysToUpdate = new Set<string>();
            keysToUpdate.add(categoryId);
            keysToUpdate.add(`cat-${categoryId}`);
            keysToUpdate.add(categoryId.replace(/^cat-/, ''));

            const cat = this.localCategories.find((c) => c.id === categoryId || c.slug === categoryId);
            if (cat && cat.slug) {
                keysToUpdate.add(cat.slug);
                keysToUpdate.add(`cat-${cat.slug}`);
                keysToUpdate.add(cat.slug.replace(/^cat-/, ''));
            }

            const jsonVal = JSON.stringify(properties);
            keysToUpdate.forEach((k) => {
                localStorage.setItem(`haradan_category_properties_${k}`, jsonVal);
            });

            window.dispatchEvent(new CustomEvent('haradan_category_properties_changed', { detail: { categoryId } }));
        } catch {}
    }

    async search(params: SearchParams<CategoryResponse>) {
        const items = await this.fetchAll();
        const filtered = this.applyFilter(items, params.filter);
        const tree = this.buildTree(filtered);
        return this.toPagedResponse(tree, params.pageRequest);
    }

    async save(request: CategoryRequest) {
        try {
            await axiosInstance.post(baseUrl, {
                name: request.name,
                slug: request.slug,
                parentId: request.parentId || undefined,
                description: request.description,
            });
        } catch {
            const newId = `cat-${request.slug || Date.now()}`;
            this.localCategories.push({
                id: newId,
                name: request.name,
                slug: request.slug,
                parentId: request.parentId || null,
                sortOrder: this.localCategories.length + 1,
                isActive: true,
                version: 1,
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
                name: request.name,
                slug: request.slug,
                sortOrder: request.sortOrder,
                description: request.description,
            });
        } catch {
            const idx = this.localCategories.findIndex((c) => c.id === request.identifier);
            if (idx >= 0) {
                this.localCategories[idx] = {
                    ...this.localCategories[idx],
                    name: request.name,
                    slug: request.slug,
                    sortOrder: request.sortOrder ?? this.localCategories[idx].sortOrder,
                    description: request.description,
                    version: (this.localCategories[idx].version || 1) + 1,
                };
            }
        }
    }

    async _delete(identifier: string, expectedVersion?: number) {
        try {
            await axiosInstance.post(`${baseUrl}/${identifier}/active`, {
                expectedVersion: Math.max(1, expectedVersion ?? 1),
                isActive: false,
            });
        } catch {
            const idx = this.localCategories.findIndex((c) => c.id === identifier);
            if (idx >= 0) {
                this.localCategories[idx].isActive = false;
            }
        }
    }

    async activate(identifier: string, expectedVersion?: number) {
        try {
            await axiosInstance.post(`${baseUrl}/${identifier}/active`, {
                expectedVersion: Math.max(1, expectedVersion ?? 1),
                isActive: true,
            });
        } catch {
            const idx = this.localCategories.findIndex((c) => c.id === identifier);
            if (idx >= 0) {
                this.localCategories[idx].isActive = true;
            }
        }
    }

    async reparent(identifier: string, expectedVersion: number, parentId?: string): Promise<number | undefined> {
        try {
            const response = await axiosInstance.post<AdminCategoryItem>(`${baseUrl}/${identifier}/reparent`, {
                expectedVersion: Math.max(1, expectedVersion ?? 1),
                newParentId: parentId || undefined,
            });
            return typeof response.data?.version === 'number' ? response.data.version : undefined;
        } catch {
            const idx = this.localCategories.findIndex((c) => c.id === identifier);
            if (idx >= 0) {
                this.localCategories[idx].parentId = parentId || null;
                this.localCategories[idx].version = (this.localCategories[idx].version || 1) + 1;
                return this.localCategories[idx].version;
            }
            return undefined;
        }
    }

    async reorderCategories(items: ReorderItem[]) {
        try {
            await axiosInstance.put(`${baseUrl}/reorder`, { items });
        } catch {
            items.forEach((it) => {
                const node = this.localCategories.find((c) => c.id === it.id);
                if (node) {
                    node.sortOrder = it.sortOrder;
                    node.version = (node.version || 1) + 1;
                }
            });
        }
    }

    async listProperties(categoryId: string, categoryName?: string, categorySlug?: string): Promise<CategoryProperty[]> {
        const stored = this.getStoredProperties(categoryId);
        if (stored && Array.isArray(stored)) {
            this.localProperties[categoryId] = stored;
            return stored;
        }

        let backendItems: CategoryProperty[] = [];
        try {
            const response = await axiosInstance.get<AdminCategoryPropertyListResponse>(
                `${baseUrl}/${categoryId}/properties`,
            );
            if (response.data?.items && Array.isArray(response.data.items)) {
                backendItems = response.data.items;
            }
        } catch {
            // fallback
        }

        if (backendItems.length > 0) {
            this.localProperties[categoryId] = backendItems;
            this.saveStoredProperties(categoryId, backendItems);
            return backendItems;
        }

        const cat = this.localCategories.find((c) => c.id === categoryId || c.slug === categoryId);
        const cid = (categoryId || '').toLowerCase();
        const cslug = (categorySlug || cat?.slug || '').toLowerCase();
        const cname = (categoryName || cat?.name || '').toLowerCase();
        const checkStr = `${cid} ${cslug} ${cname}`;

        let baseDefaults: CategoryProperty[] = [];
        if (checkStr.includes('pansiyon') || checkStr.includes('hara')) {
            baseDefaults = DEFAULT_PROPERTIES_MAP['cat-pansiyon'] || [];
        } else if (
            checkStr.includes('asim') ||
            checkStr.includes('aşım') ||
            checkStr.includes('aygir') ||
            checkStr.includes('aygır') ||
            checkStr.includes('stud')
        ) {
            baseDefaults = DEFAULT_PROPERTIES_MAP['cat-arap-aygir'] || [];
        } else if (checkStr.includes('nakliye') || checkStr.includes('transport')) {
            baseDefaults = DEFAULT_PROPERTIES_MAP['cat-nakliye'] || [];
        } else if (checkStr.includes('nalbant') || checkStr.includes('farrier')) {
            baseDefaults = DEFAULT_PROPERTIES_MAP['cat-nalbant'] || [];
        } else {
            baseDefaults = DEFAULT_PROPERTIES_MAP['cat-satilik-yaris-ati'] || [];
        }

        const result = baseDefaults.map((p) => ({ ...p, categoryId }));
        this.localProperties[categoryId] = result;
        this.saveStoredProperties(categoryId, result);
        return result;
    }




    async createProperty(categoryId: string, request: CreateCategoryPropertyRequest) {
        let createdProp: CategoryProperty | null = null;
        try {
            const response = await axiosInstance.post(`${baseUrl}/${categoryId}/properties`, request);
            createdProp = response.data as CategoryProperty;
        } catch {
            createdProp = {
                id: `prop-${Date.now()}`,
                categoryId,
                code: request.code || request.title.toUpperCase().replace(/\s+/g, '_'),
                title: request.title,
                helpText: request.helpText,
                dataType: request.dataType,
                isRequired: Boolean(request.isRequired),
                isPublicVisible: request.isPublicVisible ?? true,
                isFormVisible: request.isFormVisible ?? true,
                isFilterable: Boolean(request.isFilterable),
                sortOrder: request.sortOrder ?? 1,
                isActive: true,
                version: 1,
                options: request.options ?? [],
                validation: request.validation ?? {},
                defaultValue: request.defaultValue,
                uiMetadata: request.uiMetadata ?? {},
            };
        }

        const list = this.localProperties[categoryId] || [];
        const existingIdx = list.findIndex((p) => p.id === createdProp!.id || p.code === createdProp!.code);
        if (existingIdx >= 0) {
            list[existingIdx] = createdProp!;
        } else {
            list.push(createdProp!);
        }
        this.localProperties[categoryId] = list;
        this.saveStoredProperties(categoryId, list);
        return createdProp!;
    }

    async updateProperty(categoryId: string, propertyId: string, request: UpdateCategoryPropertyRequest) {
        let updatedProp: CategoryProperty | null = null;
        try {
            const response = await axiosInstance.patch(
                `${baseUrl}/${categoryId}/properties/${propertyId}`,
                request,
            );
            updatedProp = response.data as CategoryProperty;
        } catch {
            const list = this.localProperties[categoryId] || [];
            const idx = list.findIndex((p) => p.id === propertyId || p.code === propertyId);
            if (idx >= 0) {
                updatedProp = {
                    ...list[idx],
                    title: request.title ?? list[idx].title,
                    helpText: request.helpText ?? list[idx].helpText,
                    isRequired: request.isRequired ?? list[idx].isRequired,
                    isPublicVisible: request.isPublicVisible ?? list[idx].isPublicVisible,
                    isFormVisible: request.isFormVisible ?? list[idx].isFormVisible,
                    isFilterable: request.isFilterable ?? list[idx].isFilterable,
                    sortOrder: request.sortOrder ?? list[idx].sortOrder,
                    options: request.options ?? list[idx].options,
                    validation: request.validation ?? list[idx].validation,
                    defaultValue: request.defaultValue ?? list[idx].defaultValue,
                    uiMetadata: request.uiMetadata ?? list[idx].uiMetadata,
                    version: (list[idx].version || 1) + 1,
                };
            }
        }

        const list = this.localProperties[categoryId] || [];
        const idx = list.findIndex((p) => p.id === propertyId || p.code === propertyId);
        if (idx >= 0 && updatedProp) {
            list[idx] = updatedProp;
        } else if (updatedProp) {
            list.push(updatedProp);
        }
        this.localProperties[categoryId] = list;
        this.saveStoredProperties(categoryId, list);
        if (updatedProp) return updatedProp;
        throw new Error('Özellik bulunamadı.');
    }

    async setPropertyActive(
        categoryId: string,
        propertyId: string,
        expectedVersion: number,
        isActive: boolean,
    ) {
        let resultProp: CategoryProperty | null = null;
        try {
            const response = await axiosInstance.post(
                `${baseUrl}/${categoryId}/properties/${propertyId}/active`,
                {
                    expectedVersion: Math.max(1, expectedVersion),
                    isActive,
                },
            );
            resultProp = response.data as CategoryProperty;
        } catch {
            // fallback handled below
        }

        const list = this.localProperties[categoryId] || [];
        const prop = list.find((p) => p.id === propertyId || p.code === propertyId);
        if (prop) {
            prop.isActive = isActive;
            prop.version = Math.max(1, expectedVersion) + 1;
            resultProp = prop;
        } else if (resultProp) {
            list.push(resultProp);
        }

        this.localProperties[categoryId] = list;
        this.saveStoredProperties(categoryId, list);

        if (resultProp) {
            return resultProp;
        }
        throw new Error('Özellik bulunamadı.');
    }

    async deleteProperty(categoryId: string, propertyId: string, version?: number) {
        // 1. Tell backend to set isActive = false so DB marks it inactive
        try {
            await this.setPropertyActive(categoryId, propertyId, version ?? 1, false);
        } catch {
            // ignore
        }

        // 2. Also attempt DELETE endpoint
        try {
            await axiosInstance.delete(`${baseUrl}/${categoryId}/properties/${propertyId}`);
        } catch {
            // fallback
        }

        // 3. Purge from local state and save across all category storage keys
        const current = this.getStoredProperties(categoryId) || this.localProperties[categoryId] || [];
        const list = current.filter(
            (p) => p.id !== propertyId && p.code !== propertyId && p.title !== propertyId
        );
        this.localProperties[categoryId] = list;
        this.saveStoredProperties(categoryId, list);
    }

    async reorderProperties(categoryId: string, items: ReorderItem[]) {
        try {
            await axiosInstance.put(`${baseUrl}/${categoryId}/properties/reorder`, { items });
        } catch {
            // fallback
        }
        const list = this.localProperties[categoryId] || [];
        items.forEach((it) => {
            const prop = list.find((p) => p.id === it.id || p.code === it.id);
            if (prop) {
                prop.sortOrder = it.sortOrder;
                prop.version = (prop.version || 1) + 1;
            }
        });
        this.localProperties[categoryId] = list;
        this.saveStoredProperties(categoryId, list);
    }


    private async fetchAll() {
        const items: AdminCategoryItem[] = [];
        let cursor: string | undefined;
        let hasMore = true;

        try {
            while (hasMore) {
                const response = await axiosInstance.get<AdminCategoryListResponse>(baseUrl, {
                    params: {
                        cursor,
                        limit: 100,
                    },
                });
                items.push(...(response.data?.items || []));
                hasMore = !!response.data?.hasMore;
                cursor = response.data?.nextCursor;
            }
            if (items.length > 0) {
                items.forEach((item) => {
                    const idx = this.localCategories.findIndex((c) => c.id === item.id || c.slug === item.slug);
                    if (idx >= 0) {
                        this.localCategories[idx] = { ...this.localCategories[idx], ...item };
                    } else {
                        this.localCategories.push(item);
                    }
                });
                return items;
            }
        } catch {
            // fallback
        }

        return [...this.localCategories];
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
