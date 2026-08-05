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