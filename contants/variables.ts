import { ArticleTypeEnum, BannerTypeEnum, ChannelTypeEnum, EntityStatusEnum, PropertyTypeEnum } from '@/models/enums';

export const ENTITY_STATUS_TEXTS = [
    { key: EntityStatusEnum.DEFAULT, value: 'Varsayılan' },
    { key: EntityStatusEnum.ACTIVE, value: 'Aktif' },
    { key: EntityStatusEnum.PASSIVE, value: 'Pasif' },
    { key: EntityStatusEnum.DELETED, value: 'Silinmiş' },
    { key: EntityStatusEnum.NOT_COMPLETED, value: 'Tamamlanmamış' },
    { key: EntityStatusEnum.SOLD, value: 'Satıldı' },
    { key: EntityStatusEnum.WAITING_APPROVAL, value: 'Onay Bekliyor' },
    { key: EntityStatusEnum.REJECTED, value: 'Reddedildi' },
]

export const BANNER_TYPE_TEXTS = [
    { key: BannerTypeEnum.CORPORATE_ADVERT, value: 'Eküri İlanı' },
    { key: BannerTypeEnum.SLIDER, value: 'Slider' },
]

export const CACHE_EVICT_TYPE_TEXTS = [
    { key: 'all', value: 'All' },
    { key: 'cacheValue', value: 'Cache Values' },
    { key: 'singleCacheValue', value: 'Single Cache Value' },
]

export const PROPERTY_TYPE_TEXTS = [
    { key: PropertyTypeEnum.TEXT, value: 'TEXT' },
    { key: PropertyTypeEnum.NUMBER, value: 'NUMBER' },
    { key: PropertyTypeEnum.CHECKBOX, value: 'CHECKBOX' },
    { key: PropertyTypeEnum.DATE, value: 'DATE' },
    { key: PropertyTypeEnum.SELECT, value: 'SELECT' },
    { key: PropertyTypeEnum.RADIO, value: 'RADIO' },
    { key: PropertyTypeEnum.YESNO, value: 'YESNO' },

]

export const YES_NO_TEXTS = [
    { key: 'true', value: 'Evet' },
    { key: 'false', value: 'Hayır' },
]

export const ARTICLE_TYPE_TEXTS = [
    { key: ArticleTypeEnum.JOB_ADVERTISEMENT, value: 'İş İlanı' },
    { key: ArticleTypeEnum.GENERAL, value: 'Genel' },
    { key: ArticleTypeEnum.HORSE_SERVICE, value: 'Atçılık Hizmeti' },
    { key: ArticleTypeEnum.RACING, value: 'Yarışçılık' },
    { key: ArticleTypeEnum.CORPORATE_ADVERT, value: 'Eküri İlanı' },
    { key: ArticleTypeEnum.STALLION_INTRODUCE, value: 'Aygır Tanıtım' },

]

export const CHANNEL_TYPE_TEXTS = [
    { key: ChannelTypeEnum.FORM, value: 'Üyelik Formu' },
    { key: ChannelTypeEnum.FACEBOOK, value: 'Facebook' },
    { key: ChannelTypeEnum.GOOGLE, value: 'Google' },
    { key: ChannelTypeEnum.ADMIN_FORM, value: 'Yönetici Formu' },

]