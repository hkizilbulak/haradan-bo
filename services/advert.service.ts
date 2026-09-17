import { API_URL } from '@/contants/urls';
import { apiRequest } from '@/helpers/api/openapiClient';
import { withIdentifier } from '@/helpers/api/mapIdentifier';
import { ModerationAdvertResponse } from '@/models';
import { PagedResponse, PageParams, SearchParams } from '@/models/common';
import { getAdvertMainCategory } from '@/helpers/advertCategoryHelper';

type OwnerAdvertItem = {
    id: string;
    title?: string | null;
    publishedAt?: string | null;
    createdAt?: string | null;
    deletedAt?: string | null;
    status: ModerationAdvertResponse['status'];
    version: number;
    mediaVersion?: number;
    categoryId?: string | null;
    ownerUserId?: string | null;
    ownerName?: string | null;
    properties?: Record<string, any>;
    rejectionReason?: string | null;
    price?: { amountMinor?: number; amount?: number; currency: string } | null;
    districtId?: string | number | null;
    provinceId?: string | number | null;
    provinceName?: string | null;
    districtName?: string | null;
    locationName?: string | null;
    location?: { districtId?: string; districtName?: string; provinceId?: string; provinceName?: string; name?: string } | null;
    sellerPhone?: string | null;
    media?: Array<{
        assetId: string;
        displayOrder: number;
        isCover: boolean;
        lifecycleStatus?: string;
        publicUrl?: string;
    }>;
    cover?: {
        assetId?: string;
        publicUrl?: string;
        url?: string;
    } | null;
};

type ModerationQueueResponse = {
    hasMore: boolean;
    items: OwnerAdvertItem[];
    nextCursor?: string;
    totalCount?: number;
};

export type ModerationAdvertDetail = OwnerAdvertItem & {
    ownerUserId: string;
    sellerPhone?: string | null;
    description?: string | null;
    rejectionReason?: string | null;
    price?: { amountMinor?: number; amount?: number; currency: string } | null;
    districtId?: string | number | null;
    provinceId?: string | number | null;
    provinceName?: string | null;
    districtName?: string | null;
    locationName?: string | null;
    horseId?: string | null;
    categoryClearedWarning?: boolean;
    properties?: Record<string, any>;
    media?: Array<{
        assetId: string;
        displayOrder: number;
        isCover: boolean;
        lifecycleStatus?: string;
    }>;
    statusHistory?: Array<{
        fromStatus?: string | null;
        toStatus: string;
        reason?: string | null;
        isSystem: boolean;
        createdAt: string;
        actorUserId?: string | null;
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
    nextCursor?: string;
    hasMore?: boolean;
};

export type AdminAdvertPaymentResponse = {
    id: string;
    packageCode: string;
    status: string;
    paymentMethod: string;
    amountMinor: number;
    currencyCode: string;
    createdAt: string;
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

function toModerationAdvert(item: any): ModerationAdvertResponse {
    const mapped = withIdentifier(item);
    const rawCreated = item.createdAt
        || item.created_at
        || item.properties?.createdAt
        || item.properties?.submittedAt
        || item.submittedAt
        || item.updatedAt
        || item.updated_at
        || item.createdDate
        || item.createDate
        || item.publishedAt;

    const rawUpdated = item.updatedAt
        || item.updated_at
        || item.properties?.updatedAt;

    const loc = item.location;
    const districtId = item.districtId ?? loc?.districtId ?? item.properties?.districtId;
    const provinceId = item.provinceId ?? loc?.provinceId ?? item.properties?.provinceId;
    const districtName = item.districtName ?? loc?.districtName ?? item.properties?.districtName ?? item.properties?.ilce ?? item.properties?.district;
    const provinceName = item.provinceName ?? loc?.provinceName ?? item.properties?.provinceName ?? item.properties?.sehir ?? item.properties?.il;
    const locationName = item.locationName ?? loc?.locationName ?? loc?.name ?? (provinceName && districtName ? `${provinceName} / ${districtName}` : provinceName || districtName);

    return {
        ...mapped,
        identifier: mapped.id,
        title: item.title ?? undefined,
        publishedAt: item.publishedAt ?? undefined,
        createdAt: rawCreated ?? undefined,
        updatedAt: rawUpdated ?? undefined,
        deletedAt: item.deletedAt ?? undefined,
        status: item.status,
        version: item.version,
        mediaVersion: item.mediaVersion,
        categoryId: item.categoryId ?? undefined,
        ownerUserId: item.ownerUserId ?? item.owner_user_id ?? undefined,
        ownerName: item.ownerName ?? item.properties?.ownerName ?? undefined,
        properties: item.properties ?? undefined,
        price: item.price ?? (item.properties?.fiyat ? { amount: item.properties.fiyat, currency: 'TRY' } : undefined),
        districtId: districtId ?? undefined,
        provinceId: provinceId ?? undefined,
        districtName: districtName ?? undefined,
        provinceName: provinceName ?? undefined,
        locationName: locationName ?? undefined,
        location: loc ?? (provinceName || districtName ? { districtId, districtName, provinceId, provinceName, name: locationName } : undefined),
        sellerPhone: item.sellerPhone ?? item.properties?.sellerPhone ?? item.properties?.phone ?? undefined,
    };
}

export const DEFAULT_MOCK_MEDIA: Record<string, Array<{ assetId: string; displayOrder: number; isCover: boolean }>> = {
    'adv-001': [
        { assetId: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=1200&q=80', displayOrder: 0, isCover: true },
        { assetId: 'https://images.unsplash.com/photo-1598974357801-cbca100e65d3?auto=format&fit=crop&w=1200&q=80', displayOrder: 1, isCover: false },
    ],
    'adv-002': [
        { assetId: 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?auto=format&fit=crop&w=1200&q=80', displayOrder: 0, isCover: true },
        { assetId: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1200&q=80', displayOrder: 1, isCover: false },
        { assetId: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80', displayOrder: 2, isCover: false },
    ],
    'adv-003': [
        { assetId: 'https://images.unsplash.com/photo-1731838618093-7ed3508d2fcd?auto=format&fit=crop&w=1200&q=80', displayOrder: 0, isCover: true },
        { assetId: 'https://images.unsplash.com/photo-1500485035595-cbe6f645feb1?auto=format&fit=crop&w=1200&q=80', displayOrder: 1, isCover: false },
    ],
    'adv-suspend-001': [
        { assetId: 'https://images.unsplash.com/photo-1493962853295-0fd70327578a?auto=format&fit=crop&w=1200&q=80', displayOrder: 0, isCover: true },
    ],
    'adv-nalbant-001': [
        { assetId: 'https://images.unsplash.com/photo-1766524872796-ff2a543004bb?auto=format&fit=crop&w=1200&q=80', displayOrder: 0, isCover: true },
    ],
    'adv-abacan-002': [
        { assetId: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=1200&q=80', displayOrder: 0, isCover: true },
    ],
    'adv-deneme-003': [
        { assetId: 'https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?auto=format&fit=crop&w=1200&q=80', displayOrder: 0, isCover: true },
    ],
    'adv-deneme-ilan-004': [
        { assetId: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=1200&q=80', displayOrder: 0, isCover: true },
    ],
    '1001': [
        { assetId: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=1200&q=80', displayOrder: 0, isCover: true },
        { assetId: 'https://images.unsplash.com/photo-1598974357801-cbca100e65d3?auto=format&fit=crop&w=1200&q=80', displayOrder: 1, isCover: false },
    ],
    '1002': [
        { assetId: 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?auto=format&fit=crop&w=1200&q=80', displayOrder: 0, isCover: true },
        { assetId: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1200&q=80', displayOrder: 1, isCover: false },
        { assetId: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80', displayOrder: 2, isCover: false },
    ],
    '1003': [
        { assetId: 'https://images.unsplash.com/photo-1731838618093-7ed3508d2fcd?auto=format&fit=crop&w=1200&q=80', displayOrder: 0, isCover: true },
        { assetId: 'https://images.unsplash.com/photo-1500485035595-cbe6f645feb1?auto=format&fit=crop&w=1200&q=80', displayOrder: 1, isCover: false },
    ],
    '1004': [
        { assetId: 'https://images.unsplash.com/photo-1493962853295-0fd70327578a?auto=format&fit=crop&w=1200&q=80', displayOrder: 0, isCover: true },
    ],
    '1005': [
        { assetId: 'https://images.unsplash.com/photo-1766524872796-ff2a543004bb?auto=format&fit=crop&w=1200&q=80', displayOrder: 0, isCover: true },
    ],
    '1006': [
        { assetId: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=1200&q=80', displayOrder: 0, isCover: true },
    ],
    '1007': [
        { assetId: 'https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?auto=format&fit=crop&w=1200&q=80', displayOrder: 0, isCover: true },
    ],
    '1008': [
        { assetId: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=1200&q=80', displayOrder: 0, isCover: true },
    ],
};

const fallbackMockAdverts: OwnerAdvertItem[] = [
    {
        id: 'adv-nalbant-001',
        title: 'denem nalbant',
        publishedAt: null,
        createdAt: '2026-09-13T11:45:00Z',
        deletedAt: null,
        status: 'PENDING_REVIEW',
        version: 1,
        mediaVersion: 1,
        categoryId: 'c1000000-0000-4000-8000-000000000023',
        ownerUserId: 'u1000000-0000-4000-8000-000000000001',
        ownerName: 'Admin Kullanıcı',
        price: { amountMinor: 2500000, currency: 'TRY' },
        provinceId: '47ff002c-f6f2-5c01-81a9-460b23ba9712',
        provinceName: 'Bursa',
        districtName: 'Osmangazi',
        locationName: 'Bursa / Osmangazi',
        properties: {
            ownerName: 'Admin Kullanıcı',
            ownerEmail: 'admin@haradan.com',
            sehir: 'Bursa',
            ilce: 'Osmangazi',
            fiyat: '25.000 TL',
            sellerPhone: '0532 123 45 67',
            phone: '0532 123 45 67',
        },
        media: DEFAULT_MOCK_MEDIA['adv-nalbant-001'],
    },
    {
        id: 'adv-abacan-002',
        title: 'ABACAN',
        publishedAt: null,
        createdAt: '2026-09-13T10:30:00Z',
        deletedAt: null,
        status: 'PENDING_REVIEW',
        version: 1,
        mediaVersion: 1,
        categoryId: 'c1000000-0000-4000-8000-000000000011',
        ownerUserId: 'u1000000-0000-4000-8000-000000000001',
        ownerName: 'Admin Kullanıcı',
        price: { amountMinor: 125000000, currency: 'TRY' },
        provinceId: '2436cf3e-a250-511c-aa39-c5cd1c8a3f71',
        provinceName: 'Ankara',
        districtName: 'Çankaya',
        locationName: 'Ankara / Çankaya',
        properties: {
            ownerName: 'Admin Kullanıcı',
            ownerEmail: 'admin@haradan.com',
            sehir: 'Ankara',
            ilce: 'Çankaya',
            fiyat: '1.250.000 TL',
            sellerPhone: '0532 123 45 67',
            phone: '0532 123 45 67',
        },
        media: DEFAULT_MOCK_MEDIA['adv-abacan-002'],
    },
    {
        id: 'adv-deneme-003',
        title: 'deneme',
        publishedAt: null,
        createdAt: '2026-09-12T17:15:00Z',
        deletedAt: null,
        status: 'PENDING_REVIEW',
        version: 1,
        mediaVersion: 1,
        categoryId: 'c1000000-0000-4000-8000-000000000011',
        ownerUserId: 'u1000000-0000-4000-8000-000000000001',
        ownerName: 'Admin Kullanıcı',
        price: { amountMinor: 75000000, currency: 'TRY' },
        provinceId: 'c029c5bf-570e-5eb2-9d0f-0437fa131ff1',
        provinceName: 'İstanbul',
        districtName: 'Kadıköy',
        locationName: 'İstanbul / Kadıköy',
        properties: {
            ownerName: 'Admin Kullanıcı',
            ownerEmail: 'admin@haradan.com',
            sehir: 'İstanbul',
            ilce: 'Kadıköy',
            fiyat: '750.000 TL',
            sellerPhone: '0532 123 45 67',
            phone: '0532 123 45 67',
        },
        media: DEFAULT_MOCK_MEDIA['adv-deneme-003'],
    },
    {
        id: 'adv-deneme-ilan-004',
        title: 'deneme ilan',
        publishedAt: null,
        createdAt: '2026-09-12T14:20:00Z',
        deletedAt: null,
        status: 'PENDING_REVIEW',
        version: 1,
        mediaVersion: 1,
        categoryId: 'c1000000-0000-4000-8000-000000000011',
        ownerUserId: 'u1000000-0000-4000-8000-000000000001',
        ownerName: 'Admin Kullanıcı',
        price: { amountMinor: 48000000, currency: 'TRY' },
        provinceId: '64f1681f-bd67-5b6d-a0fb-cb67e70dda74',
        provinceName: 'İzmir',
        districtName: 'Urla',
        locationName: 'İzmir / Urla',
        properties: {
            ownerName: 'Admin Kullanıcı',
            ownerEmail: 'admin@haradan.com',
            sehir: 'İzmir',
            ilce: 'Urla',
            fiyat: '480.000 TL',
            sellerPhone: '0532 123 45 67',
            phone: '0532 123 45 67',
        },
        media: DEFAULT_MOCK_MEDIA['adv-deneme-ilan-004'],
    },
    {
        id: 'adv-001',
        title: 'Satılık Arap Atı - Rüzgar',
        publishedAt: '2026-03-01T10:00:00Z',
        createdAt: '2026-03-01T08:00:00Z',
        deletedAt: null,
        status: 'PUBLISHED',
        version: 1,
        mediaVersion: 1,
        categoryId: 'c1000000-0000-4000-8000-000000000011',
        ownerUserId: 'u1000000-0000-4000-8000-000000000001',
        ownerName: 'Admin Kullanıcı',
        price: { amountMinor: 35000000, currency: 'TRY' },
        provinceId: 'c029c5bf-570e-5eb2-9d0f-0437fa131ff1',
        provinceName: 'İstanbul',
        districtName: 'Bakırköy',
        locationName: 'İstanbul / Bakırköy',
        properties: { ownerName: 'Admin Kullanıcı', ownerEmail: 'admin@haradan.com', sehir: 'İstanbul', ilce: 'Bakırköy', fiyat: '350.000 TL', sellerPhone: '0532 111 22 33', phone: '0532 111 22 33' },
        media: DEFAULT_MOCK_MEDIA['adv-001'],
    },
    {
        id: 'adv-002',
        title: 'Şampiyon İngiliz Yarış Atı',
        publishedAt: '2026-03-02T11:00:00Z',
        createdAt: '2026-03-02T09:30:00Z',
        deletedAt: null,
        status: 'PUBLISHED',
        version: 1,
        mediaVersion: 1,
        categoryId: 'c1000000-0000-4000-8000-000000000011',
        ownerUserId: 'u1000000-0000-4000-8000-000000000001',
        ownerName: 'Admin Kullanıcı',
        price: { amountMinor: 50000000, currency: 'TRY' },
        provinceId: '99307140-598f-59c3-b219-892878bd5e7d',
        provinceName: 'Kocaeli',
        districtName: 'Kartepe',
        locationName: 'Kocaeli / Kartepe',
        properties: { ownerName: 'Admin Kullanıcı', ownerEmail: 'admin@haradan.com', sehir: 'Kocaeli', ilce: 'Kartepe', fiyat: '500.000 TL', sellerPhone: '0533 222 33 44', phone: '0533 222 33 44' },
        media: DEFAULT_MOCK_MEDIA['adv-002'],
    },
    {
        id: 'adv-003',
        title: 'Safkan İngiliz Tay - 2 Yaş',
        publishedAt: null,
        createdAt: '2026-09-11T09:10:00Z',
        deletedAt: null,
        status: 'PENDING_REVIEW',
        version: 1,
        mediaVersion: 1,
        categoryId: 'c1000000-0000-4000-8000-000000000011',
        ownerUserId: 'u1000000-0000-4000-8000-000000000001',
        ownerName: 'Admin Kullanıcı',
        price: { amountMinor: 28000000, currency: 'TRY' },
        provinceId: '802aa4c5-68d5-56e3-b5d8-c98b5d7f7874',
        provinceName: 'Adana',
        districtName: 'Seyhan',
        locationName: 'Adana / Seyhan',
        properties: { ownerName: 'Admin Kullanıcı', ownerEmail: 'admin@haradan.com', sehir: 'Adana', ilce: 'Seyhan', fiyat: '280.000 TL', sellerPhone: '0532 123 45 67', phone: '0532 123 45 67' },
        media: DEFAULT_MOCK_MEDIA['adv-003'],
    },
    {
        id: 'adv-suspend-001',
        title: 'Safkan Arap Tayı',
        publishedAt: null,
        createdAt: '2026-09-12T12:00:00Z',
        deletedAt: null,
        status: 'SUSPENDED',
        version: 1,
        mediaVersion: 1,
        categoryId: 'c1000000-0000-4000-8000-000000000011',
        ownerUserId: 'u1000000-0000-4000-8000-000000000001',
        ownerName: 'Admin Kullanıcı',
        price: { amountMinor: 60000000, currency: 'TRY' },
        provinceId: 'f99e4649-2d13-539a-92e1-12b7c6d03b12',
        provinceName: 'Eskişehir',
        districtName: 'Tepebaşı',
        locationName: 'Eskişehir / Tepebaşı',
        properties: { ownerName: 'Admin Kullanıcı', ownerEmail: 'admin@haradan.com', sehir: 'Eskişehir', ilce: 'Tepebaşı', fiyat: '600.000 TL', sellerPhone: '0535 333 44 55', phone: '0535 333 44 55' },
        media: DEFAULT_MOCK_MEDIA['adv-suspend-001'],
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
                            const itemMedia = Array.isArray(item.media) && item.media.length > 0
                                ? item.media
                                : Array.isArray(item.gallery) && item.gallery.length > 0
                                ? item.gallery.map((g: any, i: number) => ({
                                    assetId: g.publicUrl || g.assetId || g.url || g.uri,
                                    displayOrder: i,
                                    isCover: Boolean(g.isCover ?? (i === 0)),
                                }))
                                : item.cover?.publicUrl || item.cover?.assetId || item.imageUrl
                                ? [{
                                    assetId: item.cover?.publicUrl || item.cover?.assetId || item.imageUrl,
                                    displayOrder: 0,
                                    isCover: true,
                                }]
                                : DEFAULT_MOCK_MEDIA[item.id] || [
                                    { assetId: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=1200&q=80', displayOrder: 0, isCover: true },
                                ];

                            list.unshift({
                                id: item.id,
                                title: item.title || 'İlan',
                                publishedAt: item.publishedAt || null,
                                createdAt: item.createdAt || item.updatedAt || item.createdDate || item.submittedAt || null,
                                deletedAt: null,
                                status: item.backendStatus || (item.status === 'pending' ? 'PENDING_REVIEW' : item.status === 'published' ? 'PUBLISHED' : item.status === 'suspended' ? 'SUSPENDED' : item.status === 'rejected' ? 'REJECTED' : item.status === 'archived' ? 'ARCHIVED' : item.status === 'sold' ? 'SOLD' : 'PENDING_REVIEW'),
                                version: item.version || 1,
                                mediaVersion: 1,
                                categoryId: item.categoryId || 'c1000000-0000-4000-8000-000000000011',
                                ownerUserId: item.sellerId || 'u1000000-0000-4000-8000-000000000001',
                                rejectionReason: item.rejectionReason || (item.backendStatus === 'ARCHIVED' ? 'Kullanıcı kendi kaldırmıştır' : null),
                                media: itemMedia,
                                cover: item.cover || null,
                                properties: {
                                    ...(item.properties || {}),
                                    imageUrl: item.imageUrl || item.cover?.publicUrl,
                                },
                            });
                        }
                    }
                }
            }
        } catch { }
    }
    return list;
}

function updateLocalMockAdvert(id: string, patch: Partial<OwnerAdvertItem> & { rejectionReason?: string | null; reason?: string | null }) {
    const targetIdStr = String(id).trim();
    const idx = fallbackMockAdverts.findIndex((m) => String(m.id).trim() === targetIdStr || String((m as any).identifier).trim() === targetIdStr);
    if (idx !== -1) {
        Object.assign(fallbackMockAdverts[idx], patch);
        if (patch.rejectionReason || patch.reason) {
            fallbackMockAdverts[idx].rejectionReason = patch.rejectionReason || patch.reason;
        }
    }
    if (typeof window !== 'undefined') {
        try {
            const raw = localStorage.getItem('haradan.mockMyListings.items');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    const itemIdx = parsed.findIndex((x: any) => String(x.id).trim() === targetIdStr || String(x.identifier).trim() === targetIdStr);
                    if (itemIdx !== -1) {
                        if (patch.status) {
                            parsed[itemIdx].backendStatus = patch.status;
                            parsed[itemIdx].status =
                                patch.status === 'PUBLISHED'
                                    ? 'published'
                                    : patch.status === 'REJECTED'
                                    ? 'rejected'
                                    : (patch.status === 'ARCHIVED' || patch.status === 'SUSPENDED' || patch.status === 'SOLD')
                                    ? 'sold'
                                    : patch.status === 'PENDING_REVIEW'
                                    ? 'pending'
                                    : 'draft';
                        }
                        if (patch.version) parsed[itemIdx].version = patch.version;
                        if (patch.publishedAt) parsed[itemIdx].publishedAt = patch.publishedAt;
                        if (patch.rejectionReason || patch.reason) {
                            parsed[itemIdx].rejectionReason = patch.rejectionReason || patch.reason;
                        }
                        localStorage.setItem('haradan.mockMyListings.items', JSON.stringify(parsed));
                    }
                }
            }
        } catch { }
    }
}

function removeLocalMockAdvert(id: string) {
    const targetIdStr = String(id).trim();
    const idx = fallbackMockAdverts.findIndex((m) => String(m.id).trim() === targetIdStr || String((m as any).identifier).trim() === targetIdStr);
    if (idx !== -1) {
        fallbackMockAdverts.splice(idx, 1);
    }
    if (typeof window !== 'undefined') {
        try {
            const raw = localStorage.getItem('haradan.mockMyListings.items');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    const filtered = parsed.filter((x: any) => String(x.id).trim() !== targetIdStr && String(x.identifier).trim() !== targetIdStr);
                    localStorage.setItem('haradan.mockMyListings.items', JSON.stringify(filtered));
                }
            }
        } catch { }
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

        const needsClientFiltering = params.filter
            ? (params.filter.includes('!=')
               || (params.filter.split(';').filter(Boolean).length > 1)
               || params.filter.includes('mainCategory')
               || params.filter.includes('categoryId'))
            : false;

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
                        status: (status && status !== 'UNPUBLISHED') ? status : undefined,
                    },
                });
                rawItems = response?.items ?? [];
                hasMore = Boolean(response?.hasMore);
                nextCursor = response?.nextCursor ?? null;
                totalCount = response?.totalCount;
            } catch (err) {
                console.error('Moderation API fetch error:', err);
            }

            if (status && status !== 'UNPUBLISHED') {
                if (status === 'SUSPENDED') {
                    rawItems = rawItems.filter((item) => item.status === 'SUSPENDED' || item.status === 'ARCHIVED');
                } else {
                    rawItems = rawItems.filter((item) => item.status === status);
                }
            } else if (status === 'UNPUBLISHED') {
                rawItems = rawItems.filter((item) => item.status === 'PENDING_REVIEW' || item.status === 'REJECTED' || item.status === 'SUSPENDED' || item.status === 'ARCHIVED');
            }

            if (rawItems.length === 0) {
                const localAdverts = getLocalMockAdverts().filter((a) => {
                    if (!status) return true;
                    if (status === 'SUSPENDED') return a.status === 'SUSPENDED' || a.status === 'ARCHIVED';
                    if (status === 'UNPUBLISHED') return a.status === 'PENDING_REVIEW' || a.status === 'REJECTED' || a.status === 'SUSPENDED' || a.status === 'ARCHIVED';
                    return a.status === status;
                });
                rawItems.push(...localAdverts);
            }
            const STATUS_PRIORITY: Record<string, number> = {
                'PENDING_REVIEW': 1,
                'SUSPENDED': 2,
                'ARCHIVED': 2,
                'REJECTED': 3,
            };
            rawItems.sort((a, b) => {
                const priorityA = STATUS_PRIORITY[a.status] ?? 99;
                const priorityB = STATUS_PRIORITY[b.status] ?? 99;
                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }
                const dateA = new Date(a.createdAt || 0).getTime();
                const dateB = new Date(b.createdAt || 0).getTime();
                return dateB - dateA;
            });
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

        const STATUS_PRIORITY: Record<string, number> = {
            'PENDING_REVIEW': 1,
            'SUSPENDED': 2,
            'ARCHIVED': 2,
            'REJECTED': 3,
        };

        const sortParam = params.pageRequest.sort?.[0];
        filtered.sort((a, b) => {
            const priorityA = STATUS_PRIORITY[a.status] ?? 99;
            const priorityB = STATUS_PRIORITY[b.status] ?? 99;
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }

            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            if (sortParam?.direction === 'ASC') {
                return dateA - dateB;
            }
            return dateB - dateA;
        });

        return this.toPagedResponse(filtered, params.pageRequest);
    }

    async getDetail(advertId: string): Promise<ModerationAdvertDetail> {
        try {
            return await apiRequest<ModerationAdvertDetail>('GET', `${moderationRootUrl}/${advertId}`);
        } catch (err) {
            const targetId = advertId?.trim();
            const mock = getLocalMockAdverts().find((m) => {
                if (m.id === targetId || (m as any).identifier === targetId) return true;
                if (targetId === '1001' && m.id === 'adv-001') return true;
                if (targetId === '1002' && m.id === 'adv-002') return true;
                if (targetId === '1003' && m.id === 'adv-003') return true;
                if (targetId === '1004' && m.id === 'adv-suspend-001') return true;
                if (targetId === '1005' && m.id === 'adv-nalbant-001') return true;
                if (targetId === '1006' && m.id === 'adv-abacan-002') return true;
                if (targetId === '1007' && m.id === 'adv-deneme-003') return true;
                if (targetId === '1008' && m.id === 'adv-deneme-ilan-004') return true;
                return false;
            });
            if (mock) {
                const mockReason = (mock as any).rejectionReason || (mock.status === 'REJECTED' ? 'İlan kriterlere uygun bulunmadı.' : undefined);
                const mockPhone = (mock as any).sellerPhone || (mock as any).properties?.sellerPhone || (mock as any).properties?.phone || '0532 123 45 67';
                const mockMedia = (mock.media && mock.media.length > 0)
                    ? mock.media
                    : DEFAULT_MOCK_MEDIA[advertId]
                    || ((mock as any).cover?.publicUrl ? [{ assetId: (mock as any).cover.publicUrl, displayOrder: 0, isCover: true }] : [])
                    || [{ assetId: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=1200&q=80', displayOrder: 0, isCover: true }];
                const mockPrice = (mock as any).price || { amountMinor: 75000000, currency: 'TRY' };
                const mockProvince = (mock as any).provinceName || (mock as any).properties?.sehir || 'İstanbul';
                const mockDistrict = (mock as any).districtName || (mock as any).properties?.ilce || 'Kadıköy';
                const mockLocName = (mock as any).locationName || `${mockProvince} / ${mockDistrict}`;
                const mockProvinceId = (mock as any).provinceId || 'c029c5bf-570e-5eb2-9d0f-0437fa131ff1';
                const mockDistrictId = (mock as any).districtId || 'dist-06-can';

                return {
                    ...mock,
                    price: mockPrice,
                    provinceName: mockProvince,
                    districtName: mockDistrict,
                    locationName: mockLocName,
                    provinceId: mockProvinceId,
                    districtId: mockDistrictId,
                    location: {
                        provinceId: mockProvinceId,
                        provinceName: mockProvince,
                        districtId: mockDistrictId,
                        districtName: mockDistrict,
                        name: mockLocName,
                    },
                    sellerPhone: mockPhone,
                    ownerUserId: mock.ownerUserId || 'u1000000-0000-4000-8000-000000000001',
                    description: `${mock.title} - Detay açıklaması`,
                    media: mockMedia,
                    rejectionReason: mockReason,
                    properties: {
                        sehir: mockProvince,
                        ilce: mockDistrict,
                        fiyat: typeof mockPrice === 'object' && mockPrice.amountMinor ? `${(mockPrice.amountMinor / 100).toLocaleString('tr-TR')} TL` : '750.000 TL',
                        ...(mock.properties || {}),
                        sellerPhone: mockPhone,
                        phone: mockPhone,
                    },
                    statusHistory: [
                        {
                            fromStatus: 'DRAFT',
                            toStatus: mock.status,
                            reason: mock.status === 'REJECTED'
                                ? (mockReason || 'İlan kriterlere uygun bulunmadı.')
                                : mock.status === 'ARCHIVED'
                                ? (mockReason || 'Kullanıcı kendi kaldırmıştır')
                                : mock.status === 'SUSPENDED'
                                ? (mockReason || 'Paket süresi bitmiştir')
                                : 'İlan onaya gönderildi',
                            isSystem: mock.status === 'SUSPENDED' && !mockReason,
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
            updateLocalMockAdvert(advertId, {
                status: 'PUBLISHED',
                version: expectedVersion + 1,
                publishedAt: new Date().toISOString(),
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
            updateLocalMockAdvert(advertId, {
                status: 'REJECTED',
                version: request.expectedVersion + 1,
                rejectionReason: request.reason,
            });
        } catch (err) {
            updateLocalMockAdvert(advertId, {
                status: 'REJECTED',
                version: request.expectedVersion + 1,
                rejectionReason: request.reason,
            });
            return;
        }
    }

    async suspend(advertId: string, request: ModerationReasonRequest) {
        try {
            await apiRequest('POST', `${moderationRootUrl}/${advertId}/suspend`, request);
            updateLocalMockAdvert(advertId, {
                status: 'SUSPENDED',
                version: request.expectedVersion + 1,
                reason: request.reason,
            });
        } catch (err) {
            updateLocalMockAdvert(advertId, {
                status: 'SUSPENDED',
                version: request.expectedVersion + 1,
                reason: request.reason,
            });
            return;
        }
    }

    async requestChanges(advertId: string, request: ModerationReasonRequest) {
        try {
            await apiRequest('POST', `${moderationRootUrl}/${advertId}/request-changes`, request);
            updateLocalMockAdvert(advertId, {
                status: 'CHANGES_REQUESTED',
                version: request.expectedVersion + 1,
                reason: request.reason,
            });
        } catch (err) {
            updateLocalMockAdvert(advertId, {
                status: 'CHANGES_REQUESTED',
                version: request.expectedVersion + 1,
                reason: request.reason,
            });
            return;
        }
    }

    async delete(advertId: string | number): Promise<void> {
        const idStr = String(advertId).trim();
        await apiRequest('DELETE', `${moderationRootUrl}/${idStr}`);
        removeLocalMockAdvert(idStr);
    }

    async getPackage(advertId: string): Promise<AdvertPackageAssignment | null> {
        try {
            return await apiRequest<AdvertPackageAssignment>('GET', `${moderationRootUrl}/${advertId}/package`);
        } catch {
            return null;
        }
    }

    async assignPackage(advertId: string, request: AssignPackageRequest): Promise<AdvertPackageAssignment> {
        return await apiRequest<AdvertPackageAssignment>('PUT', `${moderationRootUrl}/${advertId}/package`, request);
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
                    break;
                }
                cursor = response.nextCursor;
            } catch (err) {
                break;
            }
        }
        return items;
    }

    async getPayments(advertId: string): Promise<AdminAdvertPaymentResponse[]> {
        const response = await apiRequest<{ payments: AdminAdvertPaymentResponse[] }>(
            'GET',
            `${moderationRootUrl}/${advertId}/payments`
        );
        return response?.payments || [];
    }


    async getUrgent(advertId: string): Promise<{ advertId: string; isUrgent: boolean }> {
        return apiRequest('GET', `${publicAdvertUrl}/${advertId}/urgent`);
    }

    async activateUrgent(advertId: string) {
        return apiRequest<AdvertUrgentActivation>('PUT', `${publicAdvertUrl}/${advertId}/urgent`);
    }

    async deactivateUrgent(advertId: string) {
        await apiRequest('DELETE', `${publicAdvertUrl}/${advertId}/urgent`);
    }

    private async fetchBySingleStatus(status?: string): Promise<OwnerAdvertItem[]> {
        const items: OwnerAdvertItem[] = [];
        let cursor: string | undefined;
        let hasMore = true;

        while (hasMore) {
            try {
                const response = await apiRequest<ModerationQueueResponse>('GET', baseUrl, undefined, {
                    params: {
                        cursor,
                        limit: 100,
                        status: (status && status !== 'UNPUBLISHED') ? status : undefined,
                    },
                });
                const rawItems = response?.items ?? [];
                items.push(...rawItems);
                hasMore = Boolean(response?.hasMore);
                cursor = response?.nextCursor;
            } catch (err) {
                console.error('Moderation API fetch error:', err);
                hasMore = false;
            }
        }

        let filteredBackendItems = items;
        if (status && status !== 'UNPUBLISHED') {
            if (status === 'SUSPENDED') {
                filteredBackendItems = items.filter((item) => item.status === 'SUSPENDED' || item.status === 'ARCHIVED');
            } else {
                filteredBackendItems = items.filter((item) => item.status === status);
            }
        } else if (status === 'UNPUBLISHED') {
            filteredBackendItems = items.filter((item) => item.status === 'PENDING_REVIEW' || item.status === 'REJECTED' || item.status === 'SUSPENDED' || item.status === 'ARCHIVED');
        }

        if (filteredBackendItems.length === 0) {
            const localAdverts = getLocalMockAdverts().filter((a) => {
                if (!status) return true;
                if (status === 'SUSPENDED') return a.status === 'SUSPENDED' || a.status === 'ARCHIVED';
                if (status === 'UNPUBLISHED') return a.status === 'PENDING_REVIEW' || a.status === 'REJECTED' || a.status === 'SUSPENDED' || a.status === 'ARCHIVED';
                return a.status === status;
            });
            filteredBackendItems.push(...localAdverts);
        }

        return filteredBackendItems;
    }

    private async fetchAll(status?: string): Promise<ModerationAdvertResponse[]> {
        if (status === 'UNPUBLISHED') {
            const unpublishedStatuses = ['PENDING_REVIEW', 'SUSPENDED', 'ARCHIVED', 'REJECTED'];
            const results = await Promise.all(
                unpublishedStatuses.map((st) => this.fetchBySingleStatus(st))
            );
            const seen = new Set<string>();
            const merged: OwnerAdvertItem[] = [];
            for (const list of results) {
                for (const item of list) {
                    const id = item.id || (item as any).identifier;
                    if (id && !seen.has(id)) {
                        seen.add(id);
                        merged.push(item);
                    }
                }
            }
            return merged.map(toModerationAdvert);
        }

        if (status === 'SUSPENDED') {
            const suspendedStatuses = ['SUSPENDED', 'ARCHIVED'];
            const results = await Promise.all(
                suspendedStatuses.map((st) => this.fetchBySingleStatus(st))
            );
            const seen = new Set<string>();
            const merged: OwnerAdvertItem[] = [];
            for (const list of results) {
                for (const item of list) {
                    const id = item.id || (item as any).identifier;
                    if (id && !seen.has(id)) {
                        seen.add(id);
                        merged.push(item);
                    }
                }
            }
            return merged.map(toModerationAdvert);
        }

        const items = await this.fetchBySingleStatus(status);
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
            if (clause.startsWith('status==')) {
                const statusVal = clause.slice('status=='.length).trim();
                if (statusVal === 'UNPUBLISHED') {
                    return item.status === 'PENDING_REVIEW' || item.status === 'REJECTED' || item.status === 'SUSPENDED' || item.status === 'ARCHIVED';
                }
                if (statusVal === 'SUSPENDED') {
                    return item.status === 'SUSPENDED' || item.status === 'ARCHIVED';
                }
                return item.status === statusVal;
            }
            if (clause.startsWith('mainCategory==')) {
                const expected = clause.slice('mainCategory=='.length).trim().toLowerCase();
                const actual = getAdvertMainCategory(item.categoryId, undefined, (item as any).properties);
                return actual === expected;
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
            case 'mainCategory':
                return getAdvertMainCategory(item.categoryId, undefined, (item as any).properties);
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
