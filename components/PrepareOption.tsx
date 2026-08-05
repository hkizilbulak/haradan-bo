import { ARTICLE_TYPE_TEXTS, BANNER_TYPE_TEXTS, CACHE_EVICT_TYPE_TEXTS, CHANNEL_TYPE_TEXTS, ENTITY_STATUS_TEXTS, PROPERTY_TYPE_TEXTS, YES_NO_TEXTS } from "@/contants/variables";


export enum OptionTypes {
    BANNER_TYPE_OPTION,
    ENTITY_STATUS_OPTION,
    CACHE_EVICT_TYPE_OPTION,
    PROPERTY_TYPE_OPTION,
    YES_NO_OPTION,
    ARTICLE_TYPE_OPTION,
    CHANNEL_TYPE_OPTION
}

type IProps = {
    enumType: OptionTypes;
    defaultText?: string;
    defaultValue?: string
}

const PrepareOption = ({
    enumType,
    defaultText = 'Seçiniz',
    defaultValue = ''
}: IProps) => {

    let enumTexts: { key: any, value: any }[] = [];

    if (enumType === OptionTypes.BANNER_TYPE_OPTION) {
        enumTexts = BANNER_TYPE_TEXTS;
    } else if (enumType === OptionTypes.ENTITY_STATUS_OPTION) {
        enumTexts = ENTITY_STATUS_TEXTS;
    } else if (enumType === OptionTypes.CACHE_EVICT_TYPE_OPTION) {
        enumTexts = CACHE_EVICT_TYPE_TEXTS;
    } else if (enumType === OptionTypes.PROPERTY_TYPE_OPTION) {
        enumTexts = PROPERTY_TYPE_TEXTS;
    } else if (enumType === OptionTypes.YES_NO_OPTION) {
        enumTexts = YES_NO_TEXTS;
    } else if (enumType === OptionTypes.ARTICLE_TYPE_OPTION) {
        enumTexts = ARTICLE_TYPE_TEXTS;
    } else if (enumType === OptionTypes.CHANNEL_TYPE_OPTION) {
        enumTexts = CHANNEL_TYPE_TEXTS;
    }


    return (
        <>
            <option key={0} value={defaultValue}>{defaultText}</option>
            {enumTexts.map((enumText) => {
                return <option key={enumText.key} value={enumText.key}>{enumText.value}</option>
            })}
        </>

    );
}

export default PrepareOption;