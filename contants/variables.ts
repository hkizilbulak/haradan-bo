import { EntityStatusEnum, PropertyTypeEnum } from '@/models/enums';

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
