import { ENTITY_STATUS_TEXTS, PROPERTY_TYPE_TEXTS } from "@/contants/variables";
import { EntityStatusEnum, PropertyTypeEnum } from '@/models/enums';

export function getEnumText(textArray: { key: any, value: any }[], searchType: any) {
    return textArray.find(text => text?.key === searchType)?.value;
}

export function getEntityStatusEnumText(searchType: EntityStatusEnum) {
    return getEnumText(ENTITY_STATUS_TEXTS, searchType)
}

export function getPropertyTypeEnumText(searchType: PropertyTypeEnum) {
    return getEnumText(PROPERTY_TYPE_TEXTS, searchType)
}

export function getUserRoleText(searchType?: string) {
    if (searchType === 'admin') return 'Yönetici';
    if (searchType === 'user') return 'Kullanıcı';
    return searchType ? 'Tanımsız rol' : '-';
}

export function getPropertyDataTypeText(searchType?: string) {
    if (searchType === 'STRING') return 'Kısa Metin';
    if (searchType === 'TEXT') return 'Uzun Metin';
    if (searchType === 'INTEGER') return 'Sayı';
    if (searchType === 'DECIMAL') return 'Ondalık Sayı';
    if (searchType === 'BOOLEAN') return 'Evet / Hayır';
    if (searchType === 'SINGLE_SELECT') return 'Tek Seçim';
    if (searchType === 'YEAR') return 'Yıl';
    return searchType ? 'Desteklenmeyen alan türü' : '-';
}

export function getUserStatusText(searchType?: string) {
    if (searchType === 'ACTIVE') return 'Aktif';
    if (searchType === 'CLOSED') return 'Kapalı';
    if (searchType === 'DISABLED') return 'Pasif';
    return searchType ? 'Tanımsız durum' : '-';
}

export function getBannerPlacementText(searchType?: string) {
    if (searchType === 'HOMEPAGE') return 'Ana Sayfa';
    if (searchType === 'LISTING_DETAIL') return 'İlan Detay';
    if (searchType === 'SEARCH') return 'Arama';
    return searchType ? 'Bilinmeyen yerleşim' : '-';
}

export function getBannerStatusText(searchType?: string) {
    if (searchType === 'ACTIVE') return 'Aktif';
    if (searchType === 'INACTIVE') return 'Pasif';
    return searchType ? 'Tanımsız durum' : '-';
}

export function getMediaLifecycleText(searchType?: string) {
    if (searchType === 'UPLOAD_PENDING') return 'Yükleme Bekliyor';
    if (searchType === 'UPLOADED') return 'Yüklendi';
    if (searchType === 'VALIDATING') return 'Doğrulanıyor';
    if (searchType === 'MASTER_READY') return 'Hazır';
    if (searchType === 'VALIDATION_FAILED') return 'Doğrulama Başarısız';
    if (searchType === 'CLEANUP_CANDIDATE') return 'Temizlik Adayı';
    if (searchType === 'DELETING') return 'Siliniyor';
    if (searchType === 'PHYSICALLY_DELETED') return 'Silindi';
    return searchType ? 'Durum bilgisi yok' : '-';
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
    return searchType ? 'Diğer kampanya etkinliği' : '-';
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
    return searchType ? 'Diğer görev' : '-';
}

/** Prefer API display name; fall back to Turkish labels for known English seeds. */
export function getJobDisplayName(key?: string, name?: string | null) {
    const known: Record<string, string> = {
        TJK_SYNC: 'TJK at özeti senkronu',
        PACKAGE_EXPIRY_SCAN: 'Paket bitiş hatırlatma taraması',
        MEDIA_RECONCILE: 'Medya depolama eşitleme',
    };
    if (key && known[key]) {
        return known[key];
    }
    return name ? 'Diğer zamanlanmış görev' : '-';
}

/** Short human hint for common 6-field cron expressions used by the worker. */
export function getCronHint(expression?: string) {
    if (!expression) {
        return 'Zamanlama henüz ayarlanmamış.';
    }
    const parts = expression.trim().split(/\s+/);
    if (parts.length === 6 && parts[0] === '0' && parts[3] === '*' && parts[4] === '*') {
        const minute = parts[1];
        const hour = parts[2];
        const dow = parts[5];
        const time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
        const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        if (dow === '*') {
            return `Her gün ${time}`;
        }
        if (/^\d+(,\d+)*$/.test(dow)) {
            const days = dow.split(',').map((d) => Number(d.trim())).filter((d) => d >= 0 && d <= 6);
            if (days.length > 0 && days.length === dow.split(',').length) {
                const labels = days.map((d) => dayNames[d]).join(', ');
                return `${labels} ${time}`;
            }
        }
    }
    return 'Özel zamanlama';
}

export function getJobRunStatusText(searchType?: string) {
    if (searchType === 'QUEUED') return 'Bekliyor';
    if (searchType === 'LEASED') return 'Çalışıyor';
    if (searchType === 'SUCCEEDED') return 'Başarılı';
    if (searchType === 'FAILED') return 'Başarısız';
    if (searchType === 'CANCELLED') return 'İptal';
    if (searchType === 'DEAD') return 'Kalıcı Başarısız';
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
    if (searchType === 'QUEUED') return 'Bekliyor';
    if (searchType === 'RUNNING') return 'Çalışıyor';
    if (searchType === 'SUCCEEDED') return 'Başarılı';
    if (searchType === 'FAILED') return 'Başarısız';
    if (searchType === 'PARTIAL_SUCCESS') return 'Kısmi Başarı';
    if (searchType === 'CANCELLED') return 'İptal';
    return searchType ?? '-';
}

export function getTjkModeText(searchType?: string) {
    if (searchType === 'FULL') return 'Tam Senkronizasyon';
    if (searchType === 'INCREMENTAL') return 'Artımlı Senkronizasyon';
    if (searchType === 'RECONCILIATION') return 'Kayıtları Yeniden Eşleştirme';
    return searchType ?? '-';
}

export function getTjkTriggerKindText(searchType?: string) {
    if (searchType === 'MANUAL') return 'Manuel';
    if (searchType === 'SCHEDULED') return 'Otomatik';
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
    if (searchType === 'QUEUED') return 'Bekliyor';
    if (searchType === 'LEASED') return 'Çalışıyor';
    if (searchType === 'SUCCEEDED') return 'Başarılı';
    if (searchType === 'FAILED') return 'Başarısız';
    if (searchType === 'CANCELLED') return 'İptal';
    if (searchType === 'DEAD') return 'Kalıcı Başarısız';
    if (searchType === 'RUNNING') return 'Çalışıyor';
    if (searchType === 'PARTIAL_SUCCESS') return 'Kısmi Başarı';
    return getAdvertStatusText(searchType);
}

export function getTjkScopeText(searchType?: string) {
    if (searchType === 'HORSES') return 'Atlar';
    return searchType ?? '-';
}
