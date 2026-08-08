import { ENTITY_STATUS_TEXTS, PROPERTY_TYPE_TEXTS, YES_NO_TEXTS } from "@/contants/variables";

export enum OptionTypes {
    ENTITY_STATUS_OPTION,
    PROPERTY_TYPE_OPTION,
    YES_NO_OPTION,
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

    let enumTexts: { key: string | boolean; value: string }[] = [];

    if (enumType === OptionTypes.ENTITY_STATUS_OPTION) {
        enumTexts = ENTITY_STATUS_TEXTS;
    } else if (enumType === OptionTypes.PROPERTY_TYPE_OPTION) {
        enumTexts = PROPERTY_TYPE_TEXTS;
    } else if (enumType === OptionTypes.YES_NO_OPTION) {
        enumTexts = YES_NO_TEXTS;
    }

    return (
        <>
            <option key={0} value={defaultValue}>{defaultText}</option>
            {enumTexts.map((enumText) => {
                return <option key={String(enumText.key)} value={String(enumText.key)}>{enumText.value}</option>
            })}
        </>

    );
}

export default PrepareOption;
