import { ARTICLE_TYPE_TEXTS, BANNER_TYPE_TEXTS, CHANNEL_TYPE_TEXTS, ENTITY_STATUS_TEXTS, PROPERTY_TYPE_TEXTS } from "@/contants/variables";
import { ArticleTypeEnum, BannerTypeEnum, ChannelTypeEnum, EntityStatusEnum, PropertyTypeEnum } from '@/models/enums';

export function getEnumText(textArray: { key: any, value: any }[], searchType: any) {
    return textArray.find(text => text?.key === searchType)?.value;
}

export function getEntityStatusEnumText(searchType: EntityStatusEnum) {
    return getEnumText(ENTITY_STATUS_TEXTS, searchType)
}

export function getBannerTypeEnumText(searchType: BannerTypeEnum) {
    return getEnumText(BANNER_TYPE_TEXTS, searchType)
}

export function getPropertyTypeEnumText(searchType: PropertyTypeEnum) {
    return getEnumText(PROPERTY_TYPE_TEXTS, searchType)
}

export function getArticleTypeEnumText(searchType: ArticleTypeEnum) {
    return getEnumText(ARTICLE_TYPE_TEXTS, searchType)
}

export function getChannelTypeEnumText(searchType: ChannelTypeEnum) {
    return getEnumText(CHANNEL_TYPE_TEXTS, searchType)
}

export function getUserRoleText(searchType?: string) {
    if (searchType === 'admin') return 'Yönetici';
    if (searchType === 'user') return 'Kullanıcı';
    return searchType ?? '-';
}

export function getUserStatusText(searchType?: string) {
    if (searchType === 'ACTIVE') return 'Aktif';
    if (searchType === 'CLOSED') return 'Kapalı';
    if (searchType === 'DISABLED') return 'Pasif';
    return searchType ?? '-';
}

export function getBannerPlacementText(searchType?: string) {
    if (searchType === 'HOMEPAGE') return 'Ana Sayfa';
    if (searchType === 'LISTING_DETAIL') return 'İlan Detay';
    if (searchType === 'SEARCH') return 'Arama';
    return searchType ?? '-';
}

export function getBannerStatusText(searchType?: string) {
    if (searchType === 'ACTIVE') return 'Aktif';
    if (searchType === 'INACTIVE') return 'Pasif';
    return searchType ?? '-';
}

export function getAdvertStatusText(searchType?: string) {
    if (searchType === 'DRAFT') return 'Taslak';
    if (searchType === 'PENDING_REVIEW') return 'İnceleme Bekliyor';
    if (searchType === 'CHANGES_REQUESTED') return 'Düzeltme İstendi';
    if (searchType === 'PUBLISHED') return 'Yayında';
    if (searchType === 'REJECTED') return 'Reddedildi';
    if (searchType === 'SUSPENDED') return 'Askıya Alındı';
    if (searchType === 'SOLD') return 'Satıldı';
    if (searchType === 'ARCHIVED') return 'Arşivlendi';
    return searchType ?? '-';
}

export function getCampaignEventTypeText(searchType?: string) {
    if (searchType === 'PACKAGE_EXPIRY_1_DAY') return 'Paket Bitiş 1 Gün';
    if (searchType === 'PACKAGE_EXPIRY_5_DAYS') return 'Paket Bitiş 5 Gün';
    if (searchType === 'PACKAGE_RENEWAL') return 'Paket Yenileme';
    if (searchType === 'PACKAGE_UPGRADE') return 'Paket Yükseltme';
    return searchType ?? '-';
}

export function getNotificationEventTypeText(searchType?: string) {
    if (searchType === 'PACKAGE_ADVERT_PUBLISHED') return 'Paket İlan Yayını';
    if (searchType === 'PACKAGE_EXPIRY_1_DAY') return 'Paket Bitiş 1 Gün';
    if (searchType === 'PACKAGE_EXPIRY_5_DAYS') return 'Paket Bitiş 5 Gün';
    if (searchType === 'URGENT_ADVERT_ACTIVATED') return 'Acil İlan Aktif';
    return searchType ?? '-';
}

export function getJobTypeText(searchType?: string) {
    if (searchType === 'MEDIA_RECONCILE') return 'Medya Eşitleme';
    if (searchType === 'PACKAGE_EXPIRY_SCAN') return 'Paket Sonlanma Tarama';
    if (searchType === 'TJK_SYNC') return 'TJK Senkron';
    return searchType ?? '-';
}

export function getJobRunStatusText(searchType?: string) {
    if (searchType === 'QUEUED') return 'Kuyrukta';
    if (searchType === 'LEASED') return 'İşleniyor';
    if (searchType === 'SUCCEEDED') return 'Başarılı';
    if (searchType === 'FAILED') return 'Başarısız';
    if (searchType === 'CANCELLED') return 'İptal';
    if (searchType === 'DEAD') return 'Ölü';
    return searchType ?? '-';
}

export function getPackageAssignmentStatusText(searchType?: string) {
    if (searchType === 'ACTIVE') return 'Aktif';
    if (searchType === 'CANCELLED') return 'İptal';
    if (searchType === 'EXPIRED') return 'Süresi Doldu';
    if (searchType === 'SUPERSEDED') return 'Güncellendi';
    return searchType ?? '-';
}

export function getPackageAssignmentSourceText(searchType?: string) {
    if (searchType === 'ADMIN') return 'Yönetici';
    if (searchType === 'SYSTEM') return 'Sistem';
    return searchType ?? '-';
}

export function getTjkRunStatusText(searchType?: string) {
    if (searchType === 'QUEUED') return 'Kuyrukta';
    if (searchType === 'RUNNING') return 'Çalışıyor';
    if (searchType === 'SUCCEEDED') return 'Başarılı';
    if (searchType === 'FAILED') return 'Başarısız';
    if (searchType === 'PARTIAL_SUCCESS') return 'Kısmi Başarı';
    if (searchType === 'CANCELLED') return 'İptal';
    return searchType ?? '-';
}

export function getTjkModeText(searchType?: string) {
    if (searchType === 'FULL') return 'Tam';
    if (searchType === 'INCREMENTAL') return 'Artımlı';
    if (searchType === 'RECONCILIATION') return 'Mutabakat';
    return searchType ?? '-';
}

export function getTjkTriggerKindText(searchType?: string) {
    if (searchType === 'MANUAL') return 'Manuel';
    if (searchType === 'SCHEDULED') return 'Zamanlanmış';
    return searchType ?? '-';
}

export function getGenericStatusText(searchType?: string) {
    if (searchType === 'ACTIVE') return 'Aktif';
    if (searchType === 'INACTIVE') return 'Pasif';
    if (searchType === 'PASSIVE') return 'Pasif';
    if (searchType === 'DISABLED') return 'Pasif';
    if (searchType === 'CLOSED') return 'Kapalı';
    if (searchType === 'DELETED') return 'Silindi';
    if (searchType === 'WAITING_APPROVAL') return 'Onay Bekliyor';
    if (searchType === 'NOT_COMPLETED') return 'Tamamlanmadı';
    if (searchType === 'DEFAULT') return 'Varsayılan';
    if (searchType === 'QUEUED') return 'Kuyrukta';
    if (searchType === 'LEASED') return 'İşleniyor';
    if (searchType === 'SUCCEEDED') return 'Başarılı';
    if (searchType === 'FAILED') return 'Başarısız';
    if (searchType === 'CANCELLED') return 'İptal';
    if (searchType === 'DEAD') return 'Ölü';
    if (searchType === 'RUNNING') return 'Çalışıyor';
    if (searchType === 'PARTIAL_SUCCESS') return 'Kısmi Başarı';
    return getAdvertStatusText(searchType);
}

export function getTjkScopeText(searchType?: string) {
    if (searchType === 'HORSES') return 'Atlar';
    return searchType ?? '-';
}